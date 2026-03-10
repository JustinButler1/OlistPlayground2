import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  CATALOG_SEARCH_RESULT_ROW_GAP,
  CatalogSearchResultRow,
} from '@/components/tracker/catalog-search-result-row';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      void searchCatalog(category, trimmedQuery)
        .then((nextResults) => {
          if (!active) {
            return;
          }

          startTransition(() => {
            setResults(nextResults);
          });
        })
        .catch((searchError) => {
          if (!active) {
            return;
          }

          if (
            searchError instanceof Error &&
            searchError.message === 'missing_tmdb_api_key'
          ) {
            setError('TMDB is not configured in this build environment.');
          } else {
            setError('Search failed. Check your connection and try again.');
          }
          setResults([]);
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [category, deferredQuery]);

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
