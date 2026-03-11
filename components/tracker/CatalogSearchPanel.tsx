import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
}

export function CatalogSearchPanel({
  onSelectItem,
  initialCategory = 'anime',
  initialQuery = '',
  placeholder = 'Search the catalog',
  autoFocus = false,
}: CatalogSearchPanelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [category, setCategory] = useState<CatalogCategory>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 350);
  const trimmedQuery = debouncedQuery.trim();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const searchQuery = useQuery({
    queryKey: apiQueryKeys.catalog.search(category, trimmedQuery),
    queryFn: ({ signal }) => searchCatalog(category, trimmedQuery, signal),
    enabled: trimmedQuery.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const isWaitingForDebounce = query.trim().length > 0 && query.trim() !== trimmedQuery;
  const isLoading = isWaitingForDebounce || searchQuery.isFetching;
  const results = searchQuery.data ?? [];
  const error =
    searchQuery.error instanceof Error && searchQuery.error.message === 'missing_tmdb_api_key'
      ? 'TMDB is not configured in this build environment.'
      : searchQuery.isError
      ? 'Search failed. Check your connection and try again.'
      : null;

  const emptyLabel = useMemo(() => {
    if (!query.trim()) {
      return 'Search lists, media or people.';
    }
    if (isLoading) {
      return 'Searching...';
    }
    return 'No matches yet.';
  }, [isLoading, query]);

  return (
    <View style={styles.container}>
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
            onPress={() => setCategory(adapter.id)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  category === adapter.id ? colors.tint : colors.icon + '10',
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

      <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
        {!results.length ? (
          <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
            {emptyLabel}
          </ThemedText>
        ) : (
          results.map((item) => (
            <CatalogSearchResultRow
              key={`${item.type}-${item.id}`}
              item={item}
              onPress={() => onSelectItem(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
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
  results: {
    gap: CATALOG_SEARCH_RESULT_ROW_GAP,
    paddingBottom: 12,
  },
  emptyText: {
    paddingVertical: 16,
  },
  errorText: {
    color: '#cc3f3f',
  },
});
