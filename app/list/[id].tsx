import type { HeaderSearchBarRef } from '@react-navigation/elements';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { CatalogSearchPanel } from '@/components/tracker/CatalogSearchPanel';
import { ComposerActionBar } from '@/components/tracker/composer-action-bar';
import { FilterSortControlRow } from '@/components/tracker/filter-sort-control-row';
import { ListConfigurationEditor } from '@/components/tracker/ListConfigurationEditor';
import { RatingStars } from '@/components/tracker/RatingStars';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import type { EntryDraft } from '@/contexts/lists-context';
import { useEntryActions, useListActions, useListPreferences, useListsQuery } from '@/contexts/lists-context';
import type { ItemUserData, ListEntry, ListFilterMode, ListPreset, ListSortMode, ListViewMode } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEffectiveEntryRating } from '@/lib/tracker-metadata';
import { formatProgressLabel, sortEntries } from '@/lib/tracker-selectors';

const TIER_COLORS = ['#2A1B60', '#3A227A', '#4E2899', '#5F34B0', '#1A5E85', '#139EC1', '#68C7DB'];
const COMPOSER_TOOLBAR_HEIGHT = 76;
const COMPOSER_TOOLBAR_OFFSET = 20;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isIos = process.env.EXPO_OS === 'ios';
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const listRef = useRef<FlatList<ListEntry>>(null);
  const composerInputRef = useRef<TextInput>(null);
  const headerSearchBarRef = useRef<HeaderSearchBarRef>(null);
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
  const { addEntryToList, deleteEntryFromList, setEntryChecked } = useEntryActions();
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
  const [pendingLinkUrl, setPendingLinkUrl] = useState('');
  const [listSearchVisible, setListSearchVisible] = useState(false);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [shouldFocusHeaderSearch, setShouldFocusHeaderSearch] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [tagSheetVisible, setTagSheetVisible] = useState(false);
  const [linkSheetVisible, setLinkSheetVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerAccessoryVisible, setComposerAccessoryVisible] = useState(false);
  const [composerInputMounted, setComposerInputMounted] = useState(false);
  const [composerFocusPending, setComposerFocusPending] = useState(false);

  const setComposerInputNode = useCallback((node: TextInput | null) => {
    composerInputRef.current = node;
    setComposerInputMounted(!!node);
  }, []);

  const collapseComposer = useCallback(() => {
    setComposerVisible(false);
    setComposerFocusPending(false);
    setComposerText('');
    setPendingTagsText('');
    setPendingLinkUrl('');
  }, []);

  useEffect(() => {
    if (list?.id) {
      markListOpened(list.id);
    }
  }, [list?.id, markListOpened]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      if (process.env.EXPO_OS !== 'ios' && !searchVisible && !tagSheetVisible && !linkSheetVisible) {
        collapseComposer();
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [collapseComposer, linkSheetVisible, searchVisible, tagSheetVisible]);

  const openComposer = useCallback(() => {
    if (preferences.viewMode !== 'list') {
      setListPreferences({ viewMode: 'list' });
    }
    setComposerVisible(true);
    setComposerFocusPending(true);
  }, [preferences.viewMode, setListPreferences]);

  const openListSearch = useCallback(() => {
    if (isIos) {
      setListSearchVisible(true);
      setShouldFocusHeaderSearch(true);
      return;
    }

    setListSearchVisible(true);
  }, [isIos]);

  useEffect(() => {
    if (!isIos || !shouldFocusHeaderSearch) {
      return;
    }

    const timeout = setTimeout(() => {
      headerSearchBarRef.current?.focus();
      setShouldFocusHeaderSearch(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [isIos, shouldFocusHeaderSearch]);

  const visibleEntries = useMemo(() => {
    if (!list) {
      return [];
    }
    return filterEntriesByQuery(
      sortEntries(list.entries, preferences, itemUserDataByKey),
      listSearchQuery
    );
  }, [itemUserDataByKey, list, listSearchQuery, preferences]);

  useEffect(() => {
    setDraftConfig(list?.config);
  }, [list?.config]);

  useEffect(() => {
    if (!composerVisible || preferences.viewMode !== 'list') {
      return;
    }

    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [composerVisible, preferences.viewMode, visibleEntries.length]);

  useEffect(() => {
    if (!composerVisible || preferences.viewMode !== 'list' || keyboardHeight <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [composerVisible, keyboardHeight, preferences.viewMode]);

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
      listRef.current?.scrollToEnd({ animated: true });
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

  function clearPendingComposerMetadata() {
    setPendingTagsText('');
    setPendingLinkUrl('');
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

    const trimmedLink = pendingLinkUrl.trim();
    const draft: EntryDraft = {
      title: trimmedTitle,
      type: trimmedLink ? 'link' : list.config.defaultEntryType ?? 'custom',
      tags: buildPendingTags(),
      productUrl: trimmedLink || undefined,
      sourceRef: {
        source: trimmedLink ? 'link' : 'custom',
        canonicalUrl: trimmedLink || undefined,
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
      const convertedTag = convertSublistToTag(list.id);
      if (convertedTag) {
        router.replace(`/list/${list.parentListId}` as never);
      }
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
    progress: Animated.AnimatedInterpolation<number>,
    entry: ListEntry
  ) => {
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.rightActionContainer, { opacity }]}>
        <Pressable
          onPress={() => openEntryMetadata(entry)}
          style={({ pressed }) => [
            styles.infoAction,
            { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <IconSymbol name="info.circle" size={18} color={colors.background} />
          <ThemedText style={[styles.actionText, { color: colors.background }]}>Info</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => confirmDeleteEntry(entry)}
          style={({ pressed }) => [
            styles.deleteAction,
            { backgroundColor: '#C62828', opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <IconSymbol name="trash" size={18} color="#fff" />
          <ThemedText style={styles.actionText}>Delete</ThemedText>
        </Pressable>
      </Animated.View>
    );
  };

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
  const footerSpacerHeight = composerVisible
    ? keyboardHeight + (isIos ? 24 : COMPOSER_TOOLBAR_HEIGHT + COMPOSER_TOOLBAR_OFFSET)
    : 28;
  const actionBarBottom = keyboardHeight > 0 ? keyboardHeight + 12 : insets.bottom + 16;

  return (
    <>
      <Stack.Screen
        options={{
          title: list.title,
          headerSearchBarOptions:
            isIos && listSearchVisible
              ? {
                ref: headerSearchBarRef,
                autoCapitalize: 'none',
                hideNavigationBar: false,
                hideWhenScrolling: false,
                obscureBackground: false,
                onCancelButtonPress: () => {
                  if (!listSearchQuery.trim()) {
                    setListSearchVisible(false);
                  }
                },
                onChangeText: (event) => {
                  setListSearchQuery(event.nativeEvent.text);
                },
                onClose: () => {
                  if (!listSearchQuery.trim()) {
                    setListSearchVisible(false);
                  }
                },
                onSearchButtonPress: (event) => {
                  setListSearchQuery(event.nativeEvent.text);
                },
                placeholder: 'Search this list',
              }
              : undefined,
          headerRight: isIos
            ? undefined
            : () => (
              <View style={styles.headerButtonsRow}>
                <Pressable
                  onPress={openComposer}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="plus" size={24} color={colors.tint} />
                </Pressable>
                <Pressable
                  onPress={openListSearch}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="magnifyingglass" size={22} color={colors.tint} />
                </Pressable>
                <Pressable
                  onPress={() => setMenuVisible('view')}
                  style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <IconSymbol name="ellipsis.circle" size={24} color={colors.tint} />
                </Pressable>
              </View>
            ),
        }}
      />
      {isIos && !listSearchVisible ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button icon="plus" onPress={openComposer} />
          <Stack.Toolbar.Button icon="magnifyingglass" onPress={openListSearch} />
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
      <ThemedView style={styles.container}>
        {!isIos && listSearchVisible ? (
          <View style={styles.inlineSearchWrap}>
            <View
              style={[
                styles.inlineSearchBar,
                {
                  borderColor: colors.icon + '30',
                  backgroundColor: colors.icon + '10',
                },
              ]}
            >
              <TextInput
                style={[styles.inlineSearchInput, { color: colors.text }]}
                placeholder="Search this list"
                placeholderTextColor={colors.icon}
                value={listSearchQuery}
                onChangeText={setListSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              <Pressable
                accessibilityLabel="Clear search"
                hitSlop={8}
                onPress={() => {
                  setListSearchQuery('');
                  setListSearchVisible(false);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
              >
                <IconSymbol name="xmark" size={18} color={colors.icon} />
              </Pressable>
            </View>
          </View>
        ) : null}
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
              { value: 'manual', label: 'Manual order' },
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
          <CompareView entries={visibleEntries} />
        ) : preferences.viewMode === 'tier' ? (
          <TierView tierRows={tierRows} onOpenEntry={openEntry} />
        ) : preferences.viewMode === 'grid' ? (
          <ScrollView
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.grid}>
              {visibleEntries.map((entry) => (
                <Pressable key={entry.id} onPress={() => openEntry(entry)} style={styles.gridCard}>
                  <ThumbnailImage imageUrl={entry.imageUrl} style={styles.gridImage} />
                  <ThemedText style={styles.gridTitle} numberOfLines={2}>
                    {entry.title}
                  </ThemedText>
                  {buildEntryMeta(entry, itemUserDataByKey, { showStatus: hasStatus }) ? (
                    <ThemedText style={[styles.gridMeta, { color: colors.icon }]}>
                      {buildEntryMeta(entry, itemUserDataByKey, { showStatus: hasStatus })}
                    </ThemedText>
                  ) : null}
                  {getEffectiveEntryRating(entry, itemUserDataByKey) ? (
                    <RatingStars value={getEffectiveEntryRating(entry, itemUserDataByKey)} size={12} />
                  ) : null}
                </Pressable>
              ))}
            </View>
            {!visibleEntries.length ? (
              <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
                This list is empty.
              </ThemedText>
            ) : null}
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={visibleEntries}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Swipeable
                overshootRight={false}
                rightThreshold={56}
                renderRightActions={(progress) => renderRightActions(progress, item)}
              >
                <View style={[styles.row, { borderBottomColor: colors.icon + '28' }]}>
                  {hasToggle ? (
                    <Pressable
                      onPress={() => setEntryChecked(list.id, item.id, !item.checked)}
                      style={[
                        styles.checkbox,
                        {
                          borderColor: item.checked ? colors.tint : colors.icon + '45',
                          backgroundColor: item.checked ? colors.tint : 'transparent',
                        },
                      ]}
                    >
                      {item.checked ? (
                        <IconSymbol name="checkmark" size={14} color={colors.background} />
                      ) : null}
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => openEntry(item)} style={styles.rowMain}>
                    <ThumbnailImage imageUrl={item.imageUrl} style={styles.rowImage} />
                    <View style={styles.rowInfo}>
                      <ThemedText style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </ThemedText>
                      <View style={styles.rowMetaWrap}>
                        <ThemedText style={[styles.rowMeta, { color: colors.icon }]} numberOfLines={2}>
                          {buildEntryMeta(item, itemUserDataByKey, { showStatus: hasStatus })}
                        </ThemedText>
                        {getEffectiveEntryRating(item, itemUserDataByKey) ? (
                          <RatingStars value={getEffectiveEntryRating(item, itemUserDataByKey)} size={12} />
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
              </Swipeable>
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + footerSpacerHeight },
            ]}
            ListEmptyComponent={
              <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
                This list is empty.
              </ThemedText>
            }
            ListFooterComponent={
              composerVisible ? (
                <View style={styles.composerFooter}>
                  {(pendingTagsText.trim() || pendingLinkUrl.trim()) ? (
                    <View style={styles.pendingMetaRow}>
                      {pendingTagsText.trim() ? (
                        <View style={[styles.pendingChip, { backgroundColor: colors.tint + '16' }]}>
                          <IconSymbol name="tag.fill" size={14} color={colors.tint} />
                          <ThemedText style={{ color: colors.tint }} numberOfLines={1}>
                            {pendingTagsText}
                          </ThemedText>
                        </View>
                      ) : null}
                      {pendingLinkUrl.trim() ? (
                        <View style={[styles.pendingChip, { backgroundColor: colors.tint + '16' }]}>
                          <IconSymbol name="link" size={14} color={colors.tint} />
                          <ThemedText style={{ color: colors.tint }} numberOfLines={1}>
                            {pendingLinkUrl}
                          </ThemedText>
                        </View>
                      ) : null}
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
                      onSubmitEditing={submitComposer}
                      blurOnSubmit={false}
                      returnKeyType="done"
                    />
                  </Pressable>
                </View>
              ) : null
            }
          />
        )}

        <ComposerActionBar
          accessoryId={composerAccessoryId}
          visible={composerAccessoryVisible}
          colors={colors}
          bottom={actionBarBottom}
          onLinkPress={() => setLinkSheetVisible(true)}
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
            { value: 'manual', label: 'Manual order' },
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
              <ScrollView
                contentContainerStyle={styles.sheetBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <CatalogSearchPanel
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
              </ScrollView>
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
                <ScrollView
                  contentContainerStyle={styles.sheetBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <CatalogSearchPanel
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
                </ScrollView>
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
          visible={linkSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLinkSheetVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setLinkSheetVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.34,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setLinkSheetVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>
                  Link
                </ThemedText>
                <Pressable
                  onPress={() => setLinkSheetVisible(false)}
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
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="https://example.com"
                  placeholderTextColor={colors.icon}
                  value={pendingLinkUrl}
                  onChangeText={setPendingLinkUrl}
                  autoFocus
                />
                {pendingLinkUrl.trim() ? (
                  <Pressable
                    onPress={() => setPendingLinkUrl('')}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      {
                        borderColor: colors.icon + '28',
                        backgroundColor: colors.icon + '10',
                        opacity: pressed ? 0.84 : 1,
                      },
                    ]}
                  >
                    <ThemedText style={{ color: colors.icon }}>Clear link</ThemedText>
                  </Pressable>
                ) : null}
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
                    const sublistId = createList(trimmed, sublistPreset, { parentListId: list.id });
                    if (!sublistId) {
                      return;
                    }
                    addEntryToList(list.id, {
                      title: trimmed,
                      type: 'list',
                      detailPath: `list/${sublistId}`,
                      linkedListId: sublistId,
                      sourceRef: { source: 'custom', detailPath: `list/${sublistId}` },
                    });
                    setNewSublistVisible(false);
                    setSublistTitle('');
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

function CompareView({ entries }: { entries: ListEntry[] }) {
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
    <ScrollView horizontal style={styles.compareContainer}>
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
}: {
  tierRows: { id: string; title: string; color: string; list: { entries: ListEntry[] } | null }[];
  onOpenEntry: (entry: ListEntry) => void;
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
    <ScrollView contentContainerStyle={styles.tierContent}>
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
                <ThumbnailImage imageUrl={entry.imageUrl} style={styles.tierImage} />
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

function labelForSort(value: ListSortMode) {
  return value === 'manual'
    ? 'Manual'
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

function buildEntryMeta(
  entry: ListEntry,
  itemUserDataByKey?: Record<string, ItemUserData>,
  options?: { showStatus?: boolean }
) {
  const parts = [entry.type === 'list' ? 'List' : entry.type];
  const progress = formatProgressLabel(entry, itemUserDataByKey);
  if (progress) {
    parts.splice(1, 0, progress);
  }
  if (options?.showStatus && entry.status) {
    parts.push(entry.status);
  }
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerButtonsRow: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { padding: 6, marginRight: 6 },
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  inlineSearchWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  inlineSearchBar: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  listTagSection: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  listTagLabel: { fontSize: 13 },
  listTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listTagChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowImage: { width: 56, height: 80, borderRadius: 6 },
  rowInfo: { flex: 1, marginLeft: 14 },
  rowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  rowMetaWrap: { gap: 6 },
  rowMeta: { fontSize: 13 },
  rightActionContainer: {
    width: 192,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  infoAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  gridContent: { paddingHorizontal: 14, paddingTop: 8 },
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
  },
  composerInput: {
    fontSize: 16,
    paddingVertical: 12,
  },
  compareContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  compareTable: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 24 },
  compareRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  compareHeaderRow: { borderBottomWidth: 1 },
  compareCell: { minWidth: 140, paddingHorizontal: 14, paddingVertical: 12 },
  compareTitleColumn: { minWidth: 180 },
  compareHeaderText: { fontSize: 14, fontWeight: '700' },
  tierContent: { paddingTop: 8, paddingBottom: 24 },
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
  sheetBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 14 },
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
