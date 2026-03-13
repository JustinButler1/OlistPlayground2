import type {
  CatalogAdapter,
  CatalogSearchItem,
  CatalogSearchOptions,
  CatalogSearchResponse,
} from '@/services/catalog/types';
import { normalizeRating } from '@/lib/tracker-metadata';

const JIKAN_API = 'https://api.jikan.moe/v4';
const PAGE_SIZE = 25;

interface JikanAnimeSearchResponse {
  data?: Array<{
    mal_id: number;
    title: string;
    title_english?: string | null;
    synopsis?: string | null;
    images?: {
      jpg?: { image_url?: string; small_image_url?: string };
      webp?: { image_url?: string; small_image_url?: string };
    };
    episodes?: number | null;
    score?: number | null;
    year?: number | null;
    type?: string | null;
    genres?: Array<{
      mal_id: number;
      name: string;
    }>;
  }>;
  pagination?: {
    current_page?: number;
    last_visible_page?: number;
    has_next_page?: boolean;
    items?: {
      total?: number;
    };
  };
}

async function searchAnime(
  query: string,
  options?: CatalogSearchOptions
): Promise<CatalogSearchResponse> {
  if (!query.trim()) {
    return {
      items: [],
      page: 1,
      totalPages: 1,
      totalResults: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  const page = Math.max(1, options?.page ?? 1);
  const response = await fetch(
    `${JIKAN_API}/anime?q=${encodeURIComponent(query.trim())}&limit=${PAGE_SIZE}&page=${page}`,
    { signal: options?.signal }
  );
  if (!response.ok) {
    throw new Error('anime_search_failed');
  }

  const json: JikanAnimeSearchResponse = await response.json();
  const items = (json.data ?? []).map((item) => {
    const imageUrl =
      item.images?.jpg?.image_url ??
      item.images?.webp?.image_url ??
      item.images?.jpg?.small_image_url ??
      item.images?.webp?.small_image_url;
    const location = [item.type, item.year].filter(Boolean).join(' | ');
    const progressLabel =
      typeof item.episodes === 'number' ? `${item.episodes} episodes` : undefined;
    const tags = (item.genres ?? []).map((genre) => genre.name);

    return {
      id: String(item.mal_id),
      title: item.title_english?.trim() || item.title,
      description: item.synopsis?.trim() || undefined,
      subtitle: [location, progressLabel].filter(Boolean).join(' | '),
      location: location || undefined,
      progressLabel,
      tags,
      imageUrl: imageUrl ?? undefined,
      type: 'anime',
      detailPath: `anime/${item.mal_id}`,
      sourceRef: {
        source: 'anime',
        externalId: String(item.mal_id),
        detailPath: `anime/${item.mal_id}`,
      },
      rating: normalizeRating(typeof item.score === 'number' ? item.score : undefined),
      progressUnit: 'episode',
      totalProgress: typeof item.episodes === 'number' ? item.episodes : undefined,
    } satisfies CatalogSearchItem;
  });

  const currentPage = Math.max(1, json.pagination?.current_page ?? page);
  const totalPages = Math.max(1, json.pagination?.last_visible_page ?? currentPage);
  const totalResults = json.pagination?.items?.total;

  return {
    items,
    page: currentPage,
    totalPages,
    totalResults,
    hasPreviousPage: currentPage > 1,
    hasNextPage:
      typeof json.pagination?.has_next_page === 'boolean'
        ? json.pagination.has_next_page
        : currentPage < totalPages,
  };
}

export const animeCatalogAdapter: CatalogAdapter = {
  id: 'anime',
  label: 'Anime',
  search: searchAnime,
};
