import { useHeaderHeight } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PLACEHOLDER_THUMBNAIL, ThumbnailImage } from '@/components/thumbnail-image';
import { CatalogSearchPanel } from '@/components/tracker/CatalogSearchPanel';
import { ComposerActionBar } from '@/components/tracker/composer-action-bar';
import { FilterSortControlRow } from '@/components/tracker/filter-sort-control-row';
import { LinkImportPanel } from '@/components/tracker/LinkImportPanel';
import { ListConfigurationEditor } from '@/components/tracker/ListConfigurationEditor';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import type { EntryDraft } from '@/contexts/lists-context';
import { useEntryActions, useListActions, useListPreferences, useListsQuery } from '@/contexts/lists-context';
import type { ListEntry, ListFilterMode, ListPreset, ListSortMode, ListViewMode } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { sortEntries } from '@/lib/tracker-selectors';

const TIER_COLORS = ['#2A1B60', '#3A227A', '#4E2899', '#5F34B0', '#1A5E85', '#139EC1', '#68C7DB'];
const COMPOSER_TOOLBAR_HEIGHT = 76;
const COMPOSER_TOOLBAR_OFFSET = 20;
const BOTTOM_TOOLBAR_HEIGHT = 56;
const BOTTOM_TOOLBAR_MARGIN = 16;
const MAX_VISIBLE_ENTRY_TAGS = 3;
const ENTRY_LIST_TOP_PADDING = 6;
const ENTRY_ROW_GAP = 6;
const DROP_INDICATOR_COLOR = '#2563EB';
const DROP_INDICATOR_HEIGHT = 3;
const AUTO_SCROLL_EDGE_THRESHOLD = 96;
const AUTO_SCROLL_MAX_STEP = 18;
const DRAG_LIFT_DURATION_MS = 5;
const DRAG_RELEASE_DURATION_MS = 5;
const DRAG_SWIPE_FAIL_OFFSET_X = 24;

type RowLayout = {
  height: number;
  width: number;
};

type EntryDragState = {
  entry: ListEntry;
  entryId: string;
  originalIndex: number;
  targetIndex: number;
  rowWidth: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyOrderedIds<T extends { id: string }>(items: T[], orderedIds: string[] | null): T[] {
  if (!orderedIds?.length) {
    return items;
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const orderedItems = orderedIds.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);

  if (orderedItems.length === items.length) {
    return orderedItems;
  }

  return [...orderedItems, ...items.filter((item) => !orderedIds.includes(item.id))];
}

function moveItemIdToIndex(ids: string[], draggedId: string, targetIndex: number): string[] {
  const nextIds = ids.filter((id) => id !== draggedId);
  const boundedIndex = Math.max(0, Math.min(targetIndex, nextIds.length));
  nextIds.splice(boundedIndex, 0, draggedId);
  return nextIds;
}

function getHoverTargetIndex(
  items: ListEntry[],
  draggedId: string,
  hoverMiddleY: number,
  rowLayouts: Record<string, RowLayout>
): number {
  const otherItems = items.filter((item) => item.id !== draggedId);
  let cursor = 0;

  for (const [index, item] of otherItems.entries()) {
    const layout = rowLayouts[item.id];
    if (!layout) {
      continue;
    }

    if (hoverMiddleY < cursor + layout.height / 2) {
      return index;
    }

    cursor += layout.height + ENTRY_ROW_GAP;
  }

  return otherItems.length;
}

function getDropIndicatorTop(
  items: ListEntry[],
  draggedId: string,
  targetIndex: number,
  rowLayouts: Record<string, RowLayout>
): number | null {
  const otherItems = items.filter((item) => item.id !== draggedId);
  if (!otherItems.length) {
    return null;
  }

  if (targetIndex <= 0) {
    return 0;
  }

  let cursor = 0;

  for (const [index, item] of otherItems.entries()) {
    const layout = rowLayouts[item.id];
    if (!layout) {
      continue;
    }

    const rowBottom = cursor + layout.height;
    if (targetIndex === index + 1) {
      return rowBottom + (index < otherItems.length - 1 ? ENTRY_ROW_GAP / 2 : 0);
    }

    cursor = rowBottom + (index < otherItems.length - 1 ? ENTRY_ROW_GAP : 0);
  }

  if (targetIndex >= otherItems.length) {
    return cursor;
  }

  return cursor;
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isIos = process.env.EXPO_OS === 'ios';
  const supportsLiquidGlass = isIos && isGlassEffectAPIAvailable();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const listRef = useRef<FlatList<ListEntry>>(null);
  const listViewportRef = useRef<View | null>(null);
  const listViewportWidthRef = useRef(0);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const visibleEntriesRef = useRef<ListEntry[]>([]);
  const dragStateRef = useRef<EntryDragState | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollVelocityRef = useRef(0);
  const lastDragTargetIndexRef = useRef<number | null>(null);
  const rowLayoutsRef = useRef<Record<string, RowLayout>>({});
  const dragMetaRef = useRef<{
    initialLeft: number;
    initialTop: number;
    touchOffsetY: number;
    rowHeight: number;
    rowWidth: number;
    maxLeft: number;
  } | null>(null);
  const dragPositionRef = useRef({ left: 0, top: 0 });
  const composerInputRef = useRef<TextInput>(null);
  const listSearchInputRef = useRef<TextInput>(null);
  const dragLeft = useSharedValue(0);
  const dragTop = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const scrollOffsetValue = useSharedValue(0);
  const composerAccessoryId = useMemo(
    () => `list-entry-composer-action-bar-${String(id ?? 'unknown').replace(/[^A-Za-z0-9_-]/g, '-')}`,
    [id]
  );
  const { activeLists, itemUserDataByKey } = useListsQuery();
  const {
    createList,
    convertSublistToTag,
    convertTagToSublist,
    markListOpened,
    saveListAsTemplate,
    updateList,
  } = useListActions();
  const { addEntryToList, deleteEntryFromList, reorderEntries, setEntryChecked } = useEntryActions();
  const latestMarkListOpenedRef = useRef(markListOpened);
  const lastOpenedListIdRef = useRef<string | null>(null);
  const list = activeLists.find((item) => item.id === id) ?? null;
  const { preferences, setListPreferences } = useListPreferences(id ?? '');
  const [menuVisible, setMenuVisible] =
    useState<null | 'view' | 'sort' | 'filter' | 'tag-to-sublist'>(null);
  const [newSublistVisible, setNewSublistVisible] = useState(false);
  const [sublistTitle, setSublistTitle] = useState('');
  const [sublistPreset, setSublistPreset] = useState<ListPreset>('blank');
  const [configVisible, setConfigVisible] = useState(false);
  const [templateVisible, setTemplateVisible] = useState(false);
  const [draftConfig, setDraftConfig] = useState(list?.config);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [pendingTagsText, setPendingTagsText] = useState('');
  const [listSearchVisible, setListSearchVisible] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [tagSheetVisible, setTagSheetVisible] = useState(false);
  const [urlImportVisible, setUrlImportVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerAccessoryVisible, setComposerAccessoryVisible] = useState(false);
  const [composerInputMounted, setComposerInputMounted] = useState(false);
  const [composerFocusPending, setComposerFocusPending] = useState(false);
  const [dragState, setDragState] = useState<EntryDragState | null>(null);
  const [optimisticEntryOrderIds, setOptimisticEntryOrderIds] = useState<string[] | null>(null);

  const scrollComposerIntoView = useCallback((animated = true) => {
    if (preferences.viewMode !== 'list') {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, [preferences.viewMode]);

  const setComposerInputNode = useCallback((node: TextInput | null) => {
    composerInputRef.current = node;
    setComposerInputMounted(!!node);
  }, []);

  const handleComposerFooterLayout = useCallback(() => {
    if (!composerVisible) {
      return;
    }

    scrollComposerIntoView(false);
  }, [composerVisible, scrollComposerIntoView]);

  const handleComposerInputFocus = useCallback(() => {
    scrollComposerIntoView();
  }, [scrollComposerIntoView]);

  const collapseComposer = useCallback(() => {
    setComposerVisible(false);
    setComposerFocusPending(false);
    setComposerText('');
    setPendingTagsText('');
  }, []);

  useEffect(() => {
    latestMarkListOpenedRef.current = markListOpened;
  }, [markListOpened]);

  useEffect(() => {
    if (!list?.id || lastOpenedListIdRef.current === list.id) {
      return;
    }

    lastOpenedListIdRef.current = list.id;
    void latestMarkListOpenedRef.current(list.id);
  }, [list?.id]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      if (
        process.env.EXPO_OS !== 'ios' &&
        !listSearchVisible &&
        !searchVisible &&
        !tagSheetVisible
      ) {
        collapseComposer();
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [collapseComposer, listSearchVisible, searchVisible, tagSheetVisible]);

  const openComposer = useCallback(() => {
    if (preferences.viewMode !== 'list') {
      setListPreferences({ viewMode: 'list' });
    }
    setComposerVisible(true);
    setComposerFocusPending(true);
  }, [preferences.viewMode, setListPreferences]);

  const closeListSearch = useCallback(() => {
    setListSearchQuery('');
    requestAnimationFrame(() => {
      listSearchInputRef.current?.blur();
      Keyboard.dismiss();
      setListSearchVisible(false);
    });
  }, []);

  const toggleListSearch = useCallback(() => {
    if (listSearchVisible) {
      closeListSearch();
      return;
    }

    Keyboard.dismiss();
    setListSearchVisible(true);
  }, [closeListSearch, listSearchVisible]);

  const goHome = useCallback(() => {
    Keyboard.dismiss();
    if (router.canDismiss()) {
      router.dismissTo('/');
      return;
    }

    router.replace('/');
  }, [router]);

  const orderedEntries = useMemo(
    () => applyOrderedIds(list?.entries ?? [], optimisticEntryOrderIds),
    [list?.entries, optimisticEntryOrderIds]
  );

  const visibleEntries = useMemo(() => {
    if (!list) {
      return [];
    }
    return filterEntriesByQuery(
      sortEntries(orderedEntries, preferences, itemUserDataByKey),
      listSearchQuery
    );
  }, [itemUserDataByKey, list, listSearchQuery, orderedEntries, preferences]);

  const canDragEntries =
    preferences.viewMode === 'list' &&
    preferences.sortMode === 'manual' &&
    preferences.filterMode === 'all' &&
    !listSearchQuery.trim();
  const bottomToolbarInset = insets.bottom + BOTTOM_TOOLBAR_HEIGHT + BOTTOM_TOOLBAR_MARGIN * 2;
  const nativeSearchWidth = Math.max(180, windowWidth - 156);
  const keyboardContentInset = isIos && composerVisible && keyboardHeight > 0 ? keyboardHeight : 0;
  const footerSpacerHeight = composerVisible
    ? bottomToolbarInset + (isIos ? 24 : keyboardHeight + COMPOSER_TOOLBAR_HEIGHT + COMPOSER_TOOLBAR_OFFSET)
    : bottomToolbarInset;
  const actionBarBottom = keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom + 16;

  useEffect(() => {
    setDraftConfig(list?.config);
  }, [list?.config]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    visibleEntriesRef.current = visibleEntries;
  }, [visibleEntries]);

  useEffect(() => {
    const persistedIds = (list?.entries ?? []).map((entry) => entry.id);
    setOptimisticEntryOrderIds((current) => {
      if (!current?.length) {
        return current;
      }

      if (current.length === persistedIds.length && current.every((id, index) => id === persistedIds[index])) {
        return null;
      }

      const nextIds = current.filter((entryId) => persistedIds.includes(entryId));
      if (!nextIds.length) {
        return null;
      }

      for (const entryId of persistedIds) {
        if (!nextIds.includes(entryId)) {
          nextIds.push(entryId);
        }
      }

      return nextIds;
    });
  }, [list?.entries]);

  useEffect(() => {
    if (canDragEntries) {
      return;
    }

    autoScrollVelocityRef.current = 0;
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
    setDragState(null);
    dragMetaRef.current = null;
    dragPositionRef.current = { left: 0, top: 0 };
    lastDragTargetIndexRef.current = null;
    dragLeft.value = withTiming(0, { duration: 120 });
    dragTop.value = withTiming(0, { duration: 120 });
    dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
  }, [canDragEntries, dragLeft, dragScale, dragTop]);

  useEffect(() => {
    if (!composerVisible || preferences.viewMode !== 'list') {
      return;
    }

    const timeout = setTimeout(() => {
      scrollComposerIntoView();
    }, 80);

    return () => clearTimeout(timeout);
  }, [composerVisible, preferences.viewMode, scrollComposerIntoView, visibleEntries.length]);

  useEffect(() => {
    if (!composerVisible || preferences.viewMode !== 'list' || keyboardHeight <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollComposerIntoView();
    }, 80);

    return () => clearTimeout(timeout);
  }, [composerVisible, keyboardHeight, preferences.viewMode, scrollComposerIntoView]);

  useEffect(() => {
    if (!isIos || !composerVisible || preferences.viewMode !== 'list' || !composerInputMounted) {
      setComposerAccessoryVisible(false);
      return;
    }

    const timeout = setTimeout(() => {
      setComposerAccessoryVisible(true);
    }, 0);

    return () => clearTimeout(timeout);
  }, [composerInputMounted, composerVisible, isIos, preferences.viewMode]);

  useEffect(() => {
    if (!composerFocusPending || !composerVisible || preferences.viewMode !== 'list' || !composerInputMounted) {
      return;
    }

    if (isIos && !composerAccessoryVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollComposerIntoView();
      composerInputRef.current?.focus();
      setComposerFocusPending(false);
    }, 40);

    return () => clearTimeout(timeout);
  }, [
    composerAccessoryVisible,
    composerFocusPending,
    composerInputMounted,
    composerVisible,
    isIos,
    preferences.viewMode,
    scrollComposerIntoView,
  ]);

  const tierRows = useMemo(
    () =>
      filterEntriesByQuery(list?.entries ?? [], listSearchQuery)
        .filter((entry) => !!entry.linkedListId || entry.detailPath?.startsWith('list/'))
        .map((entry, index) => {
          const sublistId = entry.linkedListId ?? entry.detailPath?.split('/').pop();
          return {
            id: entry.id,
            title: entry.title,
            color: TIER_COLORS[index % TIER_COLORS.length],
            list: activeLists.find((item) => item.id === sublistId) ?? null,
          };
        }),
    [activeLists, list?.entries, listSearchQuery]
  );

  const tagConversionOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of list?.entries ?? []) {
      for (const tag of entry.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({
        value: tag,
        label: `${tag} (${count})`,
      }));
  }, [list?.entries]);

  const backgroundImageSource = useMemo(() => {
    const listImageUrl = list?.imageUrl?.trim();
    if (listImageUrl) {
      return { uri: listImageUrl };
    }

    const entryImageUrl = list?.entries.find((entry) => {
      const imageUrl = entry.coverAssetUri ?? entry.imageUrl;
      return typeof imageUrl === 'string' && imageUrl.trim().length > 0;
    });

    const fallbackImageUrl = (entryImageUrl?.coverAssetUri ?? entryImageUrl?.imageUrl)?.trim();
    if (fallbackImageUrl) {
      return { uri: fallbackImageUrl };
    }

    return PLACEHOLDER_THUMBNAIL;
  }, [list]);

  function clearPendingComposerMetadata() {
    setPendingTagsText('');
  }

  function focusNextComposerLine() {
    setComposerVisible(true);
    setComposerText('');
    clearPendingComposerMetadata();
    setComposerFocusPending(true);
  }

  function buildPendingTags() {
    return pendingTagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function submitComposer() {
    if (!list) {
      return;
    }

    const trimmedTitle = composerText.trim();
    if (!trimmedTitle) {
      Keyboard.dismiss();
      return;
    }

    const draft: EntryDraft = {
      title: trimmedTitle,
      type: list.config.defaultEntryType ?? 'custom',
      tags: buildPendingTags(),
      sourceRef: {
        source: 'custom',
      },
    };

    addEntryToList(list.id, draft);
    focusNextComposerLine();
  }

  function addCatalogEntry(entry: EntryDraft) {
    if (!list) {
      return;
    }

    addEntryToList(list.id, {
      ...entry,
      tags: buildPendingTags(),
    });
    setSearchVisible(false);
    focusNextComposerLine();
  }

  function addUrlEntry(entry: EntryDraft) {
    if (!list) {
      return;
    }

    addEntryToList(list.id, {
      ...entry,
      tags: [...new Set([...(entry.tags ?? []), ...buildPendingTags()])],
    });
    setUrlImportVisible(false);
    focusNextComposerLine();
  }

  const openExistingListSheet = useCallback(() => {
    if (!list) {
      return;
    }

    Keyboard.dismiss();
    router.push({
      pathname: '/list-existing-sheet',
      params: {
        targetListId: list.id,
        query: composerText.trim() || undefined,
      },
    });
  }, [composerText, list, router]);

  const openUrlImportSheet = useCallback(() => {
    Keyboard.dismiss();
    setUrlImportVisible(true);
  }, []);

  const openLinkOptions = useCallback(() => {
    if (process.env.EXPO_OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Link',
          options: ['URL', 'Existing List', 'Cancel'],
          cancelButtonIndex: 2,
          userInterfaceStyle: colorScheme ?? 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openUrlImportSheet();
            return;
          }
          if (buttonIndex === 1) {
            openExistingListSheet();
          }
        }
      );
      return;
    }

    Alert.alert('Link', undefined, [
      { text: 'URL', onPress: openUrlImportSheet },
      { text: 'Existing List', onPress: openExistingListSheet },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [
    colorScheme,
    openExistingListSheet,
    openUrlImportSheet,
  ]);

  const openEntry = (entry: ListEntry) => {
    const pathname = entry.linkedListId
      ? `/list/${entry.linkedListId}`
      : entry.detailPath
        ? `/${entry.detailPath}`
        : `/list-entry/${entry.id}`;

    router.push(pathname as never);
  };

  const openEntryMetadata = (entry: ListEntry) => {
    router.push(`/list-entry/${entry.id}` as never);
  };

  const openEntryUrl = useCallback(async (entry: ListEntry) => {
    const url = entry.productUrl?.trim();
    if (!url) {
      return;
    }

    if (process.env.EXPO_OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  }, []);

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    if (autoScrollFrameRef.current !== null) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const triggerDragStartHaptic = useCallback(() => {
    if (!isIos) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isIos]);

  const triggerDragEndHaptic = useCallback(() => {
    if (!isIos) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isIos]);

  const triggerDragMoveHaptic = useCallback(() => {
    if (!isIos) {
      return;
    }

    void Haptics.selectionAsync();
  }, [isIos]);

  const updateDragTarget = useCallback(
    (entryId: string, nextTargetIndex: number) => {
      setDragState((current) => {
        if (!current || current.entryId !== entryId || current.targetIndex === nextTargetIndex) {
          return current;
        }

        if (lastDragTargetIndexRef.current !== nextTargetIndex) {
          lastDragTargetIndexRef.current = nextTargetIndex;
          triggerDragMoveHaptic();
        }

        return { ...current, targetIndex: nextTargetIndex };
      });
    },
    [triggerDragMoveHaptic]
  );

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollFrameRef.current !== null) {
      return;
    }

    const tick = () => {
      autoScrollFrameRef.current = requestAnimationFrame(() => {
        const activeDrag = dragStateRef.current;
        const dragMeta = dragMetaRef.current;
        if (!activeDrag || !dragMeta || !autoScrollVelocityRef.current) {
          autoScrollFrameRef.current = null;
          return;
        }

        const viewportHeight = listViewportHeightRef.current;
        const estimatedRowHeight =
          dragMeta.rowHeight || rowLayoutsRef.current[activeDrag.entryId]?.height || 94;
        const estimatedContentHeight =
          ENTRY_LIST_TOP_PADDING +
          footerSpacerHeight +
          visibleEntriesRef.current.reduce(
            (total, entry) => total + (rowLayoutsRef.current[entry.id]?.height ?? estimatedRowHeight),
            0
          );
        const contentHeight = Math.max(listContentHeightRef.current, estimatedContentHeight);
        const maxScrollOffset = Math.max(0, contentHeight - viewportHeight);
        if (viewportHeight <= 0 || maxScrollOffset <= 0) {
          stopAutoScroll();
          return;
        }

        const nextScrollOffset = clamp(
          scrollOffsetRef.current + autoScrollVelocityRef.current,
          0,
          maxScrollOffset
        );
        if (nextScrollOffset === scrollOffsetRef.current) {
          stopAutoScroll();
          return;
        }

        scrollOffsetRef.current = nextScrollOffset;
        scrollOffsetValue.value = nextScrollOffset;
        listRef.current?.scrollToOffset({
          animated: false,
          offset: nextScrollOffset,
        });

        const hoverMiddleY =
          dragPositionRef.current.top +
          nextScrollOffset -
          ENTRY_LIST_TOP_PADDING +
          dragMeta.rowHeight / 2;
        const nextTargetIndex = getHoverTargetIndex(
          visibleEntriesRef.current,
          activeDrag.entryId,
          hoverMiddleY,
          rowLayoutsRef.current
        );
        updateDragTarget(activeDrag.entryId, nextTargetIndex);

        tick();
      });
    };

    tick();
  }, [footerSpacerHeight, scrollOffsetValue, stopAutoScroll, updateDragTarget]);

  const updateAutoScroll = useCallback(
    (fingerYInViewport: number) => {
      const viewportHeight = listViewportHeightRef.current;
      if (viewportHeight <= 0) {
        stopAutoScroll();
        return;
      }

      let nextVelocity = 0;
      if (fingerYInViewport < AUTO_SCROLL_EDGE_THRESHOLD) {
        const intensity = 1 - fingerYInViewport / AUTO_SCROLL_EDGE_THRESHOLD;
        nextVelocity = -Math.max(4, AUTO_SCROLL_MAX_STEP * intensity);
      } else if (fingerYInViewport > viewportHeight - AUTO_SCROLL_EDGE_THRESHOLD) {
        const distanceFromBottom = viewportHeight - fingerYInViewport;
        const intensity = 1 - distanceFromBottom / AUTO_SCROLL_EDGE_THRESHOLD;
        nextVelocity = Math.max(4, AUTO_SCROLL_MAX_STEP * intensity);
      }

      autoScrollVelocityRef.current = nextVelocity;
      if (!nextVelocity) {
        stopAutoScroll();
        return;
      }

      startAutoScrollLoop();
    },
    [startAutoScrollLoop, stopAutoScroll]
  );

  const registerRowLayout = useCallback((entryId: string, layout: RowLayout) => {
    rowLayoutsRef.current[entryId] = layout;
  }, []);

  const startEntryDrag = useCallback(
    (
      entryId: string,
      touchOffsetX: number,
      touchOffsetY: number,
      absoluteX: number,
      absoluteY: number
    ) => {
      if (!canDragEntries) {
        return;
      }

      const entry = visibleEntriesRef.current.find((candidate) => candidate.id === entryId);
      const viewport = listViewportRef.current;
      const activeLayout = rowLayoutsRef.current[entryId];
      if (!entry || !viewport || !activeLayout) {
        return;
      }

      viewport.measureInWindow((viewportX, viewportY) => {
        const viewportWidth = listViewportWidthRef.current || activeLayout.width;
        const fingerXInViewport = absoluteX - viewportX;
        const fingerYInViewport = absoluteY - viewportY;
        const maxLeft = Math.max(0, viewportWidth - activeLayout.width);
        const initialLeft = clamp(fingerXInViewport - touchOffsetX, 0, maxLeft);
        const initialTop = fingerYInViewport - touchOffsetY;

        dragPositionRef.current = {
          left: initialLeft,
          top: initialTop,
        };
        dragLeft.value = initialLeft;
        dragTop.value = initialTop;
        dragScale.value = withTiming(0.97, { duration: DRAG_LIFT_DURATION_MS });
        dragMetaRef.current = {
          initialLeft,
          initialTop,
          touchOffsetY,
          rowHeight: activeLayout.height,
          rowWidth: activeLayout.width,
          maxLeft,
        };
        const originalIndex = visibleEntriesRef.current.findIndex((candidate) => candidate.id === entryId);
        lastDragTargetIndexRef.current = originalIndex;
        setDragState({
          entry,
          entryId,
          originalIndex,
          targetIndex: originalIndex,
          rowWidth: activeLayout.width,
        });
        updateAutoScroll(fingerYInViewport);
        triggerDragStartHaptic();
      });
    },
    [canDragEntries, dragLeft, dragScale, dragTop, triggerDragStartHaptic, updateAutoScroll]
  );

  const updateEntryDrag = useCallback(
    (entryId: string, translationX: number, translationY: number) => {
      const activeDrag = dragState?.entryId === entryId ? dragState : null;
      const dragMeta = dragMetaRef.current;
      if (!activeDrag || !dragMeta) {
        return;
      }

      const nextLeft = clamp(dragMeta.initialLeft + translationX, 0, dragMeta.maxLeft);
      const nextTop = dragMeta.initialTop + translationY;
      const fingerYInViewport = nextTop + dragMeta.touchOffsetY;
      const hoverMiddleY =
        nextTop + scrollOffsetRef.current - ENTRY_LIST_TOP_PADDING + dragMeta.rowHeight / 2;
      const nextTargetIndex = getHoverTargetIndex(
        visibleEntriesRef.current,
        entryId,
        hoverMiddleY,
        rowLayoutsRef.current
      );

      dragPositionRef.current = {
        left: nextLeft,
        top: nextTop,
      };
      dragLeft.value = nextLeft;
      dragTop.value = nextTop;
      updateAutoScroll(fingerYInViewport);

      if (nextTargetIndex !== activeDrag.targetIndex) {
        updateDragTarget(entryId, nextTargetIndex);
      }
    },
    [dragLeft, dragState, dragTop, updateAutoScroll, updateDragTarget]
  );

  const finishEntryDrag = useCallback(() => {
    const activeDrag = dragState;
    if (!activeDrag || !list) {
      stopAutoScroll();
      dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
      return;
    }

    const resetDrag = () => {
      setDragState(null);
      dragMetaRef.current = null;
      dragPositionRef.current = { left: 0, top: 0 };
      lastDragTargetIndexRef.current = null;
    };

    if (activeDrag.targetIndex === activeDrag.originalIndex) {
      stopAutoScroll();
      dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
      resetDrag();
      triggerDragEndHaptic();
      return;
    }

    const currentIds = orderedEntries.map((entry) => entry.id);
    const visibleIds = visibleEntriesRef.current.map((entry) => entry.id);
    const hiddenIds = currentIds.filter((entryId) => !visibleIds.includes(entryId));
    const reorderedVisibleIds = moveItemIdToIndex(visibleIds, activeDrag.entryId, activeDrag.targetIndex);
    const reorderedIds = [...reorderedVisibleIds, ...hiddenIds];
    const previousOrderedIds = currentIds;

    stopAutoScroll();
    dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
    setOptimisticEntryOrderIds(reorderedIds);
    resetDrag();
    triggerDragEndHaptic();

    void reorderEntries(list.id, reorderedIds).catch(() => {
      setOptimisticEntryOrderIds(previousOrderedIds);
    });
  }, [dragScale, dragState, list, orderedEntries, reorderEntries, stopAutoScroll, triggerDragEndHaptic]);

  const openNewSublist = useCallback(() => {
    setMenuVisible(null);
    setSublistTitle('');
    setSublistPreset('blank');
    setNewSublistVisible(true);
  }, []);

  const openListConfiguration = useCallback(() => {
    if (!list) {
      return;
    }

    setMenuVisible(null);
    setDraftConfig(list.config);
    setConfigVisible(true);
  }, [list]);

  const openSaveTemplate = useCallback(() => {
    if (!list) {
      return;
    }

    setMenuVisible(null);
    setTemplateTitle(`${list.title} Template`);
    setTemplateDescription(list.description ?? '');
    setTemplateVisible(true);
  }, [list]);

  const convertCurrentSublistToTag = useCallback(() => {
    if (!list?.parentListId) {
      return;
    }

    const runConversion = () => {
      void convertSublistToTag(list.id).then((convertedTag) => {
        if (convertedTag) {
          router.replace(`/list/${list.parentListId}` as never);
        }
      });
    };

    setMenuVisible(null);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Convert "${list.title}" into the "${list.title}" tag on its parent list?`)) {
        runConversion();
      }
      return;
    }

    Alert.alert(
      'Convert sublist to tag?',
      `All items in "${list.title}" will move to the parent list and be tagged "${list.title}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Convert', onPress: runConversion },
      ]
    );
  }, [convertSublistToTag, list, router]);

  const confirmDeleteEntry = (entry: ListEntry) => {
    if (!list) {
      return;
    }

    const runDelete = () => deleteEntryFromList(list.id, entry.id);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete "${entry.title}"?`)) {
        runDelete();
      }
      return;
    }

    Alert.alert('Delete item?', `Delete "${entry.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);
  };

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    entry: ListEntry
  ) => {
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <RNAnimated.View style={[styles.rightActionContainer, { opacity }]}>
        <SwipeActionButton
          backgroundColor={colors.tint}
          icon="info.circle.fill"
          iconColor={colors.background}
          isIos={isIos}
          onPress={() => openEntryMetadata(entry)}
        />
        <SwipeActionButton
          backgroundColor="#C62828"
          icon="trash.fill"
          iconColor="#fff"
          isIos={isIos}
          onPress={() => confirmDeleteEntry(entry)}
        />
      </RNAnimated.View>
    );
  };

  const dragIndicatorTop = dragState
    ? getDropIndicatorTop(visibleEntries, dragState.entryId, dragState.targetIndex, rowLayoutsRef.current)
    : null;
  const dragOverlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragLeft.value },
      { translateY: dragTop.value },
      { scale: dragScale.value },
    ],
  }));
  const dragIndicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (dragIndicatorTop ?? 0) -
          scrollOffsetValue.value +
          ENTRY_LIST_TOP_PADDING -
          DROP_INDICATOR_HEIGHT / 2,
      },
    ],
    opacity: dragIndicatorTop === null ? 0 : 1,
  }));

  if (!list) {
    return (
      <>
        <Stack.Screen options={{ title: 'List' }} />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText>This list no longer exists.</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  const hasToggle = list.config.addons.includes('toggle');
  const hasStatus = list.config.addons.includes('status');

  function renderEntryTags(tags: string[]) {
    const normalizedTags = tags
      .map((tag) => tag.trim())
      .filter((tag): tag is string => tag.length > 0)
      .slice(0, MAX_VISIBLE_ENTRY_TAGS + 1);

    if (!normalizedTags.length) {
      return null;
    }

    const visibleTags = normalizedTags.slice(0, MAX_VISIBLE_ENTRY_TAGS);
    const hasOverflow = normalizedTags.length > MAX_VISIBLE_ENTRY_TAGS;

    return (
      <View style={styles.entryTagRow}>
        {visibleTags.map((tag, index) => (
          <View key={`${tag}-${index}`} style={[styles.entryTagChip, { backgroundColor: colors.tint + '14' }]}>
            <ThemedText style={[styles.entryTagText, { color: colors.tint }]} numberOfLines={1}>
              {tag}
            </ThemedText>
          </View>
        ))}
        {hasOverflow ? (
          <View style={[styles.entryOverflowChip, { backgroundColor: colors.icon + '14' }]}>
            <ThemedText style={[styles.entryTagText, { color: colors.icon }]} numberOfLines={1}>
              …
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: list.title,
          headerBackVisible: true,
          headerTransparent: true,
          headerRight: isIos
            ? undefined
            : () => (
              <View style={styles.headerRightActions}>
                <Pressable
                  accessibilityLabel="Go home"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={goHome}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="house.fill" size={22} color={colors.tint} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Open list menu"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setMenuVisible('view')}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="ellipsis.circle" size={24} color={colors.tint} />
                </Pressable>
              </View>
            ),
        }}
      />
      {isIos ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon="house.fill" onPress={goHome} />
          <Stack.Toolbar.Menu icon="ellipsis">
            <Stack.Toolbar.Menu title="View">
              <Stack.Toolbar.Menu inline>
                <Stack.Toolbar.MenuAction
                  isOn={preferences.viewMode === 'list'}
                  onPress={() => setListPreferences({ viewMode: 'list' })}
                >
                  List view
                </Stack.Toolbar.MenuAction>
                <Stack.Toolbar.MenuAction
                  isOn={preferences.viewMode === 'grid'}
                  onPress={() => setListPreferences({ viewMode: 'grid' })}
                >
                  Grid view
                </Stack.Toolbar.MenuAction>
                {list.config.addons.includes('compare') ? (
                  <Stack.Toolbar.MenuAction
                    isOn={preferences.viewMode === 'compare'}
                    onPress={() => setListPreferences({ viewMode: 'compare' })}
                  >
                    Compare view
                  </Stack.Toolbar.MenuAction>
                ) : null}
                {list.config.addons.includes('tier') ? (
                  <Stack.Toolbar.MenuAction
                    isOn={preferences.viewMode === 'tier'}
                    onPress={() => setListPreferences({ viewMode: 'tier' })}
                  >
                    Tier view
                  </Stack.Toolbar.MenuAction>
                ) : null}
              </Stack.Toolbar.Menu>
            </Stack.Toolbar.Menu>
            {list.config.addons.includes('sublists') ? (
              <Stack.Toolbar.MenuAction onPress={openNewSublist}>
                Create sublist
              </Stack.Toolbar.MenuAction>
            ) : null}
            {tagConversionOptions.length ? (
              <Stack.Toolbar.Menu title="Convert tag to sublist">
                <Stack.Toolbar.Menu inline>
                  {tagConversionOptions.map((option) => (
                    <Stack.Toolbar.MenuAction
                      key={option.value}
                      onPress={() => convertTagToSublist(list.id, option.value)}
                    >
                      {option.label}
                    </Stack.Toolbar.MenuAction>
                  ))}
                </Stack.Toolbar.Menu>
              </Stack.Toolbar.Menu>
            ) : null}
            {list.parentListId ? (
              <Stack.Toolbar.MenuAction onPress={convertCurrentSublistToTag}>
                Convert this sublist to tag
              </Stack.Toolbar.MenuAction>
            ) : null}
            <Stack.Toolbar.MenuAction onPress={openListConfiguration}>
              Configure list
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction onPress={openSaveTemplate}>
              Save as template
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
      <ThemedView style={styles.container} lightColor="transparent" darkColor="transparent">
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <Image
            source={backgroundImageSource}
            style={styles.backgroundImage}
            contentFit="cover"
            transition={200}
          />
          <BlurView
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            intensity={55}
            style={styles.backgroundBlur}
          />
          <View
            style={[
              styles.backgroundScrim,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(5, 18, 35, 0.76)'
                    : 'rgba(245, 248, 252, 0.82)',
              },
            ]}
          />
        </View>
        <View style={[styles.contentLayer, { paddingTop: headerHeight }]}>
          <View style={styles.toolbar}>
            <FilterSortControlRow
              alignRight
              colors={colors}
              filterLabel={labelForFilter(preferences.filterMode)}
              filterOptions={[
                { value: 'all', label: 'All' },
                ...(hasStatus
                  ? [
                    { value: 'active', label: 'Active' },
                    { value: 'planned', label: 'Planned' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'paused', label: 'Paused' },
                    { value: 'dropped', label: 'Dropped' },
                  ]
                  : []),
                { value: 'archived', label: 'Archived' },
              ]}
              filterValue={preferences.filterMode}
              onFilterChange={(value) => setListPreferences({ filterMode: value as ListFilterMode })}
              onOpenFilter={() => setMenuVisible('filter')}
              onOpenSort={() => setMenuVisible('sort')}
              sortLabel={labelForSort(preferences.sortMode)}
              sortOptions={[
                { value: 'manual', label: 'Custom Order' },
                { value: 'updated-desc', label: 'Recently updated' },
                { value: 'title-asc', label: 'Title A-Z' },
                { value: 'rating-desc', label: 'Rating' },
                ...(hasStatus ? [{ value: 'status', label: 'Status' }] : []),
              ]}
              sortValue={preferences.sortMode}
              onSortChange={(value) => setListPreferences({ sortMode: value as ListSortMode })}
            />
          </View>

          {list.tags.length ? (
            <View style={styles.listTagSection}>
              <ThemedText style={[styles.listTagLabel, { color: colors.icon }]}>List tags</ThemedText>
              <View style={styles.listTagWrap}>
                {list.tags.map((tag) => (
                  <View key={tag} style={[styles.listTagChip, { backgroundColor: colors.tint + '16' }]}>
                    <ThemedText style={{ color: colors.tint }}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {preferences.viewMode === 'compare' ? (
            <CompareView entries={visibleEntries} bottomInset={bottomToolbarInset} />
          ) : preferences.viewMode === 'tier' ? (
            <TierView tierRows={tierRows} onOpenEntry={openEntry} bottomInset={bottomToolbarInset} />
          ) : preferences.viewMode === 'grid' ? (
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[styles.gridContent, { paddingBottom: bottomToolbarInset }]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.grid}>
                {visibleEntries.map((entry) => {
                  const entryImageUrl = getEntryImageUrl(entry);

                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => openEntry(entry)}
                      style={styles.gridCard}
                    >
                      {entryImageUrl || entry.sourceRef.source === 'anime' || entry.sourceRef.source === 'manga' ? (
                        <ThumbnailImage
                          imageUrl={entryImageUrl}
                          sourceRef={entry.sourceRef}
                          detailPath={entry.detailPath}
                          style={styles.gridImage}
                        />
                      ) : null}
                      <ThemedText style={styles.gridTitle} numberOfLines={2}>
                        {entry.title}
                      </ThemedText>
                      {renderEntryTags(entry.tags)}
                    </Pressable>
                  );
                })}
              </View>
              {!visibleEntries.length ? (
                <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
                  This list is empty.
                </ThemedText>
              ) : null}
            </ScrollView>
          ) : (
            <View
              ref={listViewportRef}
              onLayout={(event) => {
                listViewportWidthRef.current = event.nativeEvent.layout.width;
                listViewportHeightRef.current = event.nativeEvent.layout.height;
              }}
              style={styles.listViewport}
            >
              <FlatList
                ref={listRef}
                contentInset={{ bottom: keyboardContentInset }}
                contentInsetAdjustmentBehavior="never"
                scrollIndicatorInsets={{ bottom: keyboardContentInset }}
                data={visibleEntries}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={(_width, height) => {
                  listContentHeightRef.current = height;
                }}
                onScroll={(event) => {
                  const nextScrollOffset = event.nativeEvent.contentOffset.y;
                  scrollOffsetRef.current = nextScrollOffset;
                  scrollOffsetValue.value = nextScrollOffset;
                }}
                renderItem={({ item, index }) =>
                  canDragEntries ? (
                    <DraggableEntryRow
                      colors={colors}
                      entry={item}
                      hasToggle={hasToggle}
                      isDragging={dragState?.entryId === item.id}
                      isIos={isIos}
                      showBottomSpacing={index < visibleEntries.length - 1}
                      supportsLiquidGlass={supportsLiquidGlass}
                      onDragEnd={finishEntryDrag}
                      onDragMove={updateEntryDrag}
                      onDragStart={startEntryDrag}
                      onLayout={registerRowLayout}
                      onOpenEntry={openEntry}
                      onOpenEntryUrl={openEntryUrl}
                      onToggleChecked={(entry) => setEntryChecked(list.id, entry.id, !entry.checked)}
                      renderRightActions={(progress) => renderRightActions(progress, item)}
                      renderEntryTags={renderEntryTags}
                    />
                  ) : (
                    <View style={index < visibleEntries.length - 1 ? styles.rowWithSpacing : undefined}>
                      <Swipeable
                        containerStyle={styles.swipeableContainer}
                        childrenContainerStyle={styles.swipeableChildren}
                        overshootRight={false}
                        rightThreshold={56}
                        renderRightActions={(progress) => renderRightActions(progress, item)}
                      >
                        <EntryRow
                          colors={colors}
                          entry={item}
                          hasToggle={hasToggle}
                          isIos={isIos}
                          supportsLiquidGlass={supportsLiquidGlass}
                          onOpenEntry={openEntry}
                          onOpenEntryUrl={openEntryUrl}
                          onToggleChecked={(entry) => setEntryChecked(list.id, entry.id, !entry.checked)}
                          renderEntryTags={renderEntryTags}
                        />
                      </Swipeable>
                    </View>
                  )
                }
                contentContainerStyle={[
                  styles.listContent,
                  { paddingTop: ENTRY_LIST_TOP_PADDING, paddingBottom: footerSpacerHeight },
                ]}
                ListEmptyComponent={
                  <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
                    This list is empty.
                  </ThemedText>
                }
                ListFooterComponent={
                  composerVisible ? (
                    <View onLayout={handleComposerFooterLayout} style={styles.composerFooter}>
                      {pendingTagsText.trim() ? (
                        <View style={styles.pendingMetaRow}>
                          <View style={[styles.pendingChip, { backgroundColor: colors.tint + '16' }]}>
                            <IconSymbol name="tag.fill" size={14} color={colors.tint} />
                            <ThemedText style={{ color: colors.tint }} numberOfLines={1}>
                              {pendingTagsText}
                            </ThemedText>
                          </View>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={() => composerInputRef.current?.focus()}
                        style={[
                          styles.composerCard,
                          {
                            borderColor: colors.tint + '35',
                            backgroundColor: colors.background,
                          },
                        ]}
                      >
                        <TextInput
                          ref={setComposerInputNode}
                          style={[styles.composerInput, { color: colors.text }]}
                          placeholder="Add an item"
                          placeholderTextColor={colors.icon}
                          inputAccessoryViewID={isIos ? composerAccessoryId : undefined}
                          value={composerText}
                          onChangeText={setComposerText}
                          onFocus={handleComposerInputFocus}
                          onSubmitEditing={submitComposer}
                          blurOnSubmit={false}
                          returnKeyType="done"
                        />
                      </Pressable>
                    </View>
                  ) : null
                }
                scrollEventThrottle={16}
              />
              {dragState && dragIndicatorTop !== null ? (
                <Animated.View
                  entering={FadeIn.duration(120)}
                  exiting={FadeOut.duration(120)}
                  pointerEvents="none"
                  style={[
                    styles.dropIndicator,
                    { backgroundColor: DROP_INDICATOR_COLOR },
                    dragIndicatorStyle,
                  ]}
                />
              ) : null}
              {dragState ? (
                <Animated.View pointerEvents="none" style={[styles.dragOverlay, dragOverlayStyle]}>
                  <View style={{ width: dragState.rowWidth }}>
                    <EntryRow
                      colors={colors}
                      entry={dragState.entry}
                      hasToggle={hasToggle}
                      isIos={isIos}
                      supportsLiquidGlass={supportsLiquidGlass}
                      onOpenEntry={openEntry}
                      onOpenEntryUrl={openEntryUrl}
                      onToggleChecked={() => {}}
                      renderEntryTags={renderEntryTags}
                    />
                  </View>
                </Animated.View>
              ) : null}
            </View>
          )}
        </View>

        {isIos ? (
          <Stack.Toolbar placement="bottom">
            <Stack.Toolbar.Button
              icon="magnifyingglass"
              selected={listSearchVisible}
              onPress={toggleListSearch}
            />
            {listSearchVisible ? (
              <Stack.Toolbar.View>
                <View
                  style={[
                    styles.nativeSearchToolbarWrap,
                    {
                      width: nativeSearchWidth,
                      backgroundColor: colors.icon + '10',
                      borderColor: colors.icon + '28',
                    },
                  ]}
                >
                  <TextInput
                    ref={listSearchInputRef}
                    style={[styles.nativeSearchToolbarInput, { color: colors.text }]}
                    placeholder="Search this list"
                    placeholderTextColor={colors.icon}
                    value={listSearchQuery}
                    onChangeText={setListSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                </View>
              </Stack.Toolbar.View>
            ) : (
              <>
                <Stack.Toolbar.Spacer />
                <Stack.Toolbar.Button icon="plus" onPress={openComposer} />
              </>
            )}
          </Stack.Toolbar>
        ) : (
          <View pointerEvents="box-none" style={styles.bottomToolbarOverlay}>
            <View
              style={[
                styles.bottomToolbar,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.icon + '20',
                  bottom: insets.bottom + BOTTOM_TOOLBAR_MARGIN,
                },
              ]}
            >
              {listSearchVisible ? (
                <View
                  style={[
                    styles.expandedSearchBar,
                    {
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                >
                  <Pressable
                    accessibilityLabel="Close search"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={toggleListSearch}
                    style={({ pressed }) => [styles.expandedSearchIcon, { opacity: pressed ? 0.72 : 1 }]}
                  >
                    <IconSymbol name="magnifyingglass" size={18} color={colors.icon} />
                  </Pressable>
                  <View style={styles.expandedSearchField}>
                    <TextInput
                      ref={listSearchInputRef}
                      style={[styles.expandedSearchInput, { color: colors.text }]}
                      placeholder="Search this list"
                      placeholderTextColor={colors.icon}
                      value={listSearchQuery}
                      onChangeText={setListSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Pressable
                    accessibilityLabel="Open search"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={toggleListSearch}
                    style={({ pressed }) => [
                      styles.bottomToolbarButton,
                      { opacity: pressed ? 0.72 : 1, backgroundColor: colors.icon + '10' },
                    ]}
                  >
                    <IconSymbol name="magnifyingglass" size={20} color={colors.tint} />
                  </Pressable>
                  <View style={styles.bottomToolbarSpacer} />
                  <Pressable
                    accessibilityLabel="Add item"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={openComposer}
                    style={({ pressed }) => [
                      styles.bottomToolbarButton,
                      { opacity: pressed ? 0.72 : 1, backgroundColor: colors.tint },
                    ]}
                  >
                    <IconSymbol name="plus" size={22} color={colors.background} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

        <ComposerActionBar
          accessoryId={composerAccessoryId}
          visible={composerAccessoryVisible}
          colors={colors}
          bottom={actionBarBottom}
          onLinkPress={openLinkOptions}
          onSearchPress={() => setSearchVisible(true)}
          onTagPress={() => setTagSheetVisible(true)}
        />

        <SelectionMenu
          visible={menuVisible === 'view'}
          title="View"
          options={[
            { value: 'list', label: 'List view' },
            { value: 'grid', label: 'Grid view' },
            ...(list.config.addons.includes('compare')
              ? [{ value: 'compare', label: 'Compare view' }]
              : []),
            ...(list.config.addons.includes('tier')
              ? [{ value: 'tier', label: 'Tier view' }]
              : []),
            ...(list.config.addons.includes('sublists')
              ? [{ value: 'sublist', label: 'Create sublist' }]
              : []),
            ...(tagConversionOptions.length
              ? [{ value: 'tag-to-sublist', label: 'Convert tag to sublist' }]
              : []),
            ...(list.parentListId
              ? [{ value: 'sublist-to-tag', label: 'Convert this sublist to tag' }]
              : []),
            { value: 'configure', label: 'Configure list' },
            { value: 'save-template', label: 'Save as template' },
          ]}
          selectedValue={preferences.viewMode}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            if (value === 'sublist') {
              openNewSublist();
              return;
            }
            if (value === 'configure') {
              openListConfiguration();
              return;
            }
            if (value === 'tag-to-sublist') {
              setMenuVisible('tag-to-sublist');
              return;
            }
            if (value === 'sublist-to-tag') {
              convertCurrentSublistToTag();
              return;
            }
            if (value === 'save-template') {
              openSaveTemplate();
              return;
            }
            setListPreferences({ viewMode: value as ListViewMode });
            setMenuVisible(null);
          }}
        />
        <SelectionMenu
          visible={menuVisible === 'tag-to-sublist'}
          title="Convert tag to sublist"
          options={tagConversionOptions}
          selectedValue=""
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            convertTagToSublist(list.id, value);
            setMenuVisible(null);
          }}
        />
        <SelectionMenu
          visible={menuVisible === 'sort'}
          title="Sort items"
          options={[
            { value: 'manual', label: 'Custom Order' },
            { value: 'updated-desc', label: 'Recently updated' },
            { value: 'title-asc', label: 'Title A-Z' },
            { value: 'rating-desc', label: 'Rating' },
            ...(hasStatus ? [{ value: 'status', label: 'Status' }] : []),
          ]}
          selectedValue={preferences.sortMode}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            setListPreferences({ sortMode: value as ListSortMode });
            setMenuVisible(null);
          }}
        />
        <SelectionMenu
          visible={menuVisible === 'filter'}
          title="Filter items"
          options={[
            { value: 'all', label: 'All' },
            ...(hasStatus
              ? [
                { value: 'active', label: 'Active' },
                { value: 'planned', label: 'Planned' },
                { value: 'completed', label: 'Completed' },
                { value: 'paused', label: 'Paused' },
                { value: 'dropped', label: 'Dropped' },
              ]
              : []),
            { value: 'archived', label: 'Archived' },
          ]}
          selectedValue={preferences.filterMode}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            setListPreferences({ filterMode: value as ListFilterMode });
            setMenuVisible(null);
          }}
        />

        <Modal
          visible={searchVisible}
          animationType="slide"
          onRequestClose={() => setSearchVisible(false)}
          presentationStyle={isIos ? 'pageSheet' : 'fullScreen'}
          transparent={!isIos}
        >
          {isIos ? (
            <View
              style={[
                styles.nativeSheetContainer,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                },
              ]}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setSearchVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  Search catalog
                </ThemedText>
                <View style={styles.sheetHeaderButton} />
              </View>
              <CatalogSearchPanel
                style={styles.sheetList}
                contentContainerStyle={styles.sheetListContent}
                initialQuery={composerText.trim()}
                autoFocus
                onSelectItem={(item) =>
                  addCatalogEntry({
                    title: item.title,
                    type: item.type,
                    imageUrl: item.imageUrl,
                    detailPath: item.detailPath,
                    sourceRef: item.sourceRef,
                    rating: item.rating,
                    progress:
                      item.totalProgress && item.progressUnit
                        ? {
                          current: undefined,
                          total: item.totalProgress,
                          unit: item.progressUnit,
                          updatedAt: Date.now(),
                        }
                        : undefined,
                  })
                }
              />
            </View>
          ) : (
            <Pressable style={styles.modalOverlay} onPress={() => setSearchVisible(false)}>
              <Pressable
                style={[
                  styles.sheet,
                  {
                    backgroundColor: colors.background,
                    paddingBottom: insets.bottom + 24,
                    height: Dimensions.get('window').height * 0.95,
                  },
                ]}
                onPress={(event) => event.stopPropagation()}
              >
                <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                  <Pressable onPress={() => setSearchVisible(false)} style={styles.sheetHeaderButton}>
                    <IconSymbol name="xmark" size={24} color={colors.text} />
                  </Pressable>
                  <ThemedText type="subtitle" style={styles.sheetTitle}>
                    Search catalog
                  </ThemedText>
                  <View style={styles.sheetHeaderButton} />
                </View>
                <CatalogSearchPanel
                  style={styles.sheetList}
                  contentContainerStyle={styles.sheetListContent}
                  initialQuery={composerText.trim()}
                  autoFocus
                  onSelectItem={(item) =>
                    addCatalogEntry({
                      title: item.title,
                      type: item.type,
                      imageUrl: item.imageUrl,
                      detailPath: item.detailPath,
                      sourceRef: item.sourceRef,
                      rating: item.rating,
                      progress:
                        item.totalProgress && item.progressUnit
                          ? {
                            current: undefined,
                            total: item.totalProgress,
                            unit: item.progressUnit,
                            updatedAt: Date.now(),
                          }
                          : undefined,
                    })
                  }
                />
              </Pressable>
            </Pressable>
          )}
        </Modal>

        <Modal
          visible={urlImportVisible}
          animationType="slide"
          onRequestClose={() => setUrlImportVisible(false)}
          presentationStyle={isIos ? 'pageSheet' : 'fullScreen'}
          transparent={!isIos}
        >
          {isIos ? (
            <View
              style={[
                styles.nativeSheetContainer,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                },
              ]}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setUrlImportVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  Import URL
                </ThemedText>
                <View style={styles.sheetHeaderButton} />
              </View>
              <View style={styles.sheetList}>
                <LinkImportPanel
                  autoFocus
                  initialUrl={composerText.trim()}
                  onSubmit={addUrlEntry}
                />
              </View>
            </View>
          ) : (
            <Pressable style={styles.modalOverlay} onPress={() => setUrlImportVisible(false)}>
              <Pressable
                style={[
                  styles.sheet,
                  {
                    backgroundColor: colors.background,
                    paddingBottom: insets.bottom + 24,
                    height: Dimensions.get('window').height * 0.78,
                  },
                ]}
                onPress={(event) => event.stopPropagation()}
              >
                <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                  <Pressable onPress={() => setUrlImportVisible(false)} style={styles.sheetHeaderButton}>
                    <IconSymbol name="xmark" size={24} color={colors.text} />
                  </Pressable>
                  <ThemedText type="subtitle" style={styles.sheetTitle}>
                    Import URL
                  </ThemedText>
                  <View style={styles.sheetHeaderButton} />
                </View>
                <View style={styles.sheetList}>
                  <LinkImportPanel
                    autoFocus
                    initialUrl={composerText.trim()}
                    onSubmit={addUrlEntry}
                  />
                </View>
              </Pressable>
            </Pressable>
          )}
        </Modal>

        <Modal
          visible={tagSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTagSheetVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setTagSheetVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.3,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setTagSheetVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  Tags
                </ThemedText>
                <Pressable
                  onPress={() => setTagSheetVisible(false)}
                  style={styles.sheetHeaderButton}
                >
                  <IconSymbol name="checkmark" size={24} color={colors.tint} />
                </Pressable>
              </View>
              <View style={styles.sheetBody}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Comma-separated tags"
                  placeholderTextColor={colors.icon}
                  value={pendingTagsText}
                  onChangeText={setPendingTagsText}
                  autoFocus
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={newSublistVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setNewSublistVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setNewSublistVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.5,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setNewSublistVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  New sublist
                </ThemedText>
                <View style={styles.sheetHeaderButton} />
              </View>
              <View style={styles.sheetBody}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Title"
                  placeholderTextColor={colors.icon}
                  value={sublistTitle}
                  onChangeText={setSublistTitle}
                />
                <View style={styles.sublistPresetRow}>
                  <SublistPresetButton
                    label="Blank"
                    active={sublistPreset === 'blank'}
                    onPress={() => setSublistPreset('blank')}
                  />
                  <SublistPresetButton
                    label="Tracking"
                    active={sublistPreset === 'tracking'}
                    onPress={() => setSublistPreset('tracking')}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    const trimmed = sublistTitle.trim();
                    if (!trimmed) {
                      return;
                    }
                    void (async () => {
                      const sublistId = await createList(trimmed, sublistPreset, {
                        showInMyLists: false,
                        parentListId: list.id,
                      });
                      if (!sublistId) {
                        return;
                      }
                      await addEntryToList(list.id, {
                        title: trimmed,
                        type: 'list',
                        detailPath: `list/${sublistId}`,
                        linkedListId: sublistId,
                        sourceRef: { source: 'custom', detailPath: `list/${sublistId}` },
                      });
                      setNewSublistVisible(false);
                      setSublistTitle('');
                    })();
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.84 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
                    Create sublist
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={configVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setConfigVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setConfigVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.9,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setConfigVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  Configure list
                </ThemedText>
                <Pressable
                  onPress={() => {
                    if (!draftConfig) {
                      return;
                    }
                    updateList(list.id, { config: draftConfig });
                    setConfigVisible(false);
                  }}
                  style={styles.sheetHeaderButton}
                >
                  <IconSymbol name="checkmark" size={24} color={colors.tint} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {draftConfig ? (
                  <ListConfigurationEditor config={draftConfig} onChange={setDraftConfig} />
                ) : null}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={templateVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setTemplateVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setTemplateVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.45,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setTemplateVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  Save as template
                </ThemedText>
                <View style={styles.sheetHeaderButton} />
              </View>
              <View style={styles.sheetBody}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Template title"
                  placeholderTextColor={colors.icon}
                  value={templateTitle}
                  onChangeText={setTemplateTitle}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Template description"
                  placeholderTextColor={colors.icon}
                  value={templateDescription}
                  onChangeText={setTemplateDescription}
                />
                <Pressable
                  onPress={() => {
                    if (!templateTitle.trim()) {
                      return;
                    }
                    saveListAsTemplate(list.id, {
                      title: templateTitle.trim(),
                      description: templateDescription.trim() || `${list.title} setup`,
                    });
                    setTemplateVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.84 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
                    Save template
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    </>
  );
}

function filterEntriesByQuery(entries: ListEntry[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.type,
      entry.status,
      entry.detailPath,
      entry.productUrl,
      ...entry.tags,
      ...(entry.customFields ?? []).flatMap((field) => [field.title, field.value]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function EntryRow({
  colors,
  entry,
  hasToggle,
  isIos,
  supportsLiquidGlass,
  onOpenEntry,
  onOpenEntryUrl,
  onToggleChecked,
  renderEntryTags,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  entry: ListEntry;
  hasToggle: boolean;
  isIos: boolean;
  supportsLiquidGlass: boolean;
  onOpenEntry: (entry: ListEntry) => void;
  onOpenEntryUrl: (entry: ListEntry) => Promise<void>;
  onToggleChecked: (entry: ListEntry) => void;
  renderEntryTags: (tags: string[]) => ReactNode;
}) {
  const itemImageUrl = getEntryImageUrl(entry);

  return (
    <ListRowSurface
      colors={colors}
      enabled={isIos}
      supportsLiquidGlass={supportsLiquidGlass}
    >
      {hasToggle ? (
        <Pressable
          onPress={() => onToggleChecked(entry)}
          style={[
            styles.checkbox,
            {
              borderColor: entry.checked ? colors.tint : colors.icon + '45',
              backgroundColor: entry.checked ? colors.tint : 'transparent',
            },
          ]}
        >
          {entry.checked ? (
            <IconSymbol name="checkmark" size={14} color={colors.background} />
          ) : null}
        </Pressable>
      ) : null}
      <Pressable onPress={() => onOpenEntry(entry)} style={styles.rowMain}>
        {itemImageUrl || entry.sourceRef.source === 'anime' || entry.sourceRef.source === 'manga' ? (
          <ThumbnailImage
            imageUrl={itemImageUrl}
            sourceRef={entry.sourceRef}
            detailPath={entry.detailPath}
            style={styles.rowImage}
          />
        ) : null}
        <View style={styles.rowInfo}>
          <ThemedText style={styles.rowTitle} numberOfLines={2}>
            {entry.title}
          </ThemedText>
          {renderEntryTags(entry.tags)}
        </View>
      </Pressable>
      {entry.productUrl?.trim() ? (
        <Pressable
          accessibilityLabel={`Open ${entry.title} link`}
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => void onOpenEntryUrl(entry)}
          style={({ pressed }) => [
            styles.rowLinkButton,
            { opacity: pressed ? 0.68 : 1 },
          ]}
        >
          <IconSymbol name="link" size={18} color={colors.tint} />
        </Pressable>
      ) : null}
    </ListRowSurface>
  );
}

function DraggableEntryRow({
  colors,
  entry,
  hasToggle,
  isDragging,
  isIos,
  showBottomSpacing,
  supportsLiquidGlass,
  onDragEnd,
  onDragMove,
  onDragStart,
  onLayout,
  onOpenEntry,
  onOpenEntryUrl,
  onToggleChecked,
  renderRightActions,
  renderEntryTags,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  entry: ListEntry;
  hasToggle: boolean;
  isDragging: boolean;
  isIos: boolean;
  showBottomSpacing: boolean;
  supportsLiquidGlass: boolean;
  onDragEnd: () => void;
  onDragMove: (entryId: string, translationX: number, translationY: number) => void;
  onDragStart: (
    entryId: string,
    touchOffsetX: number,
    touchOffsetY: number,
    absoluteX: number,
    absoluteY: number
  ) => void;
  onLayout: (entryId: string, layout: RowLayout) => void;
  onOpenEntry: (entry: ListEntry) => void;
  onOpenEntryUrl: (entry: ListEntry) => Promise<void>;
  onToggleChecked: (entry: ListEntry) => void;
  renderRightActions: (progress: RNAnimated.AnimatedInterpolation<number>) => ReactNode;
  renderEntryTags: (tags: string[]) => ReactNode;
}) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(220)
        .failOffsetX([-DRAG_SWIPE_FAIL_OFFSET_X, DRAG_SWIPE_FAIL_OFFSET_X])
        .onStart((event) => {
          runOnJS(onDragStart)(entry.id, event.x, event.y, event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          runOnJS(onDragMove)(entry.id, event.translationX, event.translationY);
        })
        .onFinalize(() => {
          runOnJS(onDragEnd)();
        }),
    [entry.id, onDragEnd, onDragMove, onDragStart]
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={LinearTransition.springify().damping(14).stiffness(240).mass(0.55)}
        onLayout={(event) =>
          onLayout(entry.id, {
            height: event.nativeEvent.layout.height,
            width: event.nativeEvent.layout.width,
          })
        }
        pointerEvents={isDragging ? 'none' : 'auto'}
        style={isDragging ? styles.hiddenRow : showBottomSpacing ? styles.rowWithSpacing : undefined}
      >
        {isDragging ? null : (
          <Swipeable
            containerStyle={styles.swipeableContainer}
            childrenContainerStyle={styles.swipeableChildren}
            overshootRight={false}
            rightThreshold={56}
            renderRightActions={renderRightActions}
          >
            <EntryRow
              colors={colors}
              entry={entry}
              hasToggle={hasToggle}
              isIos={isIos}
              supportsLiquidGlass={supportsLiquidGlass}
              onOpenEntry={onOpenEntry}
              onOpenEntryUrl={onOpenEntryUrl}
              onToggleChecked={onToggleChecked}
              renderEntryTags={renderEntryTags}
            />
          </Swipeable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function SelectionMenu({
  visible,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.menuCard,
            { backgroundColor: colors.background, borderColor: colors.icon + '30' },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText type="subtitle">{title}</ThemedText>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.menuOption,
                {
                  opacity: pressed ? 0.75 : 1,
                  backgroundColor:
                    selectedValue === option.value ? colors.tint + '14' : 'transparent',
                },
              ]}
            >
              <ThemedText>{option.label}</ThemedText>
              {selectedValue === option.value ? (
                <IconSymbol name="checkmark" size={18} color={colors.tint} />
              ) : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CompareView({ entries, bottomInset }: { entries: ListEntry[]; bottomInset: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fieldTitles = Array.from(
    new Set(entries.flatMap((entry) => (entry.customFields ?? []).map((field) => field.title.trim())))
  ).filter(Boolean);
  if (!entries.length || !fieldTitles.length) {
    return (
      <View style={styles.centered}>
        <ThemedText style={{ color: colors.icon }}>
          No items with custom fields to compare.
        </ThemedText>
      </View>
    );
  }
  return (
    <ScrollView horizontal contentContainerStyle={{ paddingBottom: bottomInset }} style={styles.compareContainer}>
      <View style={[styles.compareTable, { borderColor: colors.icon + '35' }]}>
        <View
          style={[
            styles.compareRow,
            styles.compareHeaderRow,
            { borderBottomColor: colors.icon + '35' },
          ]}
        >
          <View style={[styles.compareCell, styles.compareTitleColumn]}>
            <ThemedText style={styles.compareHeaderText}>Title</ThemedText>
          </View>
          {fieldTitles.map((title) => (
            <View key={title} style={styles.compareCell}>
              <ThemedText style={styles.compareHeaderText}>{title}</ThemedText>
            </View>
          ))}
        </View>
        {entries.map((entry) => (
          <View key={entry.id} style={[styles.compareRow, { borderBottomColor: colors.icon + '25' }]}>
            <View style={[styles.compareCell, styles.compareTitleColumn]}>
              <ThemedText numberOfLines={2}>{entry.title}</ThemedText>
            </View>
            {fieldTitles.map((fieldTitle) => (
              <View key={fieldTitle} style={styles.compareCell}>
                <ThemedText numberOfLines={2}>
                  {entry.customFields?.find((field) => field.title.trim() === fieldTitle)?.value || '-'}
                </ThemedText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function TierView({
  tierRows,
  onOpenEntry,
  bottomInset,
}: {
  tierRows: { id: string; title: string; color: string; list: { entries: ListEntry[] } | null }[];
  onOpenEntry: (entry: ListEntry) => void;
  bottomInset: number;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  if (!tierRows.length) {
    return (
      <View style={styles.centered}>
        <ThemedText style={{ color: colors.icon }}>
          No sublists to show as tiers. Create one from the view menu.
        </ThemedText>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={[styles.tierContent, { paddingBottom: bottomInset }]}>
      {tierRows.map((tier) => (
        <View key={tier.id} style={[styles.tierRow, { borderBottomColor: colors.icon + '25' }]}>
          <View
            style={[
              styles.tierLabel,
              { backgroundColor: tier.color, borderRightColor: colors.icon + '25' },
            ]}
          >
            <ThemedText style={styles.tierLabelText}>{tier.title}</ThemedText>
          </View>
          <ScrollView
            horizontal
            contentContainerStyle={styles.tierItems}
            showsHorizontalScrollIndicator={false}
          >
            {(tier.list?.entries ?? []).map((entry) => (
              <Pressable key={entry.id} onPress={() => onOpenEntry(entry)} style={styles.tierItem}>
                <ThumbnailImage
                  imageUrl={entry.imageUrl}
                  sourceRef={entry.sourceRef}
                  detailPath={entry.detailPath}
                  style={styles.tierImage}
                />
                <ThemedText numberOfLines={2} style={styles.tierItemTitle}>
                  {entry.title}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

function SublistPresetButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sublistPresetButton,
        {
          borderColor: colors.icon + '30',
          backgroundColor: active ? colors.tint + '18' : colors.icon + '10',
        },
      ]}
    >
      <ThemedText style={{ color: active ? colors.tint : colors.text }}>{label}</ThemedText>
    </Pressable>
  );
}

function SwipeActionButton({
  backgroundColor,
  icon,
  iconColor,
  isIos,
  onPress,
}: {
  backgroundColor: string;
  icon: 'info.circle.fill' | 'trash.fill';
  iconColor: string;
  isIos: boolean;
  onPress: () => void;
}) {
  const circle = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.swipeActionPressable, { opacity: pressed ? 0.78 : 1 }]}
    >
      <View style={[styles.swipeActionFill, { backgroundColor }]}>
        <IconSymbol name={icon} size={20} color={iconColor} />
      </View>
    </Pressable>
  );

  if (!isIos) {
    return circle;
  }

  if (isGlassEffectAPIAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive style={styles.swipeActionSurface}>
        {circle}
      </GlassView>
    );
  }

  return (
    <View style={styles.swipeActionSurface}>
      <BlurView intensity={75} tint="systemMaterial" style={styles.swipeActionBlur}>
        {circle}
      </BlurView>
    </View>
  );
}

function ListRowSurface({
  children,
  colors,
  enabled,
  supportsLiquidGlass,
}: {
  children: ReactNode;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  enabled: boolean;
  supportsLiquidGlass: boolean;
}) {
  if (!enabled) {
    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={[styles.rowBackgroundClip, styles.rowFallbackSurface, { borderColor: colors.icon + '14' }]} />
        <View style={styles.rowContent}>{children}</View>
      </View>
    );
  }

  if (supportsLiquidGlass) {
    return (
      <View style={styles.row}>
        <GlassView glassEffectStyle="regular" style={styles.rowBackgroundClip} />
        <View style={styles.rowContent}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <BlurView
        intensity={90}
        tint="systemMaterial"
        style={[
          styles.rowBackgroundClip,
          styles.rowFallbackSurface,
          {
            backgroundColor: colors.background + 'B8',
            borderColor: colors.icon + '18',
          },
        ]}
      />
      <View style={styles.rowContent}>{children}</View>
    </View>
  );
}

function labelForSort(value: ListSortMode) {
  return value === 'manual'
    ? 'Custom Order'
    : value === 'updated-desc'
      ? 'Recent'
      : value === 'title-asc'
        ? 'A-Z'
        : value === 'rating-desc'
          ? 'Rating'
          : 'Status';
}

function labelForFilter(value: ListFilterMode) {
  return value === 'all'
    ? 'All'
    : value === 'completed'
      ? 'Completed'
      : value === 'active'
        ? 'Active'
        : value === 'planned'
          ? 'Planned'
          : value === 'paused'
            ? 'Paused'
            : value === 'dropped'
              ? 'Dropped'
              : 'Archived';
}

function getEntryImageUrl(entry: Pick<ListEntry, 'coverAssetUri' | 'imageUrl'>): null | string {
  const imageUrl = entry.coverAssetUri ?? entry.imageUrl;
  return typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  contentLayer: {
    flex: 1,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { padding: 6, marginHorizontal: 6 },
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  nativeSearchToolbarWrap: {
    borderRadius: 16,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  nativeSearchToolbarInput: {
    fontSize: 16,
    height: 36,
    paddingVertical: 0,
  },
  bottomToolbarOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  bottomToolbar: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    boxShadow: '0 12px 28px rgba(6, 16, 31, 0.14)',
    flexDirection: 'row',
    left: 16,
    minHeight: BOTTOM_TOOLBAR_HEIGHT,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 16,
  },
  bottomToolbarButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  bottomToolbarSpacer: {
    flex: 1,
  },
  expandedSearchBar: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 40,
  },
  expandedSearchIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  expandedSearchField: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 12,
  },
  expandedSearchInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 40,
    paddingVertical: 0,
  },
  listTagSection: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  listTagLabel: { fontSize: 13 },
  listTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listTagChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  listViewport: {
    flex: 1,
    position: 'relative',
  },
  listContent: { flexGrow: 1, paddingHorizontal: 12 },
  swipeableContainer: {
    overflow: 'visible',
  },
  swipeableChildren: {
    overflow: 'visible',
  },
  rowWithSpacing: {
    marginBottom: ENTRY_ROW_GAP,
  },
  row: {
    position: 'relative',
    width: '100%',
    minHeight: 88,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowBackgroundClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
  },
  rowFallbackSurface: {
    borderWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  rowMain: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowImage: { width: 56, height: 72, borderRadius: 14 },
  rowInfo: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 6 },
  rowLinkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  hiddenRow: {
    height: 0,
    marginBottom: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  entryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    minHeight: 24,
  },
  entryTagChip: {
    maxWidth: 120,
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entryOverflowChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entryTagText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  rightActionContainer: {
    width: 132,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  swipeActionSurface: {
    width: 54,
    height: 54,
    borderRadius: 999,
    overflow: 'hidden',
  },
  swipeActionBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionPressable: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeActionFill: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropIndicator: {
    borderRadius: 999,
    height: DROP_INDICATOR_HEIGHT,
    left: 24,
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  dragOverlay: {
    left: 0,
    position: 'absolute',
    top: 0,
    zIndex: 20,
  },
  gridContent: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '48%' },
  gridImage: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  gridTitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  gridMeta: { fontSize: 12, marginTop: 3 },
  placeholder: { paddingTop: 24, fontSize: 15 },
  composerFooter: { paddingTop: 14, gap: 10 },
  pendingMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pendingChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composerCard: {
    paddingHorizontal: 8,
    borderRadius: 50,
  },
  composerInput: {
    fontSize: 16,
    paddingVertical: 12,
  },
  compareContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12 },
  compareTable: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 24 },
  compareRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  compareHeaderRow: { borderBottomWidth: 1 },
  compareCell: { minWidth: 140, paddingHorizontal: 14, paddingVertical: 12 },
  compareTitleColumn: { minWidth: 180 },
  compareHeaderText: { fontSize: 14, fontWeight: '700' },
  tierContent: { flexGrow: 1, paddingTop: 8, paddingBottom: 24 },
  tierRow: { flexDirection: 'row', minHeight: 112, borderBottomWidth: StyleSheet.hairlineWidth },
  tierLabel: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  tierLabelText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  tierItems: {
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tierItem: { width: 72 },
  tierImage: { width: 72, height: 102, borderRadius: 6 },
  tierItemTitle: { fontSize: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  nativeSheetContainer: {
    flex: 1,
  },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderButton: { minWidth: 44, padding: 8, alignItems: 'center' },
  sheetTitle: { flex: 1, textAlign: 'center' },
  sheetBody: { flex: 1, flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  sheetList: { flex: 1 },
  sheetListContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  sublistPresetRow: { flexDirection: 'row', gap: 10 },
  sublistPresetButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 10 },
  menuOption: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
