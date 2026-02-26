import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useLists } from "@/contexts/lists-context";
import type { ListEntry, ListEntryType, MockList } from "@/data/mock-lists";
import { useColorScheme } from "@/hooks/use-color-scheme";

const ENTRY_TYPE_LABELS: Record<ListEntryType, string> = {
  anime: "Anime",
  manga: "Manga",
  movie: "Movie",
  tv: "TV",
  book: "Book",
  game: "Game",
  list: "List",
};

const JIKAN_API = "https://api.jikan.moe/v4";
const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json";
const TMDB_SEARCH_MULTI = "https://api.themoviedb.org/3/search/multi";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";
const IGDB_GAMES_ENDPOINT = "https://api.igdb.com/v4/games";
const IGDB_IMAGE_BASE = "https://images.igdb.com/igdb/image/upload";

interface SimpleAnimeSearchResult {
  id: number;
  title: string;
  imageUrl?: string;
  episodes?: number | null;
}

interface SimpleMangaSearchResult {
  id: number;
  title: string;
  imageUrl?: string;
  chapters?: number | null;
  volumes?: number | null;
}

interface SimpleBookSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  detailPath: string;
}

type TmdbMediaType = "movie" | "tv";

interface SimpleTmdbSearchResult {
  id: number;
  title: string;
  imageUrl?: string;
  mediaType: TmdbMediaType;
  detailPath: string;
}

interface SimpleGameSearchResult {
  id: number;
  title: string;
  imageUrl?: string;
  detailPath: string;
}

async function searchAnimeForList(
  query: string,
): Promise<SimpleAnimeSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${JIKAN_API}/anime?q=${encodeURIComponent(query.trim())}&limit=25`,
  );
  if (!res.ok) throw new Error("Search failed");
  const json: {
    data: {
      mal_id: number;
      title: string;
      episodes?: number | null;
      images?: {
        jpg?: { image_url?: string; small_image_url?: string };
        webp?: { image_url?: string; small_image_url?: string };
      };
    }[];
  } = await res.json();
  return (json.data ?? []).map((item) => {
    const img =
      item.images?.jpg?.image_url ??
      item.images?.webp?.image_url ??
      item.images?.jpg?.small_image_url ??
      item.images?.webp?.small_image_url;
    return {
      id: item.mal_id,
      title: item.title,
      imageUrl: img ?? undefined,
      episodes: item.episodes ?? undefined,
    };
  });
}

async function searchMangaForList(
  query: string,
): Promise<SimpleMangaSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${JIKAN_API}/manga?q=${encodeURIComponent(query.trim())}&limit=25`,
  );
  if (!res.ok) throw new Error("Search failed");
  const json: {
    data: {
      mal_id: number;
      title: string;
      chapters?: number | null;
      volumes?: number | null;
      images?: {
        jpg?: { image_url?: string; small_image_url?: string };
        webp?: { image_url?: string; small_image_url?: string };
      };
    }[];
  } = await res.json();
  return (json.data ?? []).map((item) => {
    const img =
      item.images?.jpg?.image_url ??
      item.images?.webp?.image_url ??
      item.images?.jpg?.small_image_url ??
      item.images?.webp?.small_image_url;
    return {
      id: item.mal_id,
      title: item.title,
      imageUrl: img ?? undefined,
      chapters: item.chapters ?? undefined,
      volumes: item.volumes ?? undefined,
    };
  });
}

async function searchBooksForList(
  query: string,
): Promise<SimpleBookSearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query.trim())}&limit=25`,
  );
  if (!res.ok) throw new Error("Search failed");
  const json: {
    docs: {
      key: string;
      title: string;
      author_name?: string[];
      first_publish_year?: number;
      cover_i?: number;
    }[];
  } = await res.json();
  return (json.docs ?? []).map((doc) => {
    const coverUri = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined;
    const author = doc.author_name?.join(", ");
    const year = doc.first_publish_year;
    const subtitleParts = [];
    if (author) subtitleParts.push(author);
    if (year) subtitleParts.push(String(year));
    const subtitle = subtitleParts.length ? subtitleParts.join(" · ") : undefined;
    const bookSlug = doc.key.replace(/^\//, "").replace(/\//g, "--");
    return {
      id: doc.key,
      title: doc.title,
      subtitle,
      imageUrl: coverUri,
      detailPath: `books/${bookSlug}`,
    };
  });
}

function getTmdbApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();
  return key || null;
}

function isTmdbMediaType(value: string): value is TmdbMediaType {
  return value === "movie" || value === "tv";
}

async function searchTmdbForList(
  query: string,
): Promise<SimpleTmdbSearchResult[]> {
  if (!query.trim()) return [];
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error("missing_api_key");
  }

  const res = await fetch(
    `${TMDB_SEARCH_MULTI}?api_key=${encodeURIComponent(
      apiKey,
    )}&query=${encodeURIComponent(
      query.trim(),
    )}&include_adult=false&page=1`,
  );
  if (!res.ok) throw new Error("tmdb_search_failed");
  const json: {
    results: {
      id: number;
      media_type: string;
      title?: string;
      name?: string;
      poster_path?: string | null;
      release_date?: string;
      first_air_date?: string;
    }[];
  } = await res.json();

  return (json.results ?? [])
    .filter((item) => isTmdbMediaType(item.media_type))
    .map((item) => {
      const mediaType: TmdbMediaType =
        item.media_type === "movie" ? "movie" : "tv";
      const title = item.title ?? item.name ?? "Untitled";
      const posterPath = item.poster_path ?? null;
      const detailPath = `tv-movie/${mediaType}/${item.id}`;
      return {
        id: item.id,
        title,
        imageUrl: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : undefined,
        mediaType,
        detailPath,
      };
    });
}

let igdbAccessToken: string | null = null;
let igdbTokenExpiryMs = 0;

function getIgdbCredentials() {
  const clientId = process.env.EXPO_PUBLIC_IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.EXPO_PUBLIC_IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("missing_igdb_credentials");
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
      clientId,
    )}&client_secret=${encodeURIComponent(
      clientSecret,
    )}&grant_type=client_credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!res.ok) {
    throw new Error("igdb_token_failed");
  }

  const json: { access_token: string; expires_in: number } = await res.json();
  igdbAccessToken = json.access_token;
  igdbTokenExpiryMs = now + (json.expires_in - 60) * 1000;
  return igdbAccessToken;
}

function buildIgdbCoverUrl(imageId?: string | null): string | null {
  if (!imageId) return null;
  return `${IGDB_IMAGE_BASE}/t_cover_big/${imageId}.jpg`;
}

async function searchGamesForList(
  query: string,
): Promise<SimpleGameSearchResult[]> {
  if (!query.trim()) return [];

  const token = await getIgdbAccessToken();
  const { clientId } = getIgdbCredentials();

  const body = [
    `search "${query.replace(/"/g, '\\"').trim()}" ;`,
    "fields name,cover.image_id,first_release_date,total_rating,platforms.name ;",
    "limit 25 ;",
  ].join(" ");

  const res = await fetch(IGDB_GAMES_ENDPOINT, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!res.ok) {
    throw new Error("igdb_search_failed");
  }

  const json: {
    id: number;
    name: string;
    cover?: { image_id?: string | null };
  }[] = await res.json();

  return (json ?? []).map((game) => {
    const cover = buildIgdbCoverUrl(game.cover?.image_id ?? null);
    return {
      id: game.id,
      title: game.name,
      imageUrl: cover ?? undefined,
      detailPath: `games/${game.id}`,
    };
  });
}

export type ExistingSearchResult =
  | { kind: "list"; list: MockList }
  | { kind: "entry"; entry: ListEntry; list: MockList };

function findEntryById(
  lists: MockList[],
  entryId: string,
): { entry: ListEntry; list: MockList } | null {
  for (const list of lists) {
    const entry = list.entries.find((e) => e.id === entryId);
    if (entry) return { entry, list };
  }
  return null;
}

function getDisplayEntry(
  lists: MockList[],
  item: ListEntry,
): ListEntry {
  if (item.linkedEntryId) {
    const found = findEntryById(lists, item.linkedEntryId);
    return found ? found.entry : item;
  }
  if (item.linkedListId) {
    const targetList = lists.find((l) => l.id === item.linkedListId);
    return targetList
      ? {
          ...item,
          title: targetList.title,
          detailPath: `list/${targetList.id}`,
        }
      : item;
  }
  return item;
}

export default function ListDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { lists, addEntryToList } = useLists();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const list = id ? lists.find((l) => l.id === id) : null;
  const headerTitle = title ?? list?.title ?? "List";
  const entries = list?.entries ?? [];

  const [addItemSheetVisible, setAddItemSheetVisible] = useState(false);
  const [addItemMode, setAddItemMode] = useState<"custom" | "search">("custom");
  const [customTitle, setCustomTitle] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [customFields, setCustomFields] = useState<
    { title: string; value: string; format?: "text" | "numbers" }[]
  >([]);
  const [formatPickerFieldIndex, setFormatPickerFieldIndex] = useState<
    number | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [animeResults, setAnimeResults] = useState<SimpleAnimeSearchResult[]>(
    [],
  );
  const [mangaResults, setMangaResults] = useState<SimpleMangaSearchResult[]>(
    [],
  );
  const [bookResults, setBookResults] = useState<SimpleBookSearchResult[]>([]);
  const [tmdbResults, setTmdbResults] = useState<SimpleTmdbSearchResult[]>([]);
  const [gameResults, setGameResults] = useState<SimpleGameSearchResult[]>([]);
  const [existingResults, setExistingResults] = useState<ExistingSearchResult[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState({
    anime: true,
    manga: true,
    books: true,
    tvMovie: true,
    games: true,
    existing: true,
  });
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [displaySimple, setDisplaySimple] = useState(false);
  const [displayCheckbox, setDisplayCheckbox] = useState(false);
  const [displayDetails, setDisplayDetails] = useState(true);
  const [checkedById, setCheckedById] = useState<Record<string, boolean>>({});
  const [focusedSource, setFocusedSource] = useState<
    "anime" | "manga" | "books" | "tvMovie" | "games" | "existing" | null
  >(null);

  const openAddItemSheet = useCallback(() => {
    setAddItemMode("custom");
    setFormatPickerFieldIndex(null);
    setCustomTitle("");
    setCustomNotes("");
    setCustomFields([]);
    setSearchQuery("");
    setAnimeResults([]);
    setMangaResults([]);
    setBookResults([]);
    setTmdbResults([]);
    setGameResults([]);
    setExistingResults([]);
    setSearchError(null);
    setSearchSources({
      anime: true,
      manga: true,
      books: true,
      tvMovie: true,
      games: true,
      existing: true,
    });
    setDisplaySimple(false);
    setDisplayCheckbox(false);
    setDisplayDetails(true);
    setFocusedSource(null);
    setAddItemSheetVisible(true);
  }, []);

  const closeAddItemSheet = useCallback(() => {
    setAddItemSheetVisible(false);
    setFormatPickerFieldIndex(null);
    setCustomTitle("");
    setCustomNotes("");
    setCustomFields([]);
    setSearchQuery("");
    setAnimeResults([]);
    setMangaResults([]);
    setBookResults([]);
    setTmdbResults([]);
    setGameResults([]);
    setExistingResults([]);
    setSearchError(null);
    setSearchSources({
      anime: true,
      manga: true,
      books: true,
      tvMovie: true,
      games: true,
      existing: true,
    });
    setDisplaySimple(false);
    setDisplayCheckbox(false);
    setDisplayDetails(true);
    setFocusedSource(null);
  }, []);

  const confirmAddCustomItem = useCallback(() => {
    if (!list) return;
    const trimmedTitle = customTitle.trim();
    if (!trimmedTitle) return;
    const variant: ListEntry["displayVariant"] = displaySimple
      ? "simple"
      : displayCheckbox && displayDetails
      ? "checkbox-details"
      : displayCheckbox
      ? "checkbox"
      : "details";
    const fields =
      customFields
        .filter((f) => f.title.trim() || f.value.trim())
        .map((f) => ({
          title: f.title.trim(),
          value: f.value.trim(),
          format: f.format ?? "text",
        })) || [];
    addEntryToList(list.id, {
      title: trimmedTitle,
      type: "book",
      notes: customNotes.trim() || undefined,
      customFields: fields.length > 0 ? fields : undefined,
      displayVariant: variant,
    });
    closeAddItemSheet();
  }, [
    addEntryToList,
    closeAddItemSheet,
    customTitle,
    customNotes,
    customFields,
    list,
    displaySimple,
    displayCheckbox,
    displayDetails,
  ]);

  const addCustomField = useCallback(() => {
    setCustomFields((prev) => [
      ...prev,
      { title: "", value: "", format: "text" as const },
    ]);
  }, []);

  const removeCustomField = useCallback((index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
    setFormatPickerFieldIndex((prev) =>
      prev === index ? null : prev !== null && prev > index ? prev - 1 : prev
    );
  }, []);

  const updateCustomField = useCallback(
    (index: number, key: "title" | "value" | "format", textOrFormat: string) => {
      setCustomFields((prev) =>
        prev.map((f, i) =>
          i === index
            ? key === "format"
              ? { ...f, format: textOrFormat as "text" | "numbers" }
              : { ...f, [key]: textOrFormat }
            : f
        )
      );
    },
    []
  );

  const setCustomFieldFormat = useCallback(
    (index: number, format: "text" | "numbers") => {
      setCustomFields((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                format,
                value:
                  format === "numbers" ? f.value.replace(/\D/g, "") : f.value,
              }
            : f
        )
      );
      setFormatPickerFieldIndex(null);
    },
    []
  );

  const runAllSearches = useCallback(async () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setAnimeResults([]);
      setMangaResults([]);
      setBookResults([]);
      setTmdbResults([]);
      setGameResults([]);
      setExistingResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }
    setFocusedSource(null);
    setIsSearching(true);
    setSearchError(null);
    try {
      const promises: Promise<void>[] = [];

      if (searchSources.existing) {
        const existing: ExistingSearchResult[] = [];
        const currentListId = list?.id;
        for (const l of lists) {
          if (l.id === currentListId) continue;
          if (l.title.toLowerCase().includes(q)) {
            existing.push({ kind: "list", list: l });
          }
          for (const entry of l.entries) {
            if (entry.title.toLowerCase().includes(q)) {
              existing.push({ kind: "entry", entry, list: l });
            }
          }
        }
        setExistingResults(existing);
      } else {
        setExistingResults([]);
      }

      if (searchSources.anime) {
        promises.push(
          searchAnimeForList(searchQuery.trim())
            .then((res) => setAnimeResults(res))
            .catch(() => setAnimeResults([])),
        );
      } else {
        setAnimeResults([]);
      }

      if (searchSources.manga) {
        promises.push(
          searchMangaForList(searchQuery.trim())
            .then((res) => setMangaResults(res))
            .catch(() => setMangaResults([])),
        );
      } else {
        setMangaResults([]);
      }

      if (searchSources.books) {
        promises.push(
          searchBooksForList(searchQuery.trim())
            .then((res) => setBookResults(res))
            .catch(() => setBookResults([])),
        );
      } else {
        setBookResults([]);
      }

      if (searchSources.tvMovie) {
        promises.push(
          searchTmdbForList(searchQuery.trim())
            .then((res) => setTmdbResults(res))
            .catch(() => setTmdbResults([])),
        );
      } else {
        setTmdbResults([]);
      }

      if (searchSources.games) {
        promises.push(
          searchGamesForList(searchQuery.trim())
            .then((res) => setGameResults(res))
            .catch(() => setGameResults([])),
        );
      } else {
        setGameResults([]);
      }

      await Promise.all(promises);

      if (
        !searchSources.anime &&
        !searchSources.manga &&
        !searchSources.books &&
        !searchSources.tvMovie &&
        !searchSources.games &&
        !searchSources.existing
      ) {
        setSearchError("No sources selected. Enable at least one filter.");
      }
    } catch {
      setAnimeResults([]);
      setMangaResults([]);
      setBookResults([]);
      setTmdbResults([]);
      setGameResults([]);
      setExistingResults([]);
      setSearchError("Failed to search. Check your connection or API keys.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchSources, list?.id, lists]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAnimeResults([]);
      setMangaResults([]);
      setBookResults([]);
      setTmdbResults([]);
      setGameResults([]);
      setExistingResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }
    const t = setTimeout(() => {
      runAllSearches();
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, runAllSearches]);

  const addAnimeResultToList = useCallback(
    (result: SimpleAnimeSearchResult) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      const isTracking = list.preset === "tracking";
      addEntryToList(list.id, {
        title: result.title,
        type: "anime",
        imageUrl: result.imageUrl,
        detailPath: `anime/${result.id}`,
        displayVariant: variant,
        ...(isTracking && result.episodes != null ? { totalEpisodes: result.episodes } : {}),
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const addMangaResultToList = useCallback(
    (result: SimpleMangaSearchResult) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      const isTracking = list.preset === "tracking";
      addEntryToList(list.id, {
        title: result.title,
        type: "manga",
        imageUrl: result.imageUrl,
        detailPath: `manga/${result.id}`,
        displayVariant: variant,
        ...(isTracking && result.chapters != null ? { totalChapters: result.chapters } : {}),
        ...(isTracking && result.volumes != null ? { totalVolumes: result.volumes } : {}),
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const addBookResultToList = useCallback(
    (result: SimpleBookSearchResult) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      addEntryToList(list.id, {
        title: result.title,
        type: "book",
        imageUrl: result.imageUrl,
        detailPath: result.detailPath,
        displayVariant: variant,
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const addTmdbResultToList = useCallback(
    (result: SimpleTmdbSearchResult) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      addEntryToList(list.id, {
        title: result.title,
        type: result.mediaType,
        imageUrl: result.imageUrl,
        detailPath: result.detailPath,
        displayVariant: variant,
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const addGameResultToList = useCallback(
    (result: SimpleGameSearchResult) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      addEntryToList(list.id, {
        title: result.title,
        type: "game",
        imageUrl: result.imageUrl,
        detailPath: result.detailPath,
        displayVariant: variant,
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const addExistingListToList = useCallback(
    (targetList: MockList) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      addEntryToList(list.id, {
        title: targetList.title,
        type: "list",
        linkedListId: targetList.id,
        detailPath: `list/${targetList.id}`,
        displayVariant: variant,
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const addExistingEntryToList = useCallback(
    (entry: ListEntry, _sourceList: MockList) => {
      if (!list) return;
      const variant: ListEntry["displayVariant"] = displaySimple
        ? "simple"
        : displayCheckbox && displayDetails
        ? "checkbox-details"
        : displayCheckbox
        ? "checkbox"
        : "details";
      addEntryToList(list.id, {
        title: entry.title,
        type: entry.type,
        imageUrl: entry.imageUrl,
        detailPath: entry.detailPath,
        displayVariant: variant,
        linkedEntryId: entry.id,
        totalEpisodes: entry.totalEpisodes,
        totalChapters: entry.totalChapters,
        totalVolumes: entry.totalVolumes,
      });
      closeAddItemSheet();
    },
    [
      addEntryToList,
      closeAddItemSheet,
      list,
      displaySimple,
      displayCheckbox,
      displayDetails,
    ],
  );

  const openEntry = useCallback(
    (entry: ListEntry) => {
      if (entry.linkedListId) {
        router.push({ pathname: `/list/${entry.linkedListId}` as any });
        return;
      }
      if (entry.linkedEntryId) {
        const found = findEntryById(lists, entry.linkedEntryId);
        if (found?.entry.detailPath) {
          router.push({ pathname: `/${found.entry.detailPath}` as any });
        }
        return;
      }
      if (entry.detailPath) {
        router.push({ pathname: `/${entry.detailPath}` as any });
      }
    },
    [router, lists],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      const displayEntry = getDisplayEntry(lists, item);
      const variant = item.displayVariant ?? "details";
      const isSimple = variant === "simple";
      const isCheckbox =
        variant === "checkbox" || variant === "checkbox-details";
      const hasDetails =
        variant === "details" || variant === "checkbox-details";
      const checked = !!checkedById[item.id];
      const hasPath =
        displayEntry.detailPath ||
        item.linkedListId ||
        (item.linkedEntryId && !!findEntryById(lists, item.linkedEntryId)?.entry.detailPath);

      const toggleChecked = () => {
        setCheckedById((prev) => ({
          ...prev,
          [item.id]: !prev[item.id],
        }));
      };

      const onRowPress = () => {
        if (isCheckbox) {
          toggleChecked();
        } else if (hasDetails) {
          openEntry(item);
        }
      };

      return (
        <Pressable
          onPress={onRowPress}
          style={({ pressed }) => [
            styles.resultRow,
            checked && { backgroundColor: colors.tint + "12" },
            { opacity: pressed ? 0.8 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={hasDetails ? `Open ${displayEntry.title}` : displayEntry.title}
        >
          {isCheckbox ? (
            <View
              style={[
                styles.checkboxIndicator,
                {
                  borderColor: colors.tint,
                  backgroundColor: checked ? colors.tint : "transparent",
                },
              ]}
            >
              {checked ? (
                <IconSymbol
                  name="checkmark"
                  size={14}
                  color={colors.background}
                />
              ) : null}
            </View>
          ) : null}
          <Image
            source={
              displayEntry.imageUrl
                ? { uri: displayEntry.imageUrl }
                : require("../../assets/images/placeholder-thumbnail.png")
            }
            style={styles.resultPoster}
            contentFit="cover"
          />
          <View style={styles.resultInfo}>
            <ThemedText style={styles.resultTitle} numberOfLines={2}>
              {displayEntry.title}
            </ThemedText>
            {!isSimple ? (
              <View style={styles.resultMetaRow}>
                {(item.linkedEntryId ||
                  item.linkedListId ||
                  (item.detailPath && !item.detailPath.startsWith("list-entry/"))) ? (
                  <View
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.icon + "25" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.typeChipText, { color: colors.tint }]}
                    >
                      {ENTRY_TYPE_LABELS[displayEntry.type]}
                    </ThemedText>
                  </View>
                ) : null}
                {list?.preset === "tracking" &&
                  (displayEntry.totalEpisodes != null ||
                    displayEntry.totalChapters != null ||
                    displayEntry.totalVolumes != null) && (
                    <ThemedText
                      style={[styles.trackingBadge, { color: colors.icon }]}
                    >
                      {displayEntry.totalEpisodes != null
                        ? `0/${displayEntry.totalEpisodes} ep`
                        : displayEntry.totalChapters != null
                        ? `0/${displayEntry.totalChapters} ch`
                        : displayEntry.totalVolumes != null
                        ? `0/${displayEntry.totalVolumes} vol`
                        : null}
                    </ThemedText>
                  )}
              </View>
            ) : null}
          </View>
          {hasDetails && hasPath ? (
            variant === "checkbox-details" ? (
              <Pressable
                onPress={() => openEntry(item)}
                style={({ pressed }) => [
                  styles.detailsButtonZone,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open details for ${item.title}`}
              >
                <IconSymbol
                  name="chevron.right"
                  size={24}
                  color={colors.icon}
                  style={styles.resultChevron}
                />
              </Pressable>
            ) : (
              <IconSymbol
                name="chevron.right"
                size={24}
                color={colors.icon}
                style={styles.resultChevron}
              />
            )
          ) : null}
        </Pressable>
      );
    },
    [
      checkedById,
      colors.background,
      colors.icon,
      colors.tint,
      list?.preset,
      openEntry,
    ],
  );

  const keyExtractor = useCallback((item: ListEntry) => item.id, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () =>
            list ? (
              <Pressable
                onPress={openAddItemSheet}
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add item to list"
              >
                <IconSymbol name="plus" size={26} color={colors.tint} />
              </Pressable>
            ) : null,
        }}
      />
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        {entries.length === 0 ? (
          <ThemedText style={styles.placeholder}>
            This list is empty. Add items from Search.
          </ThemedText>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>

      <Modal
        visible={addItemSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAddItemSheet}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (formatPickerFieldIndex !== null) {
              setFormatPickerFieldIndex(null);
            } else {
              closeAddItemSheet();
            }
          }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 24,
                height: Dimensions.get("window").height * 0.9,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: colors.icon + "30" },
              ]}
            >
              <Pressable
                onPress={closeAddItemSheet}
                style={({ pressed }) => [
                  styles.sheetHeaderButton,
                  styles.sheetHeaderButtonLeft,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </Pressable>
              <ThemedText type="subtitle" style={styles.sheetTitle}>
                {addItemMode === "custom"
                  ? "Add custom item"
                  : "Add from search"}
              </ThemedText>
              {addItemMode === "custom" ? (
                <Pressable
                  onPress={confirmAddCustomItem}
                  style={({ pressed }) => [
                    styles.sheetHeaderButton,
                    styles.sheetHeaderButtonRight,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add item"
                >
                  <IconSymbol name="checkmark" size={24} color={colors.tint} />
                </Pressable>
              ) : (
                <View style={styles.sheetHeaderButton} />
              )}
            </View>

            <View style={styles.modeToggleRow}>
              <Pressable
                onPress={() => setAddItemMode("custom")}
                style={({ pressed }) => [
                  styles.modeToggleButton,
                  {
                    backgroundColor:
                      addItemMode === "custom"
                        ? colors.tint
                        : colors.icon + "12",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.modeToggleText,
                    {
                      color:
                        addItemMode === "custom"
                          ? colors.background
                          : colors.text,
                    },
                  ]}
                >
                  Custom item
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setAddItemMode("search")}
                style={({ pressed }) => [
                  styles.modeToggleButton,
                  {
                    backgroundColor:
                      addItemMode === "search"
                        ? colors.tint
                        : colors.icon + "12",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.modeToggleText,
                    {
                      color:
                        addItemMode === "search"
                          ? colors.background
                          : colors.text,
                    },
                  ]}
                >
                  Search item
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.displayModeRow}>
              <Pressable
                onPress={() => {
                  setDisplaySimple(true);
                  setDisplayCheckbox(false);
                  setDisplayDetails(false);
                }}
                style={({ pressed }) => [
                  styles.displayModeBubble,
                  {
                    backgroundColor: displaySimple
                      ? colors.tint
                      : colors.icon + "12",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: displaySimple }}
                accessibilityLabel="Use simple display"
              >
                <ThemedText
                  style={[
                    styles.displayModeText,
                    {
                      color: displaySimple ? colors.background : colors.text,
                    },
                  ]}
                >
                  Simple
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDisplayCheckbox((prev) => {
                    const next = !prev;
                    if (next) {
                      setDisplaySimple(false);
                    }
                    return next;
                  });
                }}
                style={({ pressed }) => [
                  styles.displayModeBubble,
                  {
                    backgroundColor: displayCheckbox
                      ? colors.tint
                      : colors.icon + "12",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: displayCheckbox }}
                accessibilityLabel="Toggle checkbox behavior"
              >
                <ThemedText
                  style={[
                    styles.displayModeText,
                    {
                      color: displayCheckbox ? colors.background : colors.text,
                    },
                  ]}
                >
                  Checkbox
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setDisplayDetails((prev) => {
                    const next = !prev;
                    if (next) {
                      setDisplaySimple(false);
                    }
                    return next;
                  });
                }}
                style={({ pressed }) => [
                  styles.displayModeBubble,
                  {
                    backgroundColor: displayDetails
                      ? colors.tint
                      : colors.icon + "12",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: displayDetails }}
                accessibilityLabel="Toggle details page behavior"
              >
                <ThemedText
                  style={[
                    styles.displayModeText,
                    {
                      color: displayDetails ? colors.background : colors.text,
                    },
                  ]}
                >
                  Details page
                </ThemedText>
              </Pressable>
            </View>

            {addItemMode === "custom" ? (
              <ScrollView
                style={styles.sheetBody}
                contentContainerStyle={styles.sheetBodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={[
                    styles.titleInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.icon + "18",
                      borderColor: colors.icon + "40",
                    },
                  ]}
                  placeholder="Title"
                  placeholderTextColor={colors.icon}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmAddCustomItem}
                />
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.icon + "12",
                      borderColor: colors.icon + "30",
                    },
                  ]}
                  placeholder="Notes (optional)"
                  placeholderTextColor={colors.icon}
                  value={customNotes}
                  onChangeText={setCustomNotes}
                  multiline
                  textAlignVertical="top"
                />
                {customFields.map((field, index) => (
                  <View
                    key={index}
                    style={styles.customFieldRow}
                  >
                    <TextInput
                      style={[
                        styles.customFieldTitleInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.icon + "18",
                          borderColor: colors.icon + "40",
                        },
                      ]}
                      placeholder="Title"
                      placeholderTextColor={colors.icon}
                      value={field.title}
                      onChangeText={(t) => updateCustomField(index, "title", t)}
                    />
                    <View
                      style={[
                        styles.customFieldValueBox,
                        {
                          backgroundColor: colors.icon + "18",
                          borderColor: colors.icon + "40",
                        },
                      ]}
                    >
                      <TextInput
                        style={[
                          styles.customFieldValueInput,
                          { color: colors.text },
                        ]}
                        placeholder="Value"
                        placeholderTextColor={colors.icon}
                        value={field.value}
                        onChangeText={(t) => {
                          const filtered =
                            field.format === "numbers"
                              ? t.replace(/\D/g, "")
                              : t;
                          updateCustomField(index, "value", filtered);
                        }}
                        keyboardType={
                          field.format === "numbers" ? "numeric" : "default"
                        }
                      />
                      <Pressable
                        onPress={() => setFormatPickerFieldIndex(index)}
                        style={({ pressed }) => [
                          styles.customFieldFormatButton,
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Choose value format"
                      >
                        <IconSymbol
                          name="chevron.down"
                          size={20}
                          color={colors.icon}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => removeCustomField(index)}
                      style={({ pressed }) => [
                        styles.customFieldTrash,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Remove field"
                    >
                      <IconSymbol
                        name="trash"
                        size={22}
                        color="#e53e3e"
                      />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={addCustomField}
                  style={({ pressed }) => [
                    styles.addFieldBar,
                    {
                      backgroundColor: colors.icon + "18",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Add custom field"
                >
                  <IconSymbol
                    name="plus"
                    size={24}
                    color={colors.tint}
                  />
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.sheetBody}>
                <View style={styles.searchRowInline}>
                  <View
                    style={[
                      styles.searchBar,
                      { backgroundColor: colors.icon + "20" },
                    ]}
                  >
                    <IconSymbol
                      name="magnifyingglass"
                      size={18}
                      color={colors.icon}
                    />
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search..."
                      placeholderTextColor={colors.icon}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                      onSubmitEditing={runAllSearches}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <Pressable
                    onPress={() => setShowSourcePicker((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.filterButton,
                      { opacity: pressed ? 0.7 : 1 },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Filter sources"
                  >
                    <IconSymbol
                      name="line.3.horizontal.decrease.circle"
                      size={20}
                      color={colors.icon}
                    />
                  </Pressable>
                </View>
                {showSourcePicker && (
                  <View
                    style={[
                      styles.inlineFilterDropdown,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <ThemedText style={styles.filterTitle}>
                      Filter sources
                    </ThemedText>
                    {[
                      { key: "anime", label: "Anime" },
                      { key: "manga", label: "Manga" },
                      { key: "books", label: "Books" },
                      { key: "tvMovie", label: "TV / Movies" },
                      { key: "games", label: "Games" },
                      { key: "existing", label: "Existing items" },
                    ].map((source) => {
                      const key = source.key as keyof typeof searchSources;
                      const selected = searchSources[key];
                      return (
                        <Pressable
                          key={source.key}
                          onPress={() =>
                            setSearchSources((prev) => ({
                              ...prev,
                              [key]: !prev[key],
                            }))
                          }
                          style={({ pressed }) => [
                            styles.filterRow,
                            { opacity: pressed ? 0.7 : 1 },
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`Toggle ${source.label}`}
                        >
                          <View
                            style={[
                              styles.filterCheckbox,
                              {
                                borderColor: colors.tint,
                                backgroundColor: selected
                                  ? colors.tint
                                  : "transparent",
                              },
                            ]}
                          >
                            {selected ? (
                              <IconSymbol
                                name="checkmark"
                                size={14}
                                color={colors.background}
                              />
                            ) : null}
                          </View>
                          <ThemedText style={styles.filterLabel}>
                            {source.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                    <View style={styles.filterActionsRow}>
                      <Pressable
                        onPress={() => setShowSourcePicker(false)}
                        style={({ pressed }) => [
                          styles.filterCancelButton,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
                      >
                        <ThemedText style={styles.filterCancelText}>
                          Cancel
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setShowSourcePicker(false);
                          if (searchQuery.trim()) {
                            runAllSearches();
                          }
                        }}
                        style={({ pressed }) => [
                          styles.filterApplyButton,
                          {
                            backgroundColor: colors.tint,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Apply filters"
                      >
                        <ThemedText
                          style={[
                            styles.filterApplyText,
                            { color: colors.background },
                          ]}
                        >
                          Apply
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}
                <View style={styles.searchResultsArea}>
                  {isSearching &&
                  !animeResults.length &&
                  !mangaResults.length &&
                  !bookResults.length &&
                  !tmdbResults.length &&
                  !gameResults.length &&
                  !existingResults.length ? (
                    <View style={styles.centered}>
                      <ActivityIndicator size="large" color={colors.tint} />
                      <ThemedText style={styles.placeholder}>
                        Searching...
                      </ThemedText>
                    </View>
                  ) : searchError ? (
                    <ThemedText style={[styles.placeholder, styles.errorText]}>
                      {searchError}
                    </ThemedText>
                  ) : !searchQuery.trim() ? (
                    <ThemedText style={styles.placeholder}>
                      Type a title to search across anime, manga, books, TV/movies,
                      and games.
                    </ThemedText>
                  ) : !animeResults.length &&
                    !mangaResults.length &&
                    !bookResults.length &&
                    !tmdbResults.length &&
                    !gameResults.length &&
                    !existingResults.length ? (
                    <ThemedText style={styles.placeholder}>
                      No results for "{searchQuery}"
                    </ThemedText>
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.searchSectionsContent}
                    >
                      {focusedSource && (
                        <View style={styles.searchSectionBackRow}>
                          <Pressable
                            onPress={() => setFocusedSource(null)}
                            style={({ pressed }) => [
                              styles.backToAllButton,
                              { opacity: pressed ? 0.7 : 1 },
                            ]}
                          >
                            <IconSymbol
                              name="chevron.left"
                              size={18}
                              color={colors.tint}
                            />
                            <ThemedText
                              style={[
                                styles.backToAllText,
                                { color: colors.tint },
                              ]}
                            >
                              All sections
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}

                      {existingResults.length > 0 &&
                        searchSources.existing &&
                        (!focusedSource || focusedSource === "existing") && (
                        <View style={styles.searchSection}>
                          <View style={styles.searchSectionHeaderRow}>
                            <ThemedText style={styles.searchSectionHeader}>
                              Existing items
                            </ThemedText>
                            {!focusedSource &&
                              existingResults.length > 5 && (
                                <Pressable
                                  onPress={() => setFocusedSource("existing")}
                                  style={({ pressed }) => [
                                    styles.sectionMoreButton,
                                    { opacity: pressed ? 0.7 : 1 },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel="Show more existing results"
                                >
                                  <IconSymbol
                                    name="chevron.right"
                                    size={18}
                                    color={colors.icon}
                                  />
                                </Pressable>
                              )}
                          </View>
                          {(focusedSource
                            ? existingResults
                            : existingResults.slice(0, 5)
                          ).map((result, index) =>
                            result.kind === "list" ? (
                              <Pressable
                                key={`existing-list-${result.list.id}`}
                                onPress={() =>
                                  addExistingListToList(result.list)
                                }
                                style={({ pressed }) => [
                                  styles.searchResultRow,
                                  { opacity: pressed ? 0.8 : 1 },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Add list ${result.list.title} to list`}
                              >
                                <View
                                  style={[
                                    styles.resultPoster,
                                    styles.existingListPoster,
                                    { backgroundColor: colors.icon + "25" },
                                  ]}
                                >
                                  <IconSymbol
                                    name="list.bullet"
                                    size={28}
                                    color={colors.icon}
                                  />
                                </View>
                                <View style={styles.resultInfo}>
                                  <ThemedText
                                    style={styles.resultTitle}
                                    numberOfLines={2}
                                  >
                                    {result.list.title}
                                  </ThemedText>
                                  <View
                                    style={[
                                      styles.typeChip,
                                      {
                                        backgroundColor: colors.icon + "25",
                                      },
                                    ]}
                                  >
                                    <ThemedText
                                      style={[
                                        styles.typeChipText,
                                        { color: colors.tint },
                                      ]}
                                    >
                                      List · {result.list.entries.length} items
                                    </ThemedText>
                                  </View>
                                </View>
                              </Pressable>
                            ) : (
                              <Pressable
                                key={`existing-entry-${result.entry.id}-${index}`}
                                onPress={() =>
                                  addExistingEntryToList(
                                    result.entry,
                                    result.list,
                                  )
                                }
                                style={({ pressed }) => [
                                  styles.searchResultRow,
                                  { opacity: pressed ? 0.8 : 1 },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Add ${result.entry.title} to list`}
                              >
                                <Image
                                  source={
                                    result.entry.imageUrl
                                      ? { uri: result.entry.imageUrl }
                                      : require("../../assets/images/placeholder-thumbnail.png")
                                  }
                                  style={styles.resultPoster}
                                  contentFit="cover"
                                />
                                <View style={styles.resultInfo}>
                                  <ThemedText
                                    style={styles.resultTitle}
                                    numberOfLines={2}
                                  >
                                    {result.entry.title}
                                  </ThemedText>
                                  <View
                                    style={[
                                      styles.typeChip,
                                      {
                                        backgroundColor: colors.icon + "25",
                                      },
                                    ]}
                                  >
                                    <ThemedText
                                      style={[
                                        styles.typeChipText,
                                        { color: colors.tint },
                                      ]}
                                    >
                                      {ENTRY_TYPE_LABELS[result.entry.type]} · in{" "}
                                      {result.list.title}
                                    </ThemedText>
                                  </View>
                                </View>
                              </Pressable>
                            ),
                          )}
                        </View>
                      )}

                      {animeResults.length > 0 &&
                        (!focusedSource || focusedSource === "anime") && (
                        <View style={styles.searchSection}>
                          <View style={styles.searchSectionHeaderRow}>
                            <ThemedText style={styles.searchSectionHeader}>
                              Anime
                            </ThemedText>
                            {!focusedSource &&
                              searchSources.anime &&
                              animeResults.length > 5 && (
                                <Pressable
                                  onPress={() => setFocusedSource("anime")}
                                  style={({ pressed }) => [
                                    styles.sectionMoreButton,
                                    { opacity: pressed ? 0.7 : 1 },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel="Show more anime results"
                                >
                                  <IconSymbol
                                    name="chevron.right"
                                    size={18}
                                    color={colors.icon}
                                  />
                                </Pressable>
                              )}
                          </View>
                          {(focusedSource ? animeResults : animeResults.slice(0, 5)).map((result) => (
                            <Pressable
                              key={`anime-${result.id}`}
                              onPress={() => addAnimeResultToList(result)}
                              style={({ pressed }) => [
                                styles.searchResultRow,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Add ${result.title} to list`}
                            >
                              <Image
                                source={
                                  result.imageUrl
                                    ? { uri: result.imageUrl }
                                    : require("../../assets/images/placeholder-thumbnail.png")
                                }
                                style={styles.resultPoster}
                                contentFit="cover"
                              />
                              <View style={styles.resultInfo}>
                                <ThemedText
                                  style={styles.resultTitle}
                                  numberOfLines={2}
                                >
                                  {result.title}
                                </ThemedText>
                                <View
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: colors.icon + "25" },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.typeChipText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    Anime
                                  </ThemedText>
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {mangaResults.length > 0 &&
                        (!focusedSource || focusedSource === "manga") && (
                        <View style={styles.searchSection}>
                          <View style={styles.searchSectionHeaderRow}>
                            <ThemedText style={styles.searchSectionHeader}>
                              Manga
                            </ThemedText>
                            {!focusedSource &&
                              searchSources.manga &&
                              mangaResults.length > 5 && (
                                <Pressable
                                  onPress={() => setFocusedSource("manga")}
                                  style={({ pressed }) => [
                                    styles.sectionMoreButton,
                                    { opacity: pressed ? 0.7 : 1 },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel="Show more manga results"
                                >
                                  <IconSymbol
                                    name="chevron.right"
                                    size={18}
                                    color={colors.icon}
                                  />
                                </Pressable>
                              )}
                          </View>
                          {(focusedSource ? mangaResults : mangaResults.slice(0, 5)).map((result) => (
                            <Pressable
                              key={`manga-${result.id}`}
                              onPress={() => addMangaResultToList(result)}
                              style={({ pressed }) => [
                                styles.searchResultRow,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Add ${result.title} to list`}
                            >
                              <Image
                                source={
                                  result.imageUrl
                                    ? { uri: result.imageUrl }
                                    : require("../../assets/images/placeholder-thumbnail.png")
                                }
                                style={styles.resultPoster}
                                contentFit="cover"
                              />
                              <View style={styles.resultInfo}>
                                <ThemedText
                                  style={styles.resultTitle}
                                  numberOfLines={2}
                                >
                                  {result.title}
                                </ThemedText>
                                <View
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: colors.icon + "25" },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.typeChipText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    Manga
                                  </ThemedText>
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {bookResults.length > 0 &&
                        (!focusedSource || focusedSource === "books") && (
                        <View style={styles.searchSection}>
                          <View style={styles.searchSectionHeaderRow}>
                            <ThemedText style={styles.searchSectionHeader}>
                              Books
                            </ThemedText>
                            {!focusedSource &&
                              searchSources.books &&
                              bookResults.length > 5 && (
                                <Pressable
                                  onPress={() => setFocusedSource("books")}
                                  style={({ pressed }) => [
                                    styles.sectionMoreButton,
                                    { opacity: pressed ? 0.7 : 1 },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel="Show more book results"
                                >
                                  <IconSymbol
                                    name="chevron.right"
                                    size={18}
                                    color={colors.icon}
                                  />
                                </Pressable>
                              )}
                          </View>
                          {(focusedSource ? bookResults : bookResults.slice(0, 5)).map((result) => (
                            <Pressable
                              key={`book-${result.id}`}
                              onPress={() => addBookResultToList(result)}
                              style={({ pressed }) => [
                                styles.searchResultRow,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Add ${result.title} to list`}
                            >
                              <Image
                                source={
                                  result.imageUrl
                                    ? { uri: result.imageUrl }
                                    : require("../../assets/images/placeholder-thumbnail.png")
                                }
                                style={styles.resultPoster}
                                contentFit="cover"
                              />
                              <View style={styles.resultInfo}>
                                <ThemedText
                                  style={styles.resultTitle}
                                  numberOfLines={2}
                                >
                                  {result.title}
                                </ThemedText>
                                {result.subtitle ? (
                                  <ThemedText
                                    style={styles.searchSubtitle}
                                    numberOfLines={1}
                                  >
                                    {result.subtitle}
                                  </ThemedText>
                                ) : null}
                                <View
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: colors.icon + "25" },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.typeChipText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    Book
                                  </ThemedText>
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {tmdbResults.length > 0 &&
                        (!focusedSource || focusedSource === "tvMovie") && (
                        <View style={styles.searchSection}>
                          <View style={styles.searchSectionHeaderRow}>
                            <ThemedText style={styles.searchSectionHeader}>
                              TV / Movies
                            </ThemedText>
                            {!focusedSource &&
                              searchSources.tvMovie &&
                              tmdbResults.length > 5 && (
                                <Pressable
                                  onPress={() => setFocusedSource("tvMovie")}
                                  style={({ pressed }) => [
                                    styles.sectionMoreButton,
                                    { opacity: pressed ? 0.7 : 1 },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel="Show more TV and movie results"
                                >
                                  <IconSymbol
                                    name="chevron.right"
                                    size={18}
                                    color={colors.icon}
                                  />
                                </Pressable>
                              )}
                          </View>
                          {(focusedSource ? tmdbResults : tmdbResults.slice(0, 5)).map((result) => (
                            <Pressable
                              key={`tmdb-${result.mediaType}-${result.id}`}
                              onPress={() => addTmdbResultToList(result)}
                              style={({ pressed }) => [
                                styles.searchResultRow,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Add ${result.title} to list`}
                            >
                              <Image
                                source={
                                  result.imageUrl
                                    ? { uri: result.imageUrl }
                                    : require("../../assets/images/placeholder-thumbnail.png")
                                }
                                style={styles.resultPoster}
                                contentFit="cover"
                              />
                              <View style={styles.resultInfo}>
                                <ThemedText
                                  style={styles.resultTitle}
                                  numberOfLines={2}
                                >
                                  {result.title}
                                </ThemedText>
                                <View
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: colors.icon + "25" },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.typeChipText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    {result.mediaType === "movie"
                                      ? "Movie"
                                      : "TV"}
                                  </ThemedText>
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {gameResults.length > 0 &&
                        (!focusedSource || focusedSource === "games") && (
                        <View style={styles.searchSection}>
                          <View style={styles.searchSectionHeaderRow}>
                            <ThemedText style={styles.searchSectionHeader}>
                              Games
                            </ThemedText>
                            {!focusedSource &&
                              searchSources.games &&
                              gameResults.length > 5 && (
                                <Pressable
                                  onPress={() => setFocusedSource("games")}
                                  style={({ pressed }) => [
                                    styles.sectionMoreButton,
                                    { opacity: pressed ? 0.7 : 1 },
                                  ]}
                                  accessibilityRole="button"
                                  accessibilityLabel="Show more game results"
                                >
                                  <IconSymbol
                                    name="chevron.right"
                                    size={18}
                                    color={colors.icon}
                                  />
                                </Pressable>
                              )}
                          </View>
                          {(focusedSource ? gameResults : gameResults.slice(0, 5)).map((result) => (
                            <Pressable
                              key={`game-${result.id}`}
                              onPress={() => addGameResultToList(result)}
                              style={({ pressed }) => [
                                styles.searchResultRow,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Add ${result.title} to list`}
                            >
                              <Image
                                source={
                                  result.imageUrl
                                    ? { uri: result.imageUrl }
                                    : require("../../assets/images/placeholder-thumbnail.png")
                                }
                                style={styles.resultPoster}
                                contentFit="cover"
                              />
                              <View style={styles.resultInfo}>
                                <ThemedText
                                  style={styles.resultTitle}
                                  numberOfLines={2}
                                >
                                  {result.title}
                                </ThemedText>
                                <View
                                  style={[
                                    styles.typeChip,
                                    { backgroundColor: colors.icon + "25" },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.typeChipText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    Game
                                  </ThemedText>
                                </View>
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}
          </Pressable>
          {formatPickerFieldIndex !== null && addItemMode === "custom" && (
            <Pressable
              style={styles.formatPickerOverlay}
              onPress={() => setFormatPickerFieldIndex(null)}
            >
              <Pressable
                style={[
                  styles.formatPickerCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.icon + "30",
                  },
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                <ThemedText
                  style={[styles.formatPickerTitle, { color: colors.icon }]}
                >
                  Value format
                </ThemedText>
                <Pressable
                  onPress={() =>
                    setCustomFieldFormat(formatPickerFieldIndex, "text")
                  }
                  style={[
                    styles.formatPickerOption,
                    {
                      backgroundColor:
                        customFields[formatPickerFieldIndex]?.format === "text"
                          ? colors.tint + "20"
                          : colors.icon + "12",
                      borderColor: colors.icon + "30",
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked:
                      customFields[formatPickerFieldIndex]?.format !== "numbers",
                  }}
                >
                  <ThemedText
                    style={[
                      styles.formatPickerOptionText,
                      {
                        color:
                          customFields[formatPickerFieldIndex]?.format === "text"
                            ? colors.tint
                            : colors.text,
                      },
                    ]}
                  >
                    Text
                  </ThemedText>
                  <ThemedText
                    style={[styles.formatPickerOptionHint, { color: colors.icon }]}
                  >
                    Full text input
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setCustomFieldFormat(formatPickerFieldIndex, "numbers")
                  }
                  style={[
                    styles.formatPickerOption,
                    {
                      backgroundColor:
                        customFields[formatPickerFieldIndex]?.format ===
                        "numbers"
                          ? colors.tint + "20"
                          : colors.icon + "12",
                      borderColor: colors.icon + "30",
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked:
                      customFields[formatPickerFieldIndex]?.format === "numbers",
                  }}
                >
                  <ThemedText
                    style={[
                      styles.formatPickerOptionText,
                      {
                        color:
                          customFields[formatPickerFieldIndex]?.format ===
                          "numbers"
                            ? colors.tint
                            : colors.text,
                      },
                    ]}
                  >
                    Numbers
                  </ThemedText>
                  <ThemedText
                    style={[styles.formatPickerOptionHint, { color: colors.icon }]}
                  >
                    Numbers only
                  </ThemedText>
                </Pressable>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 5,
  },
  placeholder: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.3)",
  },
  resultPoster: {
    width: 56,
    height: 80,
    borderRadius: 6,
  },
  existingListPoster: {
    justifyContent: "center",
    alignItems: "center",
  },
  posterPlaceholder: {
    backgroundColor: "rgba(128,128,128,0.2)",
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  resultMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trackingBadge: {
    fontSize: 12,
  },
  resultChevron: {
    marginLeft: 8,
  },
  checkboxIndicator: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  detailsButtonZone: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderButton: {
    padding: 8,
    minWidth: 40,
  },
  sheetHeaderButtonLeft: {
    alignItems: "flex-start",
  },
  sheetHeaderButtonRight: {
    alignItems: "flex-end",
  },
  sheetTitle: {
    flex: 1,
    textAlign: "center",
  },
  sheetBody: {
    padding: 20,
    flex: 1,
  },
  sheetBodyContent: {
    paddingBottom: 4,
  },
  titleInput: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  notesInput: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 120,
    marginBottom: 16,
  },
  customFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  customFieldTitleInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  customFieldValueBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingRight: 4,
  },
  customFieldValueInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customFieldFormatButton: {
    padding: 6,
  },
  customFieldTrash: {
    padding: 8,
  },
  formatPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  formatPickerCard: {
    marginHorizontal: 32,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 220,
  },
  formatPickerTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  formatPickerOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  formatPickerOptionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  formatPickerOptionHint: {
    fontSize: 13,
    marginTop: 2,
  },
  addFieldBar: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  modeToggleRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  displayModeRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
  },
  displayModeBubble: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  displayModeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  filterButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchResultsArea: {
    flex: 1,
  },
  searchSectionsContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchSectionBackRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  backToAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  backToAllText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  searchSectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  sectionMoreButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    color: "#ff4d4f",
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.3)",
  },
  searchSubtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  inlineFilterDropdown: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.3)",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  filterCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  filterLabel: {
    fontSize: 14,
  },
  filterActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  filterCancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  filterCancelText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  filterApplyButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
  },
  filterApplyText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
