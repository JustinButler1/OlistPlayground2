import { useHeaderHeight } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, Animated as RNAnimated, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { FilterSortControlRow } from '@/components/tracker/filter-sort-control-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import type { TrackerList } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SortMode = 'custom-order' | 'updated-desc' | 'title-asc';
type FilterMode = 'all' | 'progress' | 'sublists';
type ViewMode = 'rows' | 'grid';
type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];

type RowLayout = {
  height: number;
  width: number;
};

type DragState = {
  item: TrackerList;
  listId: string;
  originalIndex: number;
  targetIndex: number;
  rowWidth: number;
};

const DROP_INDICATOR_COLOR = '#2563EB';
const DROP_INDICATOR_HEIGHT = 3;
const DRAG_THUMBNAIL_ANCHOR_X = 34;
const LIST_CONTENT_TOP_PADDING = 16;
const AUTO_SCROLL_EDGE_THRESHOLD = 96;
const AUTO_SCROLL_MAX_STEP = 18;
const DRAG_LIFT_DURATION_MS = 5;
const DRAG_RELEASE_DURATION_MS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getListSortOrder(list: TrackerList, fallbackIndex: number): number {
  return typeof list.sortOrder === 'number' ? list.sortOrder : (fallbackIndex + 1) * 1_000;
}

function applyOrderedIds(items: TrackerList[], orderedIds: string[] | null): TrackerList[] {
  if (!orderedIds?.length) {
    return items;
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const orderedItems = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is TrackerList => item !== undefined);

  if (orderedItems.length === items.length) {
    return orderedItems;
  }

  return [
    ...orderedItems,
    ...items.filter((item) => !orderedIds.includes(item.id)),
  ];
}

function moveListIdToIndex(ids: string[], draggedId: string, targetIndex: number): string[] {
  const nextIds = ids.filter((id) => id !== draggedId);
  const boundedIndex = Math.max(0, Math.min(targetIndex, nextIds.length));
  nextIds.splice(boundedIndex, 0, draggedId);
  return nextIds;
}

function getHoverTargetIndex(
  items: TrackerList[],
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

    cursor += layout.height;
  }

  return otherItems.length;
}

function getDropIndicatorTop(
  items: TrackerList[],
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

    if (index === targetIndex) {
      return cursor;
    }

    cursor += layout.height;
  }

  if (targetIndex >= otherItems.length) {
    return cursor;
  }

  return cursor;
}

export default function MyListsScreen() {
  const router = useRouter();
  const isIos = process.env.EXPO_OS === 'ios';
  const supportsLiquidGlass = isIos && isGlassEffectAPIAvailable();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { deleteList, reorderLists } = useListActions();
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [menuVisible, setMenuVisible] = useState<null | 'header' | 'sort' | 'filter'>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [optimisticListOrderIds, setOptimisticListOrderIds] = useState<string[] | null>(null);
  const flatListRef = useRef<FlatList<TrackerList> | null>(null);
  const listViewportRef = useRef<View | null>(null);
  const listViewportWidthRef = useRef(0);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const itemsRef = useRef<TrackerList[]>([]);
  const dragStateRef = useRef<DragState | null>(null);
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
  const dragLeft = useSharedValue(0);
  const dragTop = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const scrollOffsetValue = useSharedValue(0);
  const canDragRows = viewMode === 'rows' && !isEditMode && filterMode === 'all';

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const persistedOrderedLists = useMemo(() => {
    const fallbackIndexById = new Map(
      activeLists
        .filter((list) => !list.archivedAt && list.showInMyLists)
        .map((list, index) => [list.id, index])
    );
    const nextLists = activeLists
      .filter((list) => !list.archivedAt && list.showInMyLists)
      .slice()
      .sort(
        (left, right) =>
          getListSortOrder(left, fallbackIndexById.get(left.id) ?? 0) -
          getListSortOrder(right, fallbackIndexById.get(right.id) ?? 0)
      );
    return nextLists;
  }, [activeLists]);

  const orderedLists = useMemo(
    () => applyOrderedIds(persistedOrderedLists, optimisticListOrderIds),
    [optimisticListOrderIds, persistedOrderedLists]
  );

  const items = useMemo(() => {
    const filtered = orderedLists.filter((list) => {
      if (list.archivedAt || !list.showInMyLists) {
        return false;
      }
      if (filterMode === 'progress') {
        return list.config.addons.includes('progress');
      }
      if (filterMode === 'sublists') {
        return list.config.addons.includes('sublists');
      }
      return true;
    });

    const nextItems = [...filtered];
    if (sortMode === 'title-asc') {
      nextItems.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === 'updated-desc') {
      nextItems.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return nextItems;
  }, [filterMode, orderedLists, sortMode]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const orderedIds = persistedOrderedLists.map((list) => list.id);
    setOptimisticListOrderIds((current) => {
      if (!current?.length) {
        return current;
      }

      if (current.length === orderedIds.length && current.every((id, index) => id === orderedIds[index])) {
        return null;
      }

      const nextIds = current.filter((id) => orderedIds.includes(id));
      if (!nextIds.length) {
        return null;
      }

      for (const id of orderedIds) {
        if (!nextIds.includes(id)) {
          nextIds.push(id);
        }
      }

      return nextIds;
    });
  }, [persistedOrderedLists]);

  useEffect(() => {
    if (canDragRows) {
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
    dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
  }, [canDragRows, dragLeft, dragScale]);

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
    (listId: string, nextTargetIndex: number) => {
      setDragState((current) => {
        if (!current || current.listId !== listId || current.targetIndex === nextTargetIndex) {
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
        const measuredContentHeight = listContentHeightRef.current;
        const estimatedRowHeight =
          dragMeta.rowHeight || rowLayoutsRef.current[activeDrag.listId]?.height || 104;
        const estimatedContentHeight =
          LIST_CONTENT_TOP_PADDING +
          insets.bottom +
          24 +
          itemsRef.current.reduce(
            (total, item) => total + (rowLayoutsRef.current[item.id]?.height ?? estimatedRowHeight),
            0
          );
        const contentHeight = Math.max(measuredContentHeight, estimatedContentHeight);
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
        flatListRef.current?.scrollToOffset({
          animated: false,
          offset: nextScrollOffset,
        });

        const hoverMiddleY =
          dragPositionRef.current.top +
          nextScrollOffset -
          LIST_CONTENT_TOP_PADDING +
          dragMeta.rowHeight / 2;
        const nextTargetIndex = getHoverTargetIndex(
          itemsRef.current,
          activeDrag.listId,
          hoverMiddleY,
          rowLayoutsRef.current
        );
        updateDragTarget(activeDrag.listId, nextTargetIndex);

        tick();
      });
    };

    tick();
  }, [insets.bottom, scrollOffsetValue, stopAutoScroll, updateDragTarget]);

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

  const openNewListRoute = useCallback(() => {
    router.push({
      pathname: '/my-lists/new-list',
      params: { sessionId: `${Date.now()}` },
    });
  }, [router]);

  const openListDetail = useCallback(
    (item: TrackerList) => {
      router.push({
        pathname: '/list/[id]',
        params: { id: item.id, title: item.title },
      });
    },
    [router]
  );

  const enterEditMode = useCallback(() => {
    setMenuVisible(null);
    setSelectedListIds([]);
    setIsEditMode(true);
  }, []);

  const exitEditMode = useCallback(() => {
    setMenuVisible(null);
    setSelectedListIds([]);
    setIsEditMode(false);
  }, []);

  const toggleListSelection = useCallback((listId: string) => {
    setSelectedListIds((current) =>
      current.includes(listId)
        ? current.filter((currentId) => currentId !== listId)
        : [...current, listId]
    );
  }, []);

  const confirmDeleteList = useCallback(
    (item: TrackerList) => {
      const runDelete = () => {
        void deleteList(item.id);
      };
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
          runDelete();
        }
        return;
      }

      Alert.alert('Delete list?', `Delete "${item.title}" and its items? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ]);
    },
    [deleteList]
  );

  const confirmDeleteSelectedLists = useCallback(() => {
    const selectedLists = activeLists.filter((list) => selectedListIds.includes(list.id));
    if (!selectedLists.length) {
      return;
    }

    const runDelete = async () => {
      await Promise.all(selectedLists.map((list) => deleteList(list.id)));
      exitEditMode();
    };

    const title =
      selectedLists.length === 1 ? 'Delete selected list?' : `Delete ${selectedLists.length} lists?`;
    const message =
      selectedLists.length === 1
        ? `Delete "${selectedLists[0]?.title}" and its items? This cannot be undone.`
        : `Delete ${selectedLists.length} selected lists and their items? This cannot be undone.`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void runDelete();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  }, [activeLists, deleteList, exitEditMode, selectedListIds]);

  const openPinDialog = useCallback((item: TrackerList) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`Pin "${item.title}"\n\nPin to Quick Access\nPin to Profile`);
      return;
    }

    Alert.alert('Pin list', `Choose where to pin "${item.title}".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pin to Quick Access' },
      { text: 'Pin to Profile' },
    ]);
  }, []);

  const registerRowLayout = useCallback((listId: string, layout: RowLayout) => {
    rowLayoutsRef.current[listId] = layout;
  }, []);

  const startRowDrag = useCallback(
    (
      listId: string,
      touchOffsetX: number,
      touchOffsetY: number,
      absoluteX: number,
      absoluteY: number
    ) => {
      if (!canDragRows) {
        return;
      }

      const item = items.find((candidate) => candidate.id === listId);
      const viewport = listViewportRef.current;
      const activeLayout = rowLayoutsRef.current[listId];
      if (!item || !viewport || !activeLayout) {
        return;
      }

      viewport.measureInWindow((viewportX, viewportY) => {
        const viewportWidth = listViewportWidthRef.current || activeLayout.width;
        const fingerXInViewport = absoluteX - viewportX;
        const fingerYInViewport = absoluteY - viewportY;
        const maxLeft = Math.max(0, viewportWidth - activeLayout.width);
        const thumbnailOffset =
          touchOffsetX <= activeLayout.width ? DRAG_THUMBNAIL_ANCHOR_X : touchOffsetX;
        const initialLeft = clamp(fingerXInViewport - thumbnailOffset, 0, maxLeft);
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
        setMenuVisible(null);
        const originalIndex = items.findIndex((candidate) => candidate.id === listId);
        lastDragTargetIndexRef.current = originalIndex;
        setDragState({
          item,
          listId,
          originalIndex,
          targetIndex: originalIndex,
          rowWidth: activeLayout.width,
        });
        updateAutoScroll(fingerYInViewport);
        triggerDragStartHaptic();
      });
    },
    [canDragRows, dragLeft, dragScale, dragTop, items, triggerDragStartHaptic, updateAutoScroll]
  );

  const updateRowDrag = useCallback(
    (listId: string, translationX: number, translationY: number) => {
      const activeDrag = dragState?.listId === listId ? dragState : null;
      const dragMeta = dragMetaRef.current;
      if (!activeDrag || !dragMeta) {
        return;
      }

      const nextLeft = clamp(dragMeta.initialLeft + translationX, 0, dragMeta.maxLeft);
      const nextTop = dragMeta.initialTop + translationY;
      const fingerYInViewport = nextTop + dragMeta.touchOffsetY;
      const hoverMiddleY =
        nextTop + scrollOffsetRef.current - LIST_CONTENT_TOP_PADDING + dragMeta.rowHeight / 2;
      const nextTargetIndex = getHoverTargetIndex(items, listId, hoverMiddleY, rowLayoutsRef.current);
      dragPositionRef.current = {
        left: nextLeft,
        top: nextTop,
      };
      dragLeft.value = nextLeft;
      dragTop.value = nextTop;
      updateAutoScroll(fingerYInViewport);

      if (nextTargetIndex !== activeDrag.targetIndex) {
        updateDragTarget(listId, nextTargetIndex);
      }
    },
    [dragLeft, dragState, dragTop, items, updateAutoScroll, updateDragTarget]
  );

  const finishRowDrag = useCallback(() => {
    const activeDrag = dragState;
    if (!activeDrag) {
      stopAutoScroll();
      dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
      return;
    }

    if (activeDrag.targetIndex === activeDrag.originalIndex) {
      stopAutoScroll();
      dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
      setDragState(null);
      dragMetaRef.current = null;
      dragPositionRef.current = { left: 0, top: 0 };
      lastDragTargetIndexRef.current = null;
      triggerDragEndHaptic();
      return;
    }

    const currentIds = items.map((item) => item.id);
    const reorderedIds = moveListIdToIndex(currentIds, activeDrag.listId, activeDrag.targetIndex);
    const previousOrderedIds = persistedOrderedLists.map((item) => item.id);
    const previousSortMode = sortMode;

    stopAutoScroll();
    dragScale.value = withTiming(1, { duration: DRAG_RELEASE_DURATION_MS });
    setOptimisticListOrderIds(reorderedIds);
    setSortMode('custom-order');
    setDragState(null);
    dragMetaRef.current = null;
    dragPositionRef.current = { left: 0, top: 0 };
    lastDragTargetIndexRef.current = null;
    triggerDragEndHaptic();

    void reorderLists(reorderedIds).catch(() => {
      setOptimisticListOrderIds(previousOrderedIds);
      setSortMode(previousSortMode);
    });
  }, [
    dragScale,
    dragState,
    items,
    persistedOrderedLists,
    reorderLists,
    sortMode,
    stopAutoScroll,
    triggerDragEndHaptic,
  ]);

  const renderDeleteAction = useCallback(
    (progress: RNAnimated.AnimatedInterpolation<number>, onDelete: () => void) => {
      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return (
        <RNAnimated.View style={[styles.swipeActionContainer, { opacity }]}>
          <SwipeActionButton
            backgroundColor="#C62828"
            icon="trash.fill"
            iconColor="#fff"
            isIos={isIos}
            onPress={onDelete}
          />
        </RNAnimated.View>
      );
    },
    [isIos]
  );

  const renderPinAction = useCallback(
    (progress: RNAnimated.AnimatedInterpolation<number>, onPin: () => void) => {
      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return (
        <RNAnimated.View style={[styles.swipeActionContainer, { opacity }]}>
          <SwipeActionButton
            backgroundColor={colors.tint}
            icon="pin.fill"
            iconColor="#fff"
            isIos={isIos}
            onPress={onPin}
          />
        </RNAnimated.View>
      );
    },
    [colors.tint, isIos]
  );

  const selectedSortLabel =
    sortMode === 'custom-order' ? 'Custom Order' : sortMode === 'updated-desc' ? 'Recent' : 'A-Z';
  const selectedFilterLabel =
    filterMode === 'all' ? 'All Lists' : filterMode === 'progress' ? 'Progress' : 'Sublists';
  const isGridView = viewMode === 'grid';
  const selectedListIdSet = useMemo(() => new Set(selectedListIds), [selectedListIds]);
  const hasSelectedLists = selectedListIds.length > 0;
  const dragIndicatorTop = dragState
    ? getDropIndicatorTop(items, dragState.listId, dragState.targetIndex, rowLayoutsRef.current)
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
          LIST_CONTENT_TOP_PADDING -
          DROP_INDICATOR_HEIGHT / 2,
      },
    ],
    opacity: dragIndicatorTop === null ? 0 : 1,
  }));

  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          headerLeft:
            isIos || !isEditMode
              ? undefined
              : () => (
                <Pressable
                  accessibilityLabel="Delete selected lists"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !hasSelectedLists }}
                  disabled={!hasSelectedLists}
                  hitSlop={8}
                  onPress={confirmDeleteSelectedLists}
                  style={({ pressed }) => [
                    styles.headerLeftButton,
                    {
                      opacity: !hasSelectedLists ? 0.35 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.headerLeftButtonText, { color: '#C62828' }]}>
                    Delete
                  </ThemedText>
                </Pressable>
              ),
          headerRight: isIos
            ? undefined
            : () => (
              <View style={styles.headerRightActions}>
                <Pressable
                  onPress={openNewListRoute}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add list"
                >
                  <IconSymbol name="plus" size={26} color={colors.tint} />
                </Pressable>
                <Pressable
                  onPress={isEditMode ? exitEditMode : () => setMenuVisible('header')}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={isEditMode ? 'Done editing lists' : 'Open lists menu'}
                >
                  <IconSymbol
                    name={isEditMode ? 'checkmark' : 'ellipsis'}
                    size={24}
                    color={colors.tint}
                  />
                </Pressable>
              </View>
            ),
        }}
      />
      {isIos ? (
        <>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              hidden={!isEditMode}
              disabled={!hasSelectedLists}
              tintColor="#C62828"
              onPress={confirmDeleteSelectedLists}
            >
              Delete
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button icon="plus" onPress={openNewListRoute} />
            <Stack.Toolbar.Menu hidden={isEditMode} icon="ellipsis">
              <Stack.Toolbar.Menu title="View">
                <Stack.Toolbar.Menu inline>
                  <Stack.Toolbar.MenuAction
                    key="rows-view"
                    isOn={viewMode === 'rows'}
                    onPress={() => setViewMode('rows')}
                  >
                    Row view
                  </Stack.Toolbar.MenuAction>
                  <Stack.Toolbar.MenuAction
                    key="grid-view"
                    isOn={viewMode === 'grid'}
                    onPress={() => setViewMode('grid')}
                  >
                    Grid view
                  </Stack.Toolbar.MenuAction>
                </Stack.Toolbar.Menu>
              </Stack.Toolbar.Menu>
              <Stack.Toolbar.MenuAction key="edit-lists" onPress={enterEditMode}>
                Edit lists
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Button hidden={!isEditMode} icon="checkmark" onPress={exitEditMode} />
          </Stack.Toolbar>
        </>
      ) : null}
      <View style={[styles.contentLayer, { paddingTop: headerHeight }]}>
        <View style={styles.toolbar}>
          <FilterSortControlRow
            alignRight
            colors={colors}
            filterLabel={selectedFilterLabel}
            filterOptions={[
              { value: 'all', label: 'All lists' },
              { value: 'progress', label: 'Lists with progress' },
              { value: 'sublists', label: 'Lists with sublists' },
            ]}
            filterValue={filterMode}
            onFilterChange={(value) => setFilterMode(value as FilterMode)}
            onOpenFilter={() => setMenuVisible('filter')}
            onOpenSort={() => setMenuVisible('sort')}
            sortLabel={selectedSortLabel}
            sortOptions={[
              { value: 'custom-order', label: 'Custom Order' },
              { value: 'updated-desc', label: 'Recently updated' },
              { value: 'title-asc', label: 'Title A-Z' },
            ]}
            sortValue={sortMode}
            onSortChange={(value) => setSortMode(value as SortMode)}
          />
        </View>

        <View
          ref={listViewportRef}
          onLayout={(event) => {
            listViewportWidthRef.current = event.nativeEvent.layout.width;
            listViewportHeightRef.current = event.nativeEvent.layout.height;
          }}
          style={styles.listViewport}
        >
          <FlatList
            ref={flatListRef}
            key={viewMode}
            contentInsetAdjustmentBehavior="never"
            style={styles.container}
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={isGridView ? 2 : 1}
            columnWrapperStyle={isGridView ? styles.gridColumn : undefined}
            onScroll={(event) => {
              const nextScrollOffset = event.nativeEvent.contentOffset.y;
              scrollOffsetRef.current = nextScrollOffset;
              scrollOffsetValue.value = nextScrollOffset;
            }}
            onContentSizeChange={(_width, height) => {
              listContentHeightRef.current = height;
            }}
            scrollEnabled
            scrollEventThrottle={16}
            renderItem={({ item }) => {
              const isSelected = selectedListIdSet.has(item.id);

              if (isGridView) {
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={isEditMode ? { selected: isSelected } : undefined}
                    onLongPress={isEditMode ? undefined : () => confirmDeleteList(item)}
                    onPress={() => (isEditMode ? toggleListSelection(item.id) : openListDetail(item))}
                    style={({ pressed }) => [
                      styles.gridCard,
                      isEditMode ? styles.gridCardEditMode : null,
                      {
                        opacity: pressed ? 0.84 : 1,
                        borderColor: isEditMode && isSelected ? colors.tint : 'transparent',
                      },
                    ]}
                  >
                    <GridCardSurface colors={colors} supportsLiquidGlass={supportsLiquidGlass}>
                      {isEditMode ? (
                        <View style={styles.selectionIndicatorFloating}>
                          <SelectionIndicator color={colors.tint} selected={isSelected} />
                        </View>
                      ) : null}
                      <ThumbnailImage imageUrl={item.imageUrl} style={styles.gridPoster} />
                      <View style={styles.gridFooter}>
                        <ThemedText style={styles.gridTitle} numberOfLines={2}>
                          {item.title}
                        </ThemedText>
                        <View style={styles.countChevronGroup}>
                          <ThemedText
                            style={[styles.itemCount, { color: colors.icon }]}
                            numberOfLines={1}
                          >
                            {item.entries.length}
                          </ThemedText>
                          {!isEditMode ? (
                            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
                          ) : null}
                        </View>
                      </View>
                    </GridCardSurface>
                  </Pressable>
                );
              }

              if (isEditMode) {
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => toggleListSelection(item.id)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      styles.resultRowEditMode,
                      {
                        opacity: pressed ? 0.8 : 1,
                        borderColor: isSelected ? colors.tint : colors.icon + '20',
                        backgroundColor: isSelected ? colors.tint + '12' : colors.background + '72',
                      },
                    ]}
                  >
                    <SelectionIndicator color={colors.tint} selected={isSelected} />
                    <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultPoster} />
                    <View style={styles.resultInfo}>
                      <ThemedText style={styles.resultTitle} numberOfLines={2}>
                        {item.title}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.itemCount, { color: colors.icon }]} numberOfLines={1}>
                      {item.entries.length}
                    </ThemedText>
                  </Pressable>
                );
              }

              if (canDragRows) {
                return (
                  <DraggableListRow
                    colors={colors}
                    isDragging={dragState?.listId === item.id}
                    item={item}
                    onDragEnd={finishRowDrag}
                    onDragMove={updateRowDrag}
                    onDragStart={startRowDrag}
                    onLayout={registerRowLayout}
                    onPress={() => openListDetail(item)}
                  />
                );
              }

              return (
                <Swipeable
                  containerStyle={styles.swipeableContainer}
                  childrenContainerStyle={styles.swipeableChildren}
                  leftThreshold={40}
                  overshootRight={false}
                  overshootLeft={false}
                  rightThreshold={40}
                  renderLeftActions={(progress) => renderPinAction(progress, () => openPinDialog(item))}
                  renderRightActions={(progress) =>
                    renderDeleteAction(progress, () => confirmDeleteList(item))
                  }
                >
                  <Pressable
                    onPress={() => openListDetail(item)}
                    style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <ListRowContent colors={colors} item={item} />
                  </Pressable>
                </Swipeable>
              );
            }}
            ListEmptyComponent={
              <ThemedText style={styles.placeholder}>Tap + in the header to create a new list.</ThemedText>
            }
            contentContainerStyle={[
              styles.listContent,
              {
                paddingTop: LIST_CONTENT_TOP_PADDING,
                paddingBottom: insets.bottom + 24,
                flexGrow: 1,
              },
            ]}
            showsVerticalScrollIndicator={false}
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
              <View
                style={[
                  styles.dragOverlayCard,
                  {
                    backgroundColor: colors.background + 'EE',
                    borderColor: colors.icon + '22',
                    width: dragState.rowWidth,
                  },
                ]}
              >
                <View style={styles.resultRow}>
                  <ListRowContent colors={colors} item={dragState.item} />
                </View>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>

      {!isIos ? (
        <>
          <SelectionMenu
            visible={menuVisible === 'header'}
            title="List actions"
            options={[
              { value: 'rows', label: 'Row view' },
              { value: 'grid', label: 'Grid view' },
              { value: 'edit', label: 'Edit lists' },
            ]}
            selectedValue={viewMode}
            onClose={() => setMenuVisible(null)}
            onSelect={(value) => {
              if (value === 'edit') {
                enterEditMode();
                return;
              }
              setViewMode(value as ViewMode);
              setMenuVisible(null);
            }}
          />

          <SelectionMenu
            visible={menuVisible === 'sort'}
            title="Sort lists"
            options={[
              { value: 'custom-order', label: 'Custom Order' },
              { value: 'updated-desc', label: 'Recently updated' },
              { value: 'title-asc', label: 'Title A-Z' },
            ]}
            selectedValue={sortMode}
            onClose={() => setMenuVisible(null)}
            onSelect={(value) => {
              setSortMode(value as SortMode);
              setMenuVisible(null);
            }}
          />

          <SelectionMenu
            visible={menuVisible === 'filter'}
            title="Filter lists"
            options={[
              { value: 'all', label: 'All lists' },
              { value: 'progress', label: 'Lists with progress' },
              { value: 'sublists', label: 'Lists with sublists' },
            ]}
            selectedValue={filterMode}
            onClose={() => setMenuVisible(null)}
            onSelect={(value) => {
              setFilterMode(value as FilterMode);
              setMenuVisible(null);
            }}
          />

        </>
      ) : null}
    </TabRootBackground>
  );
}

function ListRowContent({
  colors,
  item,
  showChevron = true,
}: {
  colors: ThemeColors;
  item: TrackerList;
  showChevron?: boolean;
}) {
  return (
    <>
      <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultPoster} />
      <View style={styles.resultInfo}>
        <ThemedText style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
      </View>
      <View style={styles.countChevronGroup}>
        <ThemedText style={[styles.itemCount, { color: colors.icon }]} numberOfLines={1}>
          {item.entries.length}
        </ThemedText>
        {showChevron ? (
          <IconSymbol
            name="chevron.right"
            size={24}
            color={colors.icon}
            style={styles.resultChevron}
          />
        ) : null}
      </View>
    </>
  );
}

function DraggableListRow({
  colors,
  isDragging,
  item,
  onDragEnd,
  onDragMove,
  onDragStart,
  onLayout,
  onPress,
}: {
  colors: ThemeColors;
  isDragging: boolean;
  item: TrackerList;
  onDragEnd: () => void;
  onDragMove: (listId: string, translationX: number, translationY: number) => void;
  onDragStart: (
    listId: string,
    touchOffsetX: number,
    touchOffsetY: number,
    absoluteX: number,
    absoluteY: number
  ) => void;
  onLayout: (listId: string, layout: RowLayout) => void;
  onPress: () => void;
}) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(220)
        .onStart((event) => {
          runOnJS(onDragStart)(item.id, event.x, event.y, event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          runOnJS(onDragMove)(item.id, event.translationX, event.translationY);
        })
        .onFinalize(() => {
          runOnJS(onDragEnd)();
        }),
    [item.id, onDragEnd, onDragMove, onDragStart]
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={LinearTransition.springify().damping(14).stiffness(240).mass(0.55)}
        onLayout={(event) =>
          onLayout(item.id, {
            height: event.nativeEvent.layout.height,
            width: event.nativeEvent.layout.width,
          })
        }
        pointerEvents={isDragging ? 'none' : 'auto'}
        style={isDragging ? styles.hiddenRow : undefined}
      >
        <Pressable onPress={onPress} style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.82 : 1 }]}>
          <ListRowContent colors={colors} item={item} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function GridCardSurface({
  children,
  colors,
  supportsLiquidGlass,
}: {
  children: ReactNode;
  colors: ThemeColors;
  supportsLiquidGlass: boolean;
}) {
  return (
    <>
      {supportsLiquidGlass ? (
        <GlassView glassEffectStyle="regular" style={styles.gridCardSurfaceFill} />
      ) : (
        <BlurView
          intensity={85}
          tint="systemMaterial"
          style={[
            styles.gridCardSurfaceFill,
            {
              backgroundColor: colors.background + 'B8',
            },
          ]}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          styles.gridCardSurfaceBorder,
          {
            borderColor: colors.icon + '20',
          },
        ]}
      />
      <View style={styles.gridCardContent}>{children}</View>
    </>
  );
}

function SelectionIndicator({
  color,
  selected,
}: {
  color: string;
  selected: boolean;
}) {
  return (
    <View
      style={[
        styles.selectionIndicator,
        {
          borderColor: color,
          backgroundColor: selected ? color : 'transparent',
        },
      ]}
    >
      {selected ? <IconSymbol name="checkmark" size={14} color="#fff" /> : null}
    </View>
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
  icon: 'pin.fill' | 'trash.fill';
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
            {
              backgroundColor: colors.background,
              borderColor: colors.icon + '30',
            },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listViewport: {
    flex: 1,
  },
  contentLayer: {
    flex: 1,
  },
  headerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeftButton: {
    justifyContent: 'center',
    minHeight: 32,
  },
  headerLeftButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  placeholder: {
    paddingTop: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
  },
  hiddenRow: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  resultPoster: {
    borderRadius: 6,
    height: 96,
    width: 67,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultRowEditMode: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  resultChevron: {
    marginLeft: 2,
  },
  countChevronGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  itemCount: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'right',
    lineHeight: 15,
  },
  selectionIndicator: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  gridColumn: {
    gap: 12,
    justifyContent: 'space-between',
  },
  gridCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    marginBottom: 12,
    maxWidth: '48%',
    overflow: 'hidden',
    position: 'relative',
  },
  gridCardEditMode: {
    borderWidth: 2,
  },
  gridCardSurfaceFill: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCardSurfaceBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
  },
  gridCardContent: {
    padding: 10,
  },
  gridPoster: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    width: '100%',
  },
  gridFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 28,
    marginTop: 4,
  },
  selectionIndicatorFloating: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 2,
  },
  gridTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 15,
  },
  swipeableContainer: {
    overflow: 'visible',
  },
  swipeableChildren: {
    overflow: 'visible',
  },
  swipeActionContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: 72,
  },
  swipeActionSurface: {
    borderRadius: 999,
    height: 54,
    overflow: 'hidden',
    width: 54,
  },
  swipeActionBlur: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  swipeActionPressable: {
    alignItems: 'center',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  swipeActionFill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 20,
  },
  dragOverlayCard: {
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.18)',
  },
  menuOverlay: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  menuOption: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
