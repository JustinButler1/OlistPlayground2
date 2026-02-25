import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

const PLACEHOLDER_IMAGE = require('../../assets/images/placeholder-thumbnail.png');
const RESULTS_PER_PAGE = 15;
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
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
import { useLists } from '@/contexts/lists-context';
import type { ListEntry, ListEntryType } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ADD_TO_SHEET_ENTRY_TYPE_LABELS: Record<ListEntryType, string> = {
  anime: 'Anime',
  manga: 'Manga',
  movie: 'Movie',
  tv: 'TV',
  book: 'Book',
  game: 'Game',
};

const JIKAN_API = 'https://api.jikan.moe/v4';
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';
const TMDB_SEARCH_MULTI = 'https://api.themoviedb.org/3/search/multi';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';
const IGDB_GAMES_ENDPOINT = 'https://api.igdb.com/v4/games';
const IGDB_IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload';

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

interface JikanManga {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: {
    jpg: { image_url: string; small_image_url: string };
    webp?: { image_url: string; small_image_url: string };
  };
  type: string;
  chapters: number | null;
  volumes: number | null;
  score: number | null;
  synopsis: string | null;
  published?: { from?: string; to?: null | string; prop?: { from?: { year?: number }; to?: { year?: null | number } } };
}

interface JikanMangaSearchResponse {
  data: JikanManga[];
  pagination: { last_visible_page: number };
}

async function searchManga(query: string): Promise<JikanManga[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${JIKAN_API}/manga?q=${encodeURIComponent(query.trim())}&limit=25`
  );
  if (!res.ok) throw new Error('Search failed');
  const json: JikanMangaSearchResponse = await res.json();
  return json.data ?? [];
}

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  edition_count?: number;
}

interface OpenLibrarySearchResponse {
  num_found: number;
  start: number;
  docs: OpenLibraryBook[];
}

async function searchBooks(query: string): Promise<OpenLibraryBook[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query.trim())}&limit=25`
  );
  if (!res.ok) throw new Error('Search failed');
  const json: OpenLibrarySearchResponse = await res.json();
  return json.docs ?? [];
}

type TmdbMediaType = 'movie' | 'tv';

interface TmdbSearchItem {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
}

interface TmdbSearchResponse {
  results: TmdbSearchItem[];
}

interface TmdbMediaResult {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
  voteAverage: number | null;
}

function isTmdbMediaType(value: string): value is TmdbMediaType {
  return value === 'movie' || value === 'tv';
}

function getTmdbApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();
  return key ? key : null;
}

async function searchTmdb(query: string): Promise<TmdbMediaResult[]> {
  if (!query.trim()) return [];
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('missing_api_key');
  }

  const res = await fetch(
    `${TMDB_SEARCH_MULTI}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(
      query.trim()
    )}&include_adult=false&page=1`
  );
  if (!res.ok) throw new Error('tmdb_search_failed');
  const json: TmdbSearchResponse = await res.json();
  return (json.results ?? [])
    .filter((item) => isTmdbMediaType(item.media_type))
    .map((item) => {
      const date = item.media_type === 'movie' ? item.release_date : item.first_air_date;
      const year = date?.slice(0, 4) || null;
      return {
        id: item.id,
        mediaType: item.media_type,
        title: item.title ?? item.name ?? 'Untitled',
        posterPath: item.poster_path ?? null,
        releaseYear: year,
        voteAverage: item.vote_average ?? null,
      };
    });
}

interface IgdbCover {
  id: number;
  image_id: string;
}

interface IgdbPlatform {
  id: number;
  name: string;
}

interface IgdbGame {
  id: number;
  name: string;
  cover?: IgdbCover;
  first_release_date?: number;
  total_rating?: number;
  platforms?: IgdbPlatform[];
}

let igdbAccessToken: string | null = null;
let igdbTokenExpiryMs = 0;

function getIgdbCredentials() {
  const clientId = process.env.EXPO_PUBLIC_IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.EXPO_PUBLIC_IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('missing_igdb_credentials');
  }
  return { clientId, clientSecret };
}

async function getIgdbAccessToken(): Promise<string> {
  const now = Date.now();
  if (igdbAccessToken && igdbTokenExpiryMs > now + 60_000) {
    return igdbAccessToken;
  }

  const { clientId, clientSecret } = getIgdbCredentials();

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
      clientId
    )}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!res.ok) {
    throw new Error('igdb_token_failed');
  }

  const json: { access_token: string; expires_in: number } = await res.json();
  igdbAccessToken = json.access_token;
  igdbTokenExpiryMs = now + (json.expires_in - 60) * 1000;
  return igdbAccessToken;
}

function buildIgdbCoverUrl(cover?: IgdbCover): string | null {
  if (!cover?.image_id) return null;
  // t_cover_big is a common 264x374-ish size variant
  return `${IGDB_IMAGE_BASE}/t_cover_big/${cover.image_id}.jpg`;
}

function formatIgdbYear(firstReleaseDate?: number): string | null {
  if (!firstReleaseDate) return null;
  const date = new Date(firstReleaseDate * 1000);
  const year = date.getFullYear();
  if (!Number.isFinite(year)) return null;
  return String(year);
}

async function searchGames(query: string): Promise<IgdbGame[]> {
  if (!query.trim()) return [];

  const token = await getIgdbAccessToken();
  const { clientId } = getIgdbCredentials();

  const body = [
    `search "${query.replace(/"/g, '\\"').trim()}" ;`,
    'fields name,cover.image_id,first_release_date,total_rating,platforms.name ;',
    'limit 25 ;',
  ].join(' ');

  const res = await fetch(IGDB_GAMES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!res.ok) {
    throw new Error('igdb_search_failed');
  }

  const json: IgdbGame[] = await res.json();
  return json ?? [];
}

const SEARCH_CATEGORIES = [
  { id: 'anime', label: 'Anime' },
  { id: 'tv-movie', label: 'TV/Movie' },
  { id: 'manga', label: 'Manga' },
  { id: 'books', label: 'Books' },
  { id: 'games', label: 'Games' },
] as const;

function sortWithImageFirst<T>(items: T[], hasImage: (item: T) => boolean): T[] {
  return [...items].sort((a, b) => {
    const aHas = hasImage(a);
    const bHas = hasImage(b);
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return 0;
  });
}

function getPageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * RESULTS_PER_PAGE;
  return items.slice(start, start + RESULTS_PER_PAGE);
}

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number]['id'];

export default function SearchScreen() {
  const [selectedCategory, setSelectedCategory] = useState<SearchCategory>('anime');
  const [query, setQuery] = useState('');
  const [animeResults, setAnimeResults] = useState<JikanAnime[]>([]);
  const [mangaResults, setMangaResults] = useState<JikanManga[]>([]);
  const [bookResults, setBookResults] = useState<OpenLibraryBook[]>([]);
  const [tmdbResults, setTmdbResults] = useState<TmdbMediaResult[]>([]);
  const [gameResults, setGameResults] = useState<IgdbGame[]>([]);
  const [searchResultPage, setSearchResultPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addToSheetVisible, setAddToSheetVisible] = useState(false);
  const [pendingAddEntry, setPendingAddEntry] = useState<Omit<ListEntry, 'id'> | null>(null);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [addToSheetView, setAddToSheetView] = useState<'lists' | 'list-detail'>('lists');
  const [openedListId, setOpenedListId] = useState<string | null>(null);
  const { lists, addEntryToList } = useLists();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const colors = Colors[colorScheme ?? 'light'];

  const searchBarBg = colorScheme === 'dark' ? colors.background : colors.icon + '20';

  const runAnimeSearch = useCallback(async (q: string) => {
    if (selectedCategory !== 'anime') return;
    if (!q.trim()) {
      setAnimeResults([]);
      setSearchResultPage(1);
      setSearchError(null);
      return;
    }
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await searchAnime(q);
      setAnimeResults(
        sortWithImageFirst(results, (item) =>
          !!(item.images?.jpg?.image_url ?? item.images?.webp?.image_url ?? item.images?.jpg?.small_image_url)
        )
      );
      setSearchResultPage(1);
    } catch {
      setSearchError('Failed to search. Check your connection.');
      setAnimeResults([]);
      setSearchResultPage(1);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  const runBooksSearch = useCallback(async (q: string) => {
    if (selectedCategory !== 'books') return;
    if (!q.trim()) {
      setBookResults([]);
      setSearchResultPage(1);
      setSearchError(null);
      return;
    }
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await searchBooks(q);
      setBookResults(sortWithImageFirst(results, (item) => !!item.cover_i));
      setSearchResultPage(1);
    } catch {
      setSearchError('Failed to search. Check your connection.');
      setBookResults([]);
      setSearchResultPage(1);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  const runTmdbSearch = useCallback(async (q: string) => {
    if (selectedCategory !== 'tv-movie') return;
    if (!q.trim()) {
      setTmdbResults([]);
      setSearchResultPage(1);
      setSearchError(null);
      return;
    }
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await searchTmdb(q);
      setTmdbResults(sortWithImageFirst(results, (item) => !!item.posterPath));
      setSearchResultPage(1);
    } catch (error) {
      setTmdbResults([]);
      setSearchResultPage(1);
      if (error instanceof Error && error.message === 'missing_api_key') {
        setSearchError('Missing EXPO_PUBLIC_TMDB_API_KEY in your environment.');
      } else {
        setSearchError('Failed to search TMDB. Check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  const runMangaSearch = useCallback(async (q: string) => {
    if (selectedCategory !== 'manga') return;
    if (!q.trim()) {
      setMangaResults([]);
      setSearchResultPage(1);
      setSearchError(null);
      return;
    }
    setIsLoading(true);
    setSearchError(null);
    try {
      const results = await searchManga(q);
      setMangaResults(
        sortWithImageFirst(results, (item) =>
          !!(item.images?.jpg?.image_url ?? item.images?.webp?.image_url ?? item.images?.jpg?.small_image_url)
        )
      );
      setSearchResultPage(1);
    } catch {
      setSearchError('Failed to search. Check your connection.');
      setMangaResults([]);
      setSearchResultPage(1);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  const runGamesSearch = useCallback(
    async (q: string) => {
      if (selectedCategory !== 'games') return;
      if (!q.trim()) {
        setGameResults([]);
        setSearchResultPage(1);
        setSearchError(null);
        return;
      }
      setIsLoading(true);
      setSearchError(null);
      try {
        const results = await searchGames(q);
        setGameResults(
          sortWithImageFirst(results, (item) => !!buildIgdbCoverUrl(item.cover))
        );
        setSearchResultPage(1);
      } catch (error) {
        setGameResults([]);
        setSearchResultPage(1);
        if (error instanceof Error && error.message === 'missing_igdb_credentials') {
          setSearchError('Missing EXPO_PUBLIC_IGDB_CLIENT_ID or EXPO_PUBLIC_IGDB_CLIENT_SECRET.');
        } else if (error instanceof Error && error.message === 'igdb_token_failed') {
          setSearchError('Failed to authenticate with IGDB. Check your credentials.');
        } else {
          setSearchError('Failed to search IGDB. Check your connection.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCategory]
  );

  useEffect(() => {
    setSearchResultPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    const t = setTimeout(() => {
      runAnimeSearch(query);
      runMangaSearch(query);
      runBooksSearch(query);
      runTmdbSearch(query);
      runGamesSearch(query);
    }, 400);
    return () => clearTimeout(t);
  }, [query, runAnimeSearch, runMangaSearch, runBooksSearch, runTmdbSearch, runGamesSearch]);

  const openAddToSheet = useCallback((entry: Omit<ListEntry, 'id'>) => {
    setPendingAddEntry(entry);
    setListSearchQuery('');
    setSelectedListIds([]);
    setAddToSheetView('lists');
    setOpenedListId(null);
    setAddToSheetVisible(true);
  }, []);

  const closeAddToSheet = useCallback(() => {
    setAddToSheetVisible(false);
    setPendingAddEntry(null);
    setListSearchQuery('');
    setSelectedListIds([]);
    setAddToSheetView('lists');
    setOpenedListId(null);
  }, []);

  const toggleListSelection = useCallback((listId: string) => {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  }, []);

  const openListInSheet = useCallback((listId: string) => {
    setOpenedListId(listId);
    setAddToSheetView('list-detail');
  }, []);

  const goBackToListSelection = useCallback(() => {
    setAddToSheetView('lists');
    setOpenedListId(null);
  }, []);

  const confirmAddToSelectedLists = useCallback(() => {
    if (!pendingAddEntry) return;
    selectedListIds.forEach((listId) => addEntryToList(listId, pendingAddEntry));
    closeAddToSheet();
  }, [pendingAddEntry, selectedListIds, addEntryToList, closeAddToSheet]);

  const filteredLists = useMemo(() => {
    if (!listSearchQuery.trim()) return lists;
    const q = listSearchQuery.trim().toLowerCase();
    return lists.filter((l) => l.title.toLowerCase().includes(q));
  }, [lists, listSearchQuery]);

  const renderAnimeItem = useCallback(
    ({ item }: { item: JikanAnime }) => {
      const img = item.images?.jpg?.image_url ?? item.images?.webp?.image_url ?? item.images?.jpg?.small_image_url;
      const entry: Omit<ListEntry, 'id'> = {
        title: item.title,
        type: 'anime',
        imageUrl: img ?? undefined,
        detailPath: `anime/${item.mal_id}`,
        ...(item.episodes != null ? { totalEpisodes: item.episodes } : {}),
      };
      return (
        <View style={styles.animeRow}>
          <Pressable
            onPress={() => router.push(`/anime/${item.mal_id}`)}
            style={({ pressed }) => [
              styles.animeRowMain,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessible
            accessibilityRole="button"
          >
            <Image
              source={img ? { uri: img } : PLACEHOLDER_IMAGE}
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
          <Pressable
            onPress={() => openAddToSheet(entry)}
            style={({ pressed }) => [
              styles.addToListButton,
              { borderColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add to list"
          >
            <IconSymbol name="plus" size={22} color={colors.tint} />
          </Pressable>
        </View>
      );
    },
    [colors.icon, router, openAddToSheet]
  );

  const animeKeyExtractor = useCallback((item: JikanAnime) => String(item.mal_id), []);

  const renderMangaItem = useCallback(
    ({ item }: { item: JikanManga }) => {
      const img = item.images?.jpg?.image_url ?? item.images?.webp?.image_url ?? item.images?.jpg?.small_image_url;
      const year = item.published?.prop?.from?.year ?? item.published?.prop?.to?.year ?? null;
      const entry: Omit<ListEntry, 'id'> = {
        title: item.title,
        type: 'manga',
        imageUrl: img ?? undefined,
        detailPath: `manga/${item.mal_id}`,
        ...(item.chapters != null ? { totalChapters: item.chapters } : {}),
        ...(item.volumes != null ? { totalVolumes: item.volumes } : {}),
      };
      return (
        <View style={styles.animeRow}>
          <Pressable
            onPress={() => router.push(`/manga/${item.mal_id}`)}
            style={({ pressed }) => [
              styles.animeRowMain,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessible
            accessibilityRole="button"
          >
            <Image
              source={img ? { uri: img } : PLACEHOLDER_IMAGE}
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
                    {item.volumes != null ? ` · ${item.volumes} vol` : ''}
                    {item.chapters != null ? ` · ${item.chapters} ch` : ''}
                    {year ? ` · ${year}` : ''}
                  </ThemedText>
                ) : null}
                {item.score != null && (
                  <ThemedText style={styles.animeScore}>★ {item.score}</ThemedText>
                )}
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => openAddToSheet(entry)}
            style={({ pressed }) => [
              styles.addToListButton,
              { borderColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add to list"
          >
            <IconSymbol name="plus" size={22} color={colors.tint} />
          </Pressable>
        </View>
      );
    },
    [colors.icon, router, openAddToSheet]
  );

  const mangaKeyExtractor = useCallback((item: JikanManga) => String(item.mal_id), []);

  const renderBookItem = useCallback(
    ({ item }: { item: OpenLibraryBook }) => {
      const coverUri = item.cover_i
        ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
        : undefined;
      const author = item.author_name?.join(', ');
      const bookSlug = item.key.replace(/^\//, '').replace(/\//g, '--');
      const entry: Omit<ListEntry, 'id'> = {
        title: item.title,
        type: 'book',
        imageUrl: coverUri,
        detailPath: `books/${bookSlug}`,
      };
      return (
        <View style={styles.animeRow}>
          <Pressable
            onPress={() => router.push(`/books/${bookSlug}`)}
            style={({ pressed }) => [
              styles.animeRowMain,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessible
            accessibilityRole="button"
          >
            <Image
              source={coverUri ? { uri: coverUri } : PLACEHOLDER_IMAGE}
              style={styles.animePoster}
              contentFit="cover"
            />
            <View style={styles.animeInfo}>
              <ThemedText style={styles.animeTitle} numberOfLines={2}>
                {item.title}
              </ThemedText>
              <View style={styles.animeMeta}>
                {author ? (
                  <ThemedText style={[styles.animeMetaText, { color: colors.icon }]} numberOfLines={1}>
                    {author}
                    {item.first_publish_year ? ` · ${item.first_publish_year}` : ''}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => openAddToSheet(entry)}
            style={({ pressed }) => [
              styles.addToListButton,
              { borderColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add to list"
          >
            <IconSymbol name="plus" size={22} color={colors.tint} />
          </Pressable>
        </View>
      );
    },
    [colors.icon, router, openAddToSheet]
  );

  const bookKeyExtractor = useCallback((item: OpenLibraryBook) => item.key, []);

  const renderGameItem = useCallback(
    ({ item }: { item: IgdbGame }) => {
      const coverUri = buildIgdbCoverUrl(item.cover) ?? undefined;
      const year = formatIgdbYear(item.first_release_date);
      const platforms = item.platforms?.map((p) => p.name).filter(Boolean) ?? [];
      const rating =
        typeof item.total_rating === 'number' && item.total_rating > 0
          ? Math.round(item.total_rating)
          : null;
      const entry: Omit<ListEntry, 'id'> = {
        title: item.name,
        type: 'game',
        imageUrl: coverUri,
        detailPath: `games/${item.id}`,
      };

      return (
        <View style={styles.animeRow}>
          <Pressable
            onPress={() => router.push(`/games/${item.id}`)}
            style={({ pressed }) => [
              styles.animeRowMain,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessible
            accessibilityRole="button"
          >
            <Image
              source={coverUri ? { uri: coverUri } : PLACEHOLDER_IMAGE}
              style={styles.animePoster}
              contentFit="cover"
            />
            <View style={styles.animeInfo}>
              <ThemedText style={styles.animeTitle} numberOfLines={2}>
                {item.name}
              </ThemedText>
              <View style={styles.animeMeta}>
                <ThemedText style={[styles.animeMetaText, { color: colors.icon }]} numberOfLines={2}>
                  {year ? `${year}` : 'Unknown year'}
                  {platforms.length ? ` · ${platforms.slice(0, 3).join(', ')}` : ''}
                </ThemedText>
                {rating != null && (
                  <ThemedText style={styles.animeScore}>★ {rating}</ThemedText>
                )}
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => openAddToSheet(entry)}
            style={({ pressed }) => [
              styles.addToListButton,
              { borderColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add to list"
          >
            <IconSymbol name="plus" size={22} color={colors.tint} />
          </Pressable>
        </View>
      );
    },
    [colors.icon, router, openAddToSheet]
  );

  const gameKeyExtractor = useCallback((item: IgdbGame) => String(item.id), []);

  const renderTmdbItem = useCallback(
    ({ item }: { item: TmdbMediaResult }) => {
      const posterUri = item.posterPath ? `${TMDB_IMAGE_BASE}${item.posterPath}` : undefined;
      const formattedScore =
        item.voteAverage != null && item.voteAverage > 0 ? item.voteAverage.toFixed(1) : null;
      const entry: Omit<ListEntry, 'id'> = {
        title: item.title,
        type: item.mediaType,
        imageUrl: posterUri,
        detailPath: `tv-movie/${item.mediaType}/${item.id}`,
      };
      return (
        <View style={styles.animeRow}>
          <Pressable
            onPress={() =>
              router.push(`/tv-movie/${item.mediaType}/${item.id}` as const)
            }
            style={({ pressed }) => [
              styles.animeRowMain,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessible
            accessibilityRole="button"
          >
            <Image
              source={posterUri ? { uri: posterUri } : PLACEHOLDER_IMAGE}
              style={styles.animePoster}
              contentFit="cover"
            />
            <View style={styles.animeInfo}>
              <ThemedText style={styles.animeTitle} numberOfLines={2}>
                {item.title}
              </ThemedText>
              <View style={styles.animeMeta}>
                <ThemedText style={[styles.animeMetaText, { color: colors.icon }]} numberOfLines={1}>
                  {item.mediaType === 'movie' ? 'Movie' : 'TV'}
                  {item.releaseYear ? ` · ${item.releaseYear}` : ''}
                </ThemedText>
                {formattedScore ? (
                  <ThemedText style={styles.animeScore}>★ {formattedScore}</ThemedText>
                ) : null}
              </View>
            </View>
          </Pressable>
          <Pressable
            onPress={() => openAddToSheet(entry)}
            style={({ pressed }) => [
              styles.addToListButton,
              { borderColor: colors.tint, opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add to list"
          >
            <IconSymbol name="plus" size={22} color={colors.tint} />
          </Pressable>
        </View>
      );
    },
    [colors.icon, router, openAddToSheet]
  );

  const tmdbKeyExtractor = useCallback(
    (item: TmdbMediaResult) => `${item.mediaType}-${item.id}`,
    []
  );

  const resultsContent = useMemo(() => {
    if (selectedCategory === 'games') {
      if (searchError) {
        return (
          <ThemedText style={[styles.placeholder, styles.errorText]}>{searchError}</ThemedText>
        );
      }
      if (isLoading && gameResults.length === 0) {
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
            Type a game title to search via IGDB
          </ThemedText>
        );
      }
      if (gameResults.length === 0) {
        return (
          <ThemedText style={styles.placeholder}>No games found for "{query}"</ThemedText>
        );
      }
      const totalPages = Math.ceil(gameResults.length / RESULTS_PER_PAGE) || 1;
      const paginatedGames = getPageSlice(gameResults, searchResultPage);
      return (
        <FlatList
          data={paginatedGames}
          keyExtractor={gameKeyExtractor}
          renderItem={renderGameItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isLoading ? (
              <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.max(1, p - 1))}
                  disabled={searchResultPage <= 1}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage <= 1 || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Previous
                  </ThemedText>
                </Pressable>
                <ThemedText style={[styles.paginationLabel, { color: colors.icon }]}>
                  Page {searchResultPage} of {totalPages}
                </ThemedText>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.min(totalPages, p + 1))}
                  disabled={searchResultPage >= totalPages}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage >= totalPages || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />
      );
    }
    if (selectedCategory === 'books') {
      if (searchError) {
        return (
          <ThemedText style={[styles.placeholder, styles.errorText]}>{searchError}</ThemedText>
        );
      }
      if (isLoading && bookResults.length === 0) {
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
            Type a book title or author to search via Open Library
          </ThemedText>
        );
      }
      if (bookResults.length === 0) {
        return (
          <ThemedText style={styles.placeholder}>No books found for "{query}"</ThemedText>
        );
      }
      const totalPages = Math.ceil(bookResults.length / RESULTS_PER_PAGE) || 1;
      const paginatedBooks = getPageSlice(bookResults, searchResultPage);
      return (
        <FlatList
          data={paginatedBooks}
          keyExtractor={bookKeyExtractor}
          renderItem={renderBookItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isLoading ? (
              <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.max(1, p - 1))}
                  disabled={searchResultPage <= 1}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage <= 1 || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Previous
                  </ThemedText>
                </Pressable>
                <ThemedText style={[styles.paginationLabel, { color: colors.icon }]}>
                  Page {searchResultPage} of {totalPages}
                </ThemedText>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.min(totalPages, p + 1))}
                  disabled={searchResultPage >= totalPages}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage >= totalPages || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />
      );
    }
    if (selectedCategory === 'tv-movie') {
      if (searchError) {
        return (
          <ThemedText style={[styles.placeholder, styles.errorText]}>{searchError}</ThemedText>
        );
      }
      if (isLoading && tmdbResults.length === 0) {
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
            Type a movie or TV show title to search TMDB
          </ThemedText>
        );
      }
      if (tmdbResults.length === 0) {
        return (
          <ThemedText style={styles.placeholder}>No TV/Movie results found for "{query}"</ThemedText>
        );
      }
      const totalPages = Math.ceil(tmdbResults.length / RESULTS_PER_PAGE) || 1;
      const paginatedTmdb = getPageSlice(tmdbResults, searchResultPage);
      return (
        <FlatList
          data={paginatedTmdb}
          keyExtractor={tmdbKeyExtractor}
          renderItem={renderTmdbItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isLoading ? (
              <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.max(1, p - 1))}
                  disabled={searchResultPage <= 1}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage <= 1 || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Previous
                  </ThemedText>
                </Pressable>
                <ThemedText style={[styles.paginationLabel, { color: colors.icon }]}>
                  Page {searchResultPage} of {totalPages}
                </ThemedText>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.min(totalPages, p + 1))}
                  disabled={searchResultPage >= totalPages}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage >= totalPages || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />
      );
    }
    if (selectedCategory === 'manga') {
      if (searchError) {
        return (
          <ThemedText style={[styles.placeholder, styles.errorText]}>{searchError}</ThemedText>
        );
      }
      if (isLoading && mangaResults.length === 0) {
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
            Type a manga name to search via Jikan (MyAnimeList)
          </ThemedText>
        );
      }
      if (mangaResults.length === 0) {
        return (
          <ThemedText style={styles.placeholder}>No manga found for "{query}"</ThemedText>
        );
      }
      const totalPages = Math.ceil(mangaResults.length / RESULTS_PER_PAGE) || 1;
      const paginatedManga = getPageSlice(mangaResults, searchResultPage);
      return (
        <FlatList
          data={paginatedManga}
          keyExtractor={mangaKeyExtractor}
          renderItem={renderMangaItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isLoading ? (
              <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.max(1, p - 1))}
                  disabled={searchResultPage <= 1}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage <= 1 || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Previous
                  </ThemedText>
                </Pressable>
                <ThemedText style={[styles.paginationLabel, { color: colors.icon }]}>
                  Page {searchResultPage} of {totalPages}
                </ThemedText>
                <Pressable
                  onPress={() => setSearchResultPage((p) => Math.min(totalPages, p + 1))}
                  disabled={searchResultPage >= totalPages}
                  style={({ pressed }) => [
                    styles.paginationButton,
                    { backgroundColor: colors.tint + '25' },
                    (searchResultPage >= totalPages || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                    Next
                  </ThemedText>
                </Pressable>
              </View>
            ) : null
          }
        />
      );
    }
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
    const totalPages = Math.ceil(animeResults.length / RESULTS_PER_PAGE) || 1;
    const paginatedAnime = getPageSlice(animeResults, searchResultPage);
    return (
      <FlatList
        data={paginatedAnime}
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
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.paginationRow}>
              <Pressable
                onPress={() => setSearchResultPage((p) => Math.max(1, p - 1))}
                disabled={searchResultPage <= 1}
                style={({ pressed }) => [
                  styles.paginationButton,
                  { backgroundColor: colors.tint + '25' },
                  (searchResultPage <= 1 || pressed) && { opacity: 0.6 },
                ]}
              >
                <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                Previous
                </ThemedText>
              </Pressable>
              <ThemedText style={[styles.paginationLabel, { color: colors.icon }]}>
                Page {searchResultPage} of {totalPages}
              </ThemedText>
              <Pressable
                onPress={() => setSearchResultPage((p) => Math.min(totalPages, p + 1))}
                disabled={searchResultPage >= totalPages}
                style={({ pressed }) => [
                  styles.paginationButton,
                  { backgroundColor: colors.tint + '25' },
                  (searchResultPage >= totalPages || pressed) && { opacity: 0.6 },
                ]}
              >
                <ThemedText style={[styles.paginationButtonText, { color: colors.tint }]}>
                  Next
                </ThemedText>
              </Pressable>
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
    searchResultPage,
    animeResults,
    mangaResults,
    gameResults,
    bookResults,
    tmdbResults,
    colors.tint,
    colors.icon,
    insets.bottom,
    renderAnimeItem,
    renderMangaItem,
    renderBookItem,
    renderGameItem,
    renderTmdbItem,
    animeKeyExtractor,
    mangaKeyExtractor,
    bookKeyExtractor,
    gameKeyExtractor,
    tmdbKeyExtractor,
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

      <Modal
        visible={addToSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAddToSheet}
      >
        <Pressable style={styles.addToSheetOverlay} onPress={closeAddToSheet}>
          <Pressable
            style={[
              styles.addToSheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 24,
                height: Dimensions.get('window').height * 0.95,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.addToSheetHeader, { borderBottomColor: colors.icon + '30' }]}>
              <Pressable
                onPress={
                  addToSheetView === 'list-detail' ? goBackToListSelection : closeAddToSheet
                }
                style={({ pressed }) => [
                  styles.addToSheetHeaderBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={addToSheetView === 'list-detail' ? 'Back' : 'Close'}
              >
                {addToSheetView === 'list-detail' ? (
                  <IconSymbol name="chevron.left" size={24} color={colors.text} />
                ) : (
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                )}
              </Pressable>
              <ThemedText type="subtitle" style={styles.addToSheetTitle} numberOfLines={1}>
                {addToSheetView === 'list-detail' && openedListId
                  ? (lists.find((l) => l.id === openedListId)?.title ?? 'List')
                  : 'Add to list'}
              </ThemedText>
              {addToSheetView === 'lists' ? (
                <Pressable
                  onPress={confirmAddToSelectedLists}
                  style={({ pressed }) => [
                    styles.addToSheetHeaderBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add to selected lists"
                >
                  <IconSymbol name="checkmark" size={24} color={colors.tint} />
                </Pressable>
              ) : (
                <View style={styles.addToSheetHeaderBtn} />
              )}
            </View>

            {addToSheetView === 'lists' ? (
              <>
                <View style={styles.addToSheetSearchWrap}>
                  <View style={[styles.addToSheetSearchBar, { backgroundColor: colors.icon + '20' }]}>
                    <IconSymbol name="magnifyingglass" size={18} color={colors.icon} />
                    <TextInput
                      style={[styles.addToSheetSearchInput, { color: colors.text }]}
                      placeholder="Search lists..."
                      placeholderTextColor={colors.icon}
                      value={listSearchQuery}
                      onChangeText={setListSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                <FlatList
                  data={filteredLists}
                  keyExtractor={(l) => l.id}
                  renderItem={({ item: list }) => {
                    const isSelected = selectedListIds.includes(list.id);
                    const listImage =
                      list.entries[0]?.imageUrl ?? null;
                    return (
                      <View style={styles.addToSheetListRow}>
                        <Pressable
                          onPress={() => toggleListSelection(list.id)}
                          style={({ pressed }) => [
                            styles.addToSheetListRowMain,
                            {
                              backgroundColor: pressed ? colors.icon + '12' : 'transparent',
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${list.title}`}
                        >
                          <View
                            style={[
                              styles.addToSheetSelectionCircle,
                              {
                                borderColor: colors.tint,
                                backgroundColor: isSelected ? colors.tint : 'transparent',
                              },
                            ]}
                          >
                            {isSelected ? (
                              <IconSymbol name="checkmark" size={14} color={colors.background} />
                            ) : null}
                          </View>
                          <Image
                            source={
                              listImage
                                ? { uri: listImage }
                                : PLACEHOLDER_IMAGE
                            }
                            style={styles.addToSheetListThumb}
                            contentFit="cover"
                          />
                          <View style={styles.addToSheetListRowInfo}>
                            <ThemedText style={styles.addToSheetListRowTitle} numberOfLines={2}>
                              {list.title}
                            </ThemedText>
                            <ThemedText style={[styles.addToSheetListRowCount, { color: colors.icon }]}>
                              {list.entries.length} item{list.entries.length !== 1 ? 's' : ''}
                            </ThemedText>
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={() => openListInSheet(list.id)}
                          style={({ pressed }) => [
                            styles.addToSheetChevronZone,
                            { opacity: pressed ? 0.7 : 1 },
                          ]}
                          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${list.title}`}
                        >
                          <IconSymbol name="chevron.right" size={24} color={colors.icon} />
                        </Pressable>
                      </View>
                    );
                  }}
                  contentContainerStyle={styles.addToSheetListContent}
                  ListEmptyComponent={
                    <ThemedText style={[styles.addToSheetEmpty, { color: colors.icon }]}>
                      {listSearchQuery.trim() ? 'No lists match your search.' : 'No lists yet.'}
                    </ThemedText>
                  }
                />
              </>
            ) : (
              openedListId && (() => {
                const openedList = lists.find((l) => l.id === openedListId);
                const entries = openedList?.entries ?? [];
                return (
                  <FlatList
                    data={entries}
                    keyExtractor={(e) => e.id}
                    renderItem={({ item: entry }) => (
                      <View style={styles.addToSheetEntryRow}>
                        <Image
                          source={
                            entry.imageUrl
                              ? { uri: entry.imageUrl }
                              : PLACEHOLDER_IMAGE
                          }
                          style={styles.addToSheetEntryThumb}
                          contentFit="cover"
                        />
                        <View style={styles.addToSheetEntryInfo}>
                          <ThemedText style={styles.addToSheetEntryTitle} numberOfLines={2}>
                            {entry.title}
                          </ThemedText>
                          <View style={[styles.addToSheetEntryTypeChip, { backgroundColor: colors.icon + '25' }]}>
                            <ThemedText style={[styles.addToSheetEntryTypeText, { color: colors.tint }]}>
                              {ADD_TO_SHEET_ENTRY_TYPE_LABELS[entry.type]}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    )}
                    contentContainerStyle={styles.addToSheetListContent}
                    ListEmptyComponent={
                      <ThemedText style={[styles.addToSheetEmpty, { color: colors.icon }]}>
                        This list is empty.
                      </ThemedText>
                    }
                  />
                );
              })()
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  animeRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addToListButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  animePoster: {
    width: 56,
    height: 80,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  bookPlaceholder: {
    backgroundColor: 'rgba(128,128,128,0.25)',
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
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  paginationButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  paginationButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  paginationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  addToSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  addToSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  addToSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addToSheetHeaderBtn: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  addToSheetTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  addToSheetSearchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addToSheetSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addToSheetSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  addToSheetListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  addToSheetListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  addToSheetListRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 8,
  },
  addToSheetSelectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToSheetListThumb: {
    width: 56,
    height: 80,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  addToSheetListRowInfo: {
    flex: 1,
    marginLeft: 14,
  },
  addToSheetListRowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  addToSheetListRowCount: {
    fontSize: 13,
  },
  addToSheetChevronZone: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToSheetEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  addToSheetEntryThumb: {
    width: 56,
    height: 80,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  addToSheetEntryInfo: {
    flex: 1,
    marginLeft: 14,
  },
  addToSheetEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addToSheetEntryTypeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addToSheetEntryTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addToSheetEmpty: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 15,
  },
});
