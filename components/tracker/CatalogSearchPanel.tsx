import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  TextInput,
  type ViewStyle,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  CATALOG_SEARCH_RESULT_ROW_GAP,
  CatalogSearchResultRow,
} from '@/components/tracker/catalog-search-result-row';
import { Colors } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiQueryKeys } from '@/services/api-query-keys';
import {
  catalogAdapters,
  searchCatalog,
  type CatalogCategory,
  type CatalogSearchItem,
} from '@/services/catalog';

interface CatalogSearchPanelProps {
  onSelectItem: (item: CatalogSearchItem) => void;
  initialCategory?: CatalogCategory;
  initialQuery?: string;
  placeholder?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function CatalogSearchPanel({
  onSelectItem,
  initialCategory = 'anime',
  initialQuery = '',
  placeholder = 'Search the catalog',
  autoFocus = false,
  style,
  contentContainerStyle,
}: CatalogSearchPanelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const listRef = useRef<FlatList<CatalogSearchItem>>(null);
  const [category, setCategory] = useState<CatalogCategory>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 350);
  const trimmedQuery = debouncedQuery.trim();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setPage(1);
  }, [category, trimmedQuery]);

  const searchQuery = useQuery({
    queryKey: apiQueryKeys.catalog.search(category, trimmedQuery, page),
    queryFn: ({ signal }) => searchCatalog(category, trimmedQuery, { page, signal }),
    enabled: trimmedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;
      const sameSearch =
        Array.isArray(previousKey) &&
        previousKey[0] === 'catalog' &&
        previousKey[1] === 'search' &&
        previousKey[2] === category &&
        previousKey[3] === trimmedQuery;

      return sameSearch ? keepPreviousData(previousData) : undefined;
    },
  });

  const isWaitingForDebounce = query.trim().length > 0 && query.trim() !== trimmedQuery;
  const isLoading = isWaitingForDebounce || searchQuery.isFetching;
  const results = searchQuery.data?.items ?? [];
  const totalPages = searchQuery.data?.totalPages ?? 1;
  const currentPage = searchQuery.data?.page ?? page;
  const error =
    searchQuery.error instanceof Error && searchQuery.error.message === 'missing_tmdb_api_key'
      ? 'TMDB is not configured in this build environment.'
      : searchQuery.isError
      ? 'Search failed. Check your connection and try again.'
      : null;
  const canGoToFirstPage = currentPage > 1;
  const canGoToPreviousPage = searchQuery.data?.hasPreviousPage ?? currentPage > 1;
  const canGoToNextPage = searchQuery.data?.hasNextPage ?? currentPage < totalPages;
  const canGoToLastPage = currentPage < totalPages;
  const showPagination = trimmedQuery.length > 0 && !error;

  const emptyLabel = useMemo(() => {
    if (!query.trim()) {
      return 'Search lists, media or people.';
    }
    if (isLoading) {
      return 'Searching...';
    }
    return 'No matches yet.';
  }, [isLoading, query]);

  function handlePageChange(nextPage: number) {
    const normalizedPage = Math.max(1, Math.min(totalPages, nextPage));
    if (normalizedPage === currentPage) {
      return;
    }

    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setPage(normalizedPage);
  }

  function renderPaginationButton(label: string, onPress: () => void, disabled: boolean) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.paginationButton,
          {
            borderColor: colors.icon + '28',
            backgroundColor: disabled ? colors.icon + '08' : colors.icon + '10',
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        <ThemedText style={styles.paginationButtonLabel}>{label}</ThemedText>
      </Pressable>
    );
  }

  const header = (
    <View style={styles.headerContent}>
      <View
        style={[
          styles.searchBar,
          {
            borderColor: colors.icon + '28',
            backgroundColor: colors.icon + '10',
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.icon}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {catalogAdapters.map((adapter) => (
          <Pressable
            key={adapter.id}
            onPress={() => {
              setCategory(adapter.id);
              setPage(1);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: category === adapter.id ? colors.tint : colors.icon + '10',
              },
            ]}
          >
            <ThemedText
              style={{
                color: category === adapter.id ? colors.background : colors.text,
              }}
            >
              {adapter.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      ) : null}
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
    </View>
  );

  const footer = showPagination ? (
    <View style={styles.paginationRow}>
      {renderPaginationButton('First', () => handlePageChange(1), !canGoToFirstPage)}
      {renderPaginationButton(
        'Prev',
        () => handlePageChange(currentPage - 1),
        !canGoToPreviousPage
      )}
      <View
        style={[
          styles.paginationStatus,
          {
            borderColor: colors.icon + '28',
            backgroundColor: colors.icon + '10',
          },
        ]}
      >
        <ThemedText style={styles.paginationStatusText}>
          Page {currentPage} of {totalPages}
        </ThemedText>
      </View>
      {renderPaginationButton('Next', () => handlePageChange(currentPage + 1), !canGoToNextPage)}
      {renderPaginationButton('Last', () => handlePageChange(totalPages), !canGoToLastPage)}
    </View>
  ) : null;

  return (
    <FlatList
      ref={listRef}
      data={results}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      renderItem={({ item }) => (
        <CatalogSearchResultRow item={item} onPress={() => onSelectItem(item)} />
      )}
      style={style}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.container, contentContainerStyle]}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>{emptyLabel}</ThemedText>
      }
      ListFooterComponent={footer}
      ItemSeparatorComponent={() => <View style={styles.resultSeparator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  headerContent: {
    gap: 14,
    paddingBottom: 14,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    fontSize: 16,
    paddingVertical: 10,
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  centered: {
    alignItems: 'center',
  },
  resultSeparator: {
    height: CATALOG_SEARCH_RESULT_ROW_GAP,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 14,
  },
  paginationButton: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paginationButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  paginationStatus: {
    flex: 1,
    minWidth: 132,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paginationStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    paddingVertical: 16,
  },
  errorText: {
    color: '#cc3f3f',
  },
});
