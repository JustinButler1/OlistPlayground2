import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const JIKAN_API = 'https://api.jikan.moe/v4';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: {
    jpg: { image_url: string; small_image_url: string };
    webp?: { image_url: string; small_image_url: string };
  };
  type: string;
  episodes: number | null;
  score: number | null;
  synopsis: string | null;
  year: number | null;
}

interface JikanSearchResponse {
  data: JikanAnime[];
  pagination: { last_visible_page: number };
}

async function searchAnime(query: string): Promise<JikanAnime[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${JIKAN_API}/anime?q=${encodeURIComponent(query.trim())}&limit=25`
  );
  if (!res.ok) throw new Error('Search failed');
  const json: JikanSearchResponse = await res.json();
  return json.data ?? [];
}

const SEARCH_CATEGORIES = [
  { id: 'anime', label: 'Anime' },
  { id: 'tv-movie', label: 'TV/Movie' },
  { id: 'manga', label: 'Manga' },
  { id: 'books', label: 'Books' },
  { id: 'games', label: 'Games' },
] as const;

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number]['id'];

export default function SearchScreen() {
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('anime');
  const [query, setQuery] = useState('');
  const [animeResults, setAnimeResults] = useState<JikanAnime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const colors = Colors[colorScheme ?? 'light'];

  const searchBarBg = colorScheme === 'dark' ? '#252528' : '#e8eaed';

  const runAnimeSearch = useCallback(async (q: string) => {
    if (selectedCategory !== 'anime') return;
    if (!q.trim()) {
      setAnimeResults([]);
      setSearchError(null);
      return;
    }
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await searchAnime(q);
      setAnimeResults(results);
    } catch {
      setSearchError('Failed to search. Check your connection.');
      setAnimeResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const t = setTimeout(() => {
      runAnimeSearch(query);
    }, 400);
    return () => clearTimeout(t);
  }, [query, runAnimeSearch]);

  const renderAnimeItem = useCallback(
    ({ item }: { item: JikanAnime }) => {
      const img = item.images?.jpg?.image_url ?? item.images?.webp?.image_url ?? item.images?.jpg?.small_image_url;
      return (
        <Pressable
          onPress={() => router.push(`/anime/${item.mal_id}`)}
          style={({ pressed }) => [
            styles.animeRow,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          accessible
          accessibilityRole="button"
        >
          <Image
            source={{ uri: img }}
            style={styles.animePoster}
            contentFit="cover"
          />
          <View style={styles.animeInfo}>
            <ThemedText style={styles.animeTitle} numberOfLines={2}>
              {item.title}
            </ThemedText>
            <View style={styles.animeMeta}>
              {item.type ? (
                <ThemedText style={[styles.animeMetaText, { color: colors.icon }]}>
                  {item.type}
                  {item.episodes ? ` · ${item.episodes} ep` : ''}
                  {item.year ? ` · ${item.year}` : ''}
                </ThemedText>
              ) : null}
              {item.score != null && (
                <ThemedText style={styles.animeScore}>★ {item.score}</ThemedText>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [colors.icon, router]
  );

  const animeKeyExtractor = useCallback((item: JikanAnime) => String(item.mal_id), []);

  const resultsContent = useMemo(() => {
    if (selectedCategory !== 'anime') {
      return (
        <ThemedText style={styles.placeholder}>
          Search for {SEARCH_CATEGORIES.find((c) => c.id === selectedCategory)?.label.toLowerCase()}...
        </ThemedText>
      );
    }
    if (searchError) {
      return (
        <ThemedText style={[styles.placeholder, styles.errorText]}>{searchError}</ThemedText>
      );
    }
    if (isLoading && animeResults.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.placeholder}>Searching...</ThemedText>
        </View>
      );
    }
    if (!query.trim()) {
      return (
        <ThemedText style={styles.placeholder}>
          Type an anime name to search via Jikan (MyAnimeList)
        </ThemedText>
      );
    }
    if (animeResults.length === 0) {
      return (
        <ThemedText style={styles.placeholder}>No anime found for "{query}"</ThemedText>
      );
    }
    return (
      <FlatList
        data={animeResults}
        keyExtractor={animeKeyExtractor}
        renderItem={renderAnimeItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isLoading ? (
            <View style={styles.loadingHeader}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
      />
    );
  }, [
    selectedCategory,
    searchError,
    isLoading,
    query,
    animeResults,
    colors.tint,
    insets.bottom,
    renderAnimeItem,
    animeKeyExtractor,
  ]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.searchRow, { paddingHorizontal: 20, paddingTop: 16 }]}>
        <View style={[styles.searchBar, { backgroundColor: searchBarBg }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search..."
            placeholderTextColor={colors.icon}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.chipsSection}>
        <ThemedText type="subtitle" style={styles.chipsLabel}>
          Search in
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScroll, { paddingBottom: insets.bottom > 0 ? 0 : 16 }]}
          style={styles.chipsScrollView}
        >
          {SEARCH_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.tint : colors.background,
                    borderColor: isSelected ? colors.tint : colors.icon,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Search ${category.label}`}
              >
                <ThemedText
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.background : colors.text },
                  ]}
                  lightColor={isSelected ? colors.background : undefined}
                  darkColor={isSelected ? colors.background : undefined}
                >
                  {category.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.resultsArea}>{resultsContent}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  chipsSection: {
    paddingTop: 24,
  },
  chipsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  chipsScroll: {
    paddingHorizontal: 20,
  },
  chipsScrollView: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultsArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  placeholder: {
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    color: '#e74c3c',
  },
  loadingHeader: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 8,
  },
  animeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  animePoster: {
    width: 56,
    height: 80,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  animeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  animeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  animeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  animeMetaText: {
    fontSize: 13,
    flex: 1,
  },
  animeScore: {
    fontSize: 13,
    fontWeight: '600',
  },
});
