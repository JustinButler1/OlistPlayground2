import { useQueries } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import SQLiteAsyncStorage from 'expo-sqlite/kv-store';
import { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import {
  CATALOG_SEARCH_RESULT_ROW_GAP,
  CatalogSearchResultRow,
} from '@/components/tracker/catalog-search-result-row';
import { SearchControlRow } from '@/components/tracker/search-control-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, ThemePalette } from '@/constants/theme';
import { useEntryActions, useListsQuery } from '@/contexts/lists-context';
import type { TrackerList } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { buildSeededDetailHref } from '@/lib/detail-navigation';
import { apiQueryKeys } from '@/services/api-query-keys';
import {
  searchCatalog,
  type CatalogCategory,
  type CatalogSearchItem,
} from '@/services/catalog';

const IOS_TAB_SEARCH_MIN_VERSION = 26;
const SEARCH_SCOPE_STORAGE_KEY = 'search-media-scope-v1';

type SearchMediaScope =
  | 'all-media'
  | 'movie-tv'
  | 'book'
  | 'anime'
  | 'manga'
  | 'game'
  | 'list'
  | 'people';

type SearchSortId =
  | 'title'
  | 'rating'
  | 'release-year'
  | 'episodes'
  | 'chapters'
  | 'pages'
  | 'author'
  | 'items'
  | 'updated'
  | 'popularity'
  | 'run-time'
  | 'play-time';

interface SearchScopeOption {
  id: SearchMediaScope;
  label: string;
}

interface SearchSortOption {
  id: SearchSortId;
  label: string;
}

interface SelectionMenuState {
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const SEARCH_SCOPE_OPTIONS: SearchScopeOption[] = [
  { id: 'all-media', label: 'All Media' },
  { id: 'movie-tv', label: 'TV/Movies' },
  { id: 'book', label: 'Books' },
  { id: 'anime', label: 'Anime' },
  { id: 'manga', label: 'Manga' },
  { id: 'game', label: 'Games' },
  { id: 'list', label: 'Lists' },
  { id: 'people', label: 'People' },
];

const SEARCH_SORT_OPTIONS: Record<SearchMediaScope, SearchSortOption[]> = {
  'all-media': [
    { id: 'title', label: 'Title' },
    { id: 'rating', label: 'Rating' },
    { id: 'release-year', label: 'Release Year' },
  ],
  'movie-tv': [
    { id: 'title', label: 'Title' },
    { id: 'release-year', label: 'Release Year' },
    { id: 'run-time', label: 'Run Time' },
    { id: 'rating', label: 'Rating' },
  ],
  book: [
    { id: 'title', label: 'Title' },
    { id: 'author', label: 'Author' },
    { id: 'pages', label: 'Pages' },
  ],
  anime: [
    { id: 'title', label: 'Title' },
    { id: 'episodes', label: 'Episodes' },
    { id: 'rating', label: 'Rating' },
  ],
  manga: [
    { id: 'title', label: 'Title' },
    { id: 'chapters', label: 'Chapters' },
    { id: 'rating', label: 'Rating' },
  ],
  game: [
    { id: 'title', label: 'Title' },
    { id: 'popularity', label: 'Popularity' },
    { id: 'play-time', label: 'Play Time' },
  ],
  list: [
    { id: 'title', label: 'Title' },
    { id: 'items', label: 'Items' },
    { id: 'updated', label: 'Recently Updated' },
  ],
  people: [
    { id: 'title', label: 'Title' },
    { id: 'popularity', label: 'Popularity' },
  ],
};

const SEARCH_SCOPE_TO_CATEGORIES: Record<SearchMediaScope, CatalogCategory[]> = {
  'all-media': ['anime', 'manga', 'book', 'movie-tv'],
  'movie-tv': ['movie-tv'],
  book: ['book'],
  anime: ['anime'],
  manga: ['manga'],
  game: [],
  list: [],
  people: [],
};

const supportsNativeTabSearchInput =
  process.env.EXPO_OS === 'ios' &&
  Number.parseInt(String(Platform.Version).split('.')[0] ?? '0', 10) >=
  IOS_TAB_SEARCH_MIN_VERSION;

function isSearchMediaScope(value: string | null): value is SearchMediaScope {
  return SEARCH_SCOPE_OPTIONS.some((option) => option.id === value);
}

function parseCountFromLabel(label?: string): number {
  if (!label) {
    return 0;
  }

  const match = label.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function parseYearFromLocation(location?: string): number {
  if (!location) {
    return 0;
  }

  const match = location.match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function searchListsLocally(lists: TrackerList[], query: string): CatalogSearchItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return lists
    .filter((list) => {
      const haystack = [list.title, list.description, ...list.tags]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .map((list) => {
      const visibleEntryCount = list.entries.filter((entry) => !entry.archivedAt).length;
      const progressLabel = `${visibleEntryCount} items`;
      const subtitle = [list.description, progressLabel].filter(Boolean).join(' | ');

      return {
        id: list.id,
        title: list.title,
        subtitle: subtitle || undefined,
        progressLabel,
        tags: list.tags,
        type: 'list',
        detailPath: `list/${list.id}`,
        sourceRef: {
          source: 'custom',
          externalId: list.id,
          detailPath: `list/${list.id}`,
        },
        totalProgress: visibleEntryCount,
        progressUnit: 'item',
      } satisfies CatalogSearchItem;
    });
}

function sortSearchResults(
  items: CatalogSearchItem[],
  sortId: SearchSortId,
  visibleLists: TrackerList[]
): CatalogSearchItem[] {
  const listMetadataById = new Map(
    visibleLists.map((list) => [
      list.id,
      {
        updatedAt: list.updatedAt,
      },
    ])
  );

  return [...items].sort((left, right) => {
    switch (sortId) {
      case 'rating':
      case 'popularity':
        return (right.rating ?? 0) - (left.rating ?? 0) || left.title.localeCompare(right.title);
      case 'release-year':
        return (
          parseYearFromLocation(right.location) - parseYearFromLocation(left.location) ||
          left.title.localeCompare(right.title)
        );
      case 'episodes':
      case 'chapters':
      case 'pages':
      case 'items':
      case 'run-time':
      case 'play-time': {
        const leftValue = left.totalProgress ?? parseCountFromLabel(left.progressLabel);
        const rightValue = right.totalProgress ?? parseCountFromLabel(right.progressLabel);
        return rightValue - leftValue || left.title.localeCompare(right.title);
      }
      case 'updated': {
        const leftUpdatedAt = listMetadataById.get(left.id)?.updatedAt ?? 0;
        const rightUpdatedAt = listMetadataById.get(right.id)?.updatedAt ?? 0;
        return rightUpdatedAt - leftUpdatedAt || left.title.localeCompare(right.title);
      }
      case 'author':
        return (
          (left.author ?? '').localeCompare(right.author ?? '') ||
          left.title.localeCompare(right.title)
        );
      case 'title':
      default:
        return left.title.localeCompare(right.title);
    }
  });
}

function getScopeEmptyState(scope: SearchMediaScope, query: string): string {
  if (scope === 'game') {
    return `Game search isn't connected yet for "${query}".`;
  }

  if (scope === 'people') {
    return `People search isn't connected yet for "${query}".`;
  }

  return `No results for "${query}".`;
}

function getScopePlaceholder(scope: SearchMediaScope): string {
  switch (scope) {
    case 'all-media':
      return 'Search across anime, manga, books, TV, movies, and lists.';
    case 'movie-tv':
      return 'Search TV shows and movies.';
    case 'book':
      return 'Search books.';
    case 'anime':
      return 'Search anime.';
    case 'manga':
      return 'Search manga.';
    case 'list':
      return 'Search your lists.';
    case 'game':
      return 'Game search is coming soon.';
    case 'people':
      return 'People search is coming soon.';
    default:
      return 'Search.';
  }
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { addEntryToList } = useEntryActions();
  const [query, setQuery] = useState('');
  const [pendingItem, setPendingItem] = useState<CatalogSearchItem | null>(null);
  const [mediaScope, setMediaScope] = useState<SearchMediaScope>('all-media');
  const [sortId, setSortId] = useState<SearchSortId>('title');
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState | null>(null);
  const [isContentNoticeVisible, setIsContentNoticeVisible] = useState(true);
  const debouncedQuery = useDebouncedValue(query, 350);
  const trimmedQuery = debouncedQuery.trim();

  const visibleLists = useMemo(
    () => activeLists.filter((list) => !list.archivedAt),
    [activeLists]
  );

  const sortOptions = SEARCH_SORT_OPTIONS[mediaScope];
  const selectedScopeLabel =
    SEARCH_SCOPE_OPTIONS.find((option) => option.id === mediaScope)?.label ?? 'All Media';
  const remoteCategories = SEARCH_SCOPE_TO_CATEGORIES[mediaScope];

  useEffect(() => {
    let cancelled = false;

    void SQLiteAsyncStorage.getItem(SEARCH_SCOPE_STORAGE_KEY)
      .then((storedValue) => {
        if (!cancelled && isSearchMediaScope(storedValue)) {
          setMediaScope(storedValue);
        }
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void SQLiteAsyncStorage.setItem(SEARCH_SCOPE_STORAGE_KEY, mediaScope).catch(() => { });
  }, [mediaScope]);

  useEffect(() => {
    if (!sortOptions.some((option) => option.id === sortId)) {
      setSortId(sortOptions[0]?.id ?? 'title');
    }
  }, [sortId, sortOptions]);

  const remoteSearchQueries = useQueries({
    queries: remoteCategories.map((category) => ({
      queryKey: apiQueryKeys.catalog.search(category, trimmedQuery),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        searchCatalog(category, trimmedQuery, signal),
      enabled: trimmedQuery.length > 0,
      staleTime: 1000 * 60 * 5,
    })),
  });

  const localListResults = useMemo(
    () =>
      trimmedQuery && (mediaScope === 'all-media' || mediaScope === 'list')
        ? searchListsLocally(visibleLists, trimmedQuery)
        : [],
    [mediaScope, trimmedQuery, visibleLists]
  );

  const results = useMemo(
    () => [
      ...localListResults,
      ...remoteSearchQueries.flatMap((remoteQuery) => remoteQuery.data ?? []),
    ],
    [localListResults, remoteSearchQueries]
  );

  const isWaitingForDebounce = query.trim().length > 0 && query.trim() !== trimmedQuery;
  const isLoading =
    isWaitingForDebounce ||
    (trimmedQuery.length > 0 &&
      remoteSearchQueries.some((remoteQuery) => remoteQuery.fetchStatus === 'fetching'));

  const error = useMemo(() => {
    if (!trimmedQuery) {
      return null;
    }

    let nextError: string | null = null;

    remoteSearchQueries.forEach((remoteQuery) => {
      if (!(remoteQuery.error instanceof Error)) {
        return;
      }

      if (remoteQuery.error.message === 'missing_tmdb_api_key') {
        nextError =
          mediaScope === 'movie-tv'
            ? 'TMDB is not configured in this build environment.'
            : 'TV and movie results are unavailable in this build environment.';
        return;
      }

      if (!nextError) {
        nextError = 'Search failed. Check your connection and try again.';
      }
    });

    return nextError;
  }, [mediaScope, remoteSearchQueries, trimmedQuery]);

  const sortedResults = useMemo(
    () => sortSearchResults(results, sortId, visibleLists),
    [results, sortId, visibleLists]
  );

  function openSelectionMenu(config: SelectionMenuState) {
    if (process.env.EXPO_OS === 'ios') {
      const optionLabels = config.options.map((option) =>
        option.value === config.selectedValue ? `\u2713 ${option.label}` : option.label
      );

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: config.title,
          options: [...optionLabels, 'Cancel'],
          cancelButtonIndex: optionLabels.length,
          userInterfaceStyle: colorScheme ?? 'light',
        },
        (buttonIndex) => {
          if (buttonIndex == null || buttonIndex >= config.options.length) {
            return;
          }

          config.onSelect(config.options[buttonIndex]!.value);
        }
      );
      return;
    }

    setSelectionMenu(config);
  }

  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          title: 'Search',
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      {supportsNativeTabSearchInput ? (
        <Stack.SearchBar
          allowToolbarIntegration
          autoCapitalize="none"
          hideNavigationBar={false}
          hideWhenScrolling={false}
          obscureBackground={false}
          onCancelButtonPress={() => setQuery('')}
          onChangeText={(event) => setQuery(event.nativeEvent.text)}
          onSearchButtonPress={(event) => setQuery(event.nativeEvent.text)}
          placeholder="Search anime, manga, books, TV, movies, and lists"
          placement="automatic"
        />
      ) : null}

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!supportsNativeTabSearchInput ? (
          <View
            style={[
              styles.searchBar,
              {
                borderColor: colors.icon + '30',
                backgroundColor: colors.icon + '12',
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search"
              placeholderTextColor={colors.icon}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        ) : null}

        <SearchControlRow
          colors={colors}
          selectedScopeLabel={selectedScopeLabel}
          mediaScope={mediaScope}
          scopeOptions={SEARCH_SCOPE_OPTIONS.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          onMediaScopeChange={(value) => setMediaScope(value as SearchMediaScope)}
          sortId={sortId}
          sortOptions={sortOptions.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          onSortChange={(value) => setSortId(value as SearchSortId)}
          onOpenFilter={() => router.push('/search/filter-sheet')}
          onOpenScopeMenu={() =>
            openSelectionMenu({
              title: 'Search Scope',
              options: SEARCH_SCOPE_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              })),
              selectedValue: mediaScope,
              onSelect: (value) => setMediaScope(value as SearchMediaScope),
            })
          }
          onOpenSortMenu={() =>
            openSelectionMenu({
              title: 'Sort Results',
              options: sortOptions.map((option) => ({
                value: option.id,
                label: option.label,
              })),
              selectedValue: sortId,
              onSelect: (value) => setSortId(value as SearchSortId),
            })
          }
        />

        {isContentNoticeVisible ? (
          <Pressable
            onPress={() => router.push('/search/content-filter-info')}
            style={({ pressed }) => [
              styles.warningCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '24',
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.warningBadge,
                {
                  backgroundColor: colors.tint,
                },
              ]}
            >
              <ThemedText style={styles.warningBadgeText}>18</ThemedText>
            </View>
            <ThemedText style={styles.warningText}>
              Mature content may be filtered from search results due to your account
              settings. Tap to learn more.
            </ThemedText>
            <Pressable
              accessibilityLabel="Dismiss content filter warning"
              hitSlop={10}
              onPress={(event) => {
                event.stopPropagation();
                setIsContentNoticeVisible(false);
              }}
              style={({ pressed }) => [
                styles.warningDismissButton,
                {
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <IconSymbol name="xmark" size={18} color={colors.icon} />
            </Pressable>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : null}
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {!query.trim() && !isLoading ? (
          <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
            {getScopePlaceholder(mediaScope)}
          </ThemedText>
        ) : null}

        {query.trim() && !isLoading && !error && sortedResults.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
            {getScopeEmptyState(mediaScope, query)}
          </ThemedText>
        ) : null}

        <View style={styles.results}>
          {sortedResults.map((item) => (
            <CatalogSearchResultRow
              key={`${item.type}-${item.id}`}
              item={item}
              href={
                item.detailPath
                  ? buildSeededDetailHref(item.detailPath, {
                    title: item.title,
                    subtitle: item.subtitle,
                    imageUrl: item.imageUrl,
                    imageVariant: 'poster',
                  })
                  : undefined
              }
              rightAccessory={
                item.type === 'list' ? null : (
                  <Pressable
                    onPress={() => setPendingItem(item)}
                    style={({ pressed }) => [
                      styles.addButton,
                      {
                        borderColor: colors.tint,
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.title} to list`}
                  >
                    <IconSymbol name="plus" size={22} color={colors.tint} />
                  </Pressable>
                )
              }
            />
          ))}
        </View>
      </ScrollView>

      <SelectionMenu
        visible={!!selectionMenu}
        title={selectionMenu?.title ?? ''}
        options={selectionMenu?.options ?? []}
        selectedValue={selectionMenu?.selectedValue ?? ''}
        onClose={() => setSelectionMenu(null)}
        onSelect={(value) => {
          selectionMenu?.onSelect(value);
          setSelectionMenu(null);
        }}
      />

      <Modal
        visible={!!pendingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingItem(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPendingItem(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '20',
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText type="subtitle">Choose a list</ThemedText>
            <View style={styles.modalContent}>
              {visibleLists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => {
                    if (!pendingItem) {
                      return;
                    }
                    addEntryToList(list.id, {
                      title: pendingItem.title,
                      type: pendingItem.type,
                      imageUrl: pendingItem.imageUrl,
                      detailPath: pendingItem.detailPath,
                      sourceRef: pendingItem.sourceRef,
                      rating: pendingItem.rating,
                      progress:
                        pendingItem.totalProgress && pendingItem.progressUnit
                          ? {
                            current: undefined,
                            total: pendingItem.totalProgress,
                            unit: pendingItem.progressUnit,
                            updatedAt: Date.now(),
                          }
                          : undefined,
                    });
                    setPendingItem(null);
                  }}
                  style={({ pressed }) => [
                    styles.listOption,
                    {
                      borderColor: colors.icon + '20',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.listOptionText}>
                    <ThemedText type="defaultSemiBold">{list.title}</ThemedText>
                    <ThemedText style={{ color: colors.icon }}>
                      {list.entries.filter((entry) => !entry.archivedAt).length} items
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: colors.tint }}>Use</ThemedText>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </TabRootBackground>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: 12,
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: 18,
    paddingLeft: 18,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  warningBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warningBadgeText: {
    color: ThemePalette.white,
    fontSize: 17,
    fontWeight: '700',
  },
  warningText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  warningDismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  placeholder: {
    fontSize: 15,
  },
  errorText: {
    color: '#cc3f3f',
  },
  results: {
    gap: CATALOG_SEARCH_RESULT_ROW_GAP,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  menuOption: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalContent: {
    gap: 10,
  },
  listOption: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listOptionText: {
    flex: 1,
    gap: 3,
  },
});
