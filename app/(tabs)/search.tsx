import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useEntryActions, useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  catalogAdapters,
  searchCatalog,
  type CatalogCategory,
  type CatalogSearchItem,
} from '@/services/catalog';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { recentSearches, recentLists, addAgain } = useListsQuery();
  const { addEntryToList } = useEntryActions();
  const { recordRecentSearch } = useListActions();
  const [category, setCategory] = useState<CatalogCategory>('anime');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<CatalogSearchItem | null>(null);

  useEffect(() => {
    const trimmedQuery = deferredQuery.trim();
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      void searchCatalog(category, trimmedQuery)
        .then(setResults)
        .catch((searchError) => {
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
        .finally(() => setIsLoading(false));
    }, 350);

    return () => clearTimeout(timeout);
  }, [category, deferredQuery]);

  const recentTargetLists = useMemo(() => recentLists.slice(0, 4), [recentLists]);

  const addSearchResultToList = (item: CatalogSearchItem, listId: string) => {
    addEntryToList(listId, {
      title: item.title,
      type: item.type,
      imageUrl: item.imageUrl,
      detailPath: item.detailPath,
      sourceRef: item.sourceRef,
      rating: item.rating,
      progress:
        item.totalProgress && item.progressUnit
          ? {
              current: 0,
              total: item.totalProgress,
              unit: item.progressUnit,
              updatedAt: Date.now(),
            }
          : undefined,
    });
    recordRecentSearch(query);
    setPendingItem(null);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title">Search</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            Catalog search is still useful for private tracking, but IGDB stays out until a backend
            exists.
          </ThemedText>
        </View>

        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.text,
              borderColor: colors.icon + '24',
              backgroundColor: colors.icon + '10',
            },
          ]}
          placeholder="Search anime, manga, books, TV, or movies"
          placeholderTextColor={colors.icon}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
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

        <Section title="Recent Searches">
          <View style={styles.chipWrap}>
            {recentSearches.length ? (
              recentSearches.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setQuery(item)}
                  style={[styles.chip, { backgroundColor: colors.icon + '10' }]}
                >
                  <ThemedText>{item}</ThemedText>
                </Pressable>
              ))
            ) : (
              <ThemedText style={styles.emptyText}>Your last searches will show up here.</ThemedText>
            )}
          </View>
        </Section>

        <Section title="Recent Target Lists">
          <View style={styles.chipWrap}>
            {recentTargetLists.map((list) => (
              <Pressable
                key={list.id}
                onPress={() => router.push(`/list/${list.id}`)}
                style={[styles.chip, { backgroundColor: colors.icon + '10' }]}
              >
                <ThemedText>{list.title}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Add Again">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.addAgainRow}
          >
            {addAgain.map(({ entry, list }) => (
              <Pressable
                key={entry.id}
                onPress={() =>
                  addEntryToList(list.id, {
                    title: entry.title,
                    type: entry.type,
                    imageUrl: entry.imageUrl,
                    detailPath: entry.detailPath,
                    sourceRef: entry.sourceRef,
                    rating: entry.rating,
                    tags: entry.tags,
                    progress: entry.progress,
                  })
                }
                style={[
                  styles.addAgainCard,
                  {
                    borderColor: colors.icon + '20',
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <ThumbnailImage imageUrl={entry.imageUrl} style={styles.addAgainImage} />
                <ThemedText type="defaultSemiBold" numberOfLines={2}>
                  {entry.title}
                </ThemedText>
                <ThemedText style={{ color: colors.icon }}>{list.title}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </Section>

        <Section title="Results">
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null}
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
          {!results.length && !isLoading ? (
            <ThemedText style={styles.emptyText}>
              {query.trim() ? 'No results yet.' : 'Start typing to search the bundled catalogs.'}
            </ThemedText>
          ) : (
            results.map((item) => (
              <Pressable
                key={`${item.type}-${item.id}`}
                onPress={() => setPendingItem(item)}
                style={[
                  styles.resultRow,
                  {
                    borderColor: colors.icon + '20',
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultImage} />
                <View style={styles.resultContent}>
                  <ThemedText type="defaultSemiBold" numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  {item.subtitle ? (
                    <ThemedText style={{ color: colors.icon }}>{item.subtitle}</ThemedText>
                  ) : null}
                </View>
                <ThemedText style={{ color: colors.tint }}>Add</ThemedText>
              </Pressable>
            ))
          )}
        </Section>
      </ScrollView>

      <Modal visible={!!pendingItem} transparent animationType="fade" onRequestClose={() => setPendingItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPendingItem(null)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '20',
              },
            ]}
          >
            <ThemedText type="subtitle">Choose a list</ThemedText>
            <View style={styles.sectionContent}>
              {recentLists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => pendingItem && addSearchResultToList(pendingItem, list.id)}
                  style={[
                    styles.resultRow,
                    {
                      borderColor: colors.icon + '20',
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <View style={styles.resultContent}>
                    <ThemedText type="defaultSemiBold">{list.title}</ThemedText>
                    <ThemedText style={{ color: colors.icon }}>
                      {list.entries.filter((entry) => !entry.archivedAt).length} tracked
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: colors.tint }}>Use</ThemedText>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  chipRow: {
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  section: {
    gap: 12,
  },
  sectionContent: {
    gap: 10,
  },
  addAgainRow: {
    gap: 12,
  },
  addAgainCard: {
    width: 160,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    gap: 8,
  },
  addAgainImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  centered: {
    alignItems: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  resultImage: {
    width: 58,
    height: 82,
    borderRadius: 14,
  },
  resultContent: {
    flex: 1,
    gap: 4,
  },
  emptyText: {
    opacity: 0.7,
  },
  errorText: {
    color: '#cc3f3f',
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
});
