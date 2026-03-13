import type {
  CatalogAdapter,
  CatalogSearchItem,
  CatalogSearchOptions,
  CatalogSearchResponse,
} from '@/services/catalog/types';
import { normalizeRating } from '@/lib/tracker-metadata';

const TMDB_SEARCH_MULTI = 'https://api.themoviedb.org/3/search/multi';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

interface TmdbSearchResponse {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: Array<{
    id: number;
    media_type: string;
    title?: string;
    name?: string;
    overview?: string;
    poster_path?: string | null;
    vote_average?: number | null;
    release_date?: string;
    first_air_date?: string;
    original_language?: string;
    origin_country?: string[];
  }>;
}

function getTmdbApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();
  return key || null;
}

async function searchTmdb(
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

  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('missing_tmdb_api_key');
  }

  const page = Math.max(1, options?.page ?? 1);
  const response = await fetch(
    `${TMDB_SEARCH_MULTI}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(
      query.trim()
    )}&include_adult=false&page=${page}`,
    { signal: options?.signal }
  );
  if (!response.ok) {
    throw new Error('tmdb_search_failed');
  }

  const json: TmdbSearchResponse = await response.json();
  const items = (json.results ?? [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv';
      const title = item.title ?? item.name ?? 'Untitled';
      const year = (type === 'movie' ? item.release_date : item.first_air_date)?.slice(0, 4);
      const region =
        type === 'tv' ? item.origin_country?.[0] : item.original_language?.toUpperCase();
      const location = [type === 'movie' ? 'Movie' : 'TV', year, region].filter(Boolean).join(
        ' | '
      );

      return {
        id: String(item.id),
        title,
        description: item.overview?.trim() || undefined,
        subtitle: location,
        location: location || undefined,
        imageUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : undefined,
        type,
        detailPath: `tv-movie/${type}/${item.id}`,
        sourceRef: {
          source: type,
          externalId: String(item.id),
          detailPath: `tv-movie/${type}/${item.id}`,
        },
        rating: normalizeRating(
          typeof item.vote_average === 'number' ? item.vote_average : undefined
        ),
      } satisfies CatalogSearchItem;
    });

  const currentPage = Math.max(1, json.page ?? page);
  const totalPages = Math.max(1, json.total_pages ?? currentPage);
  const totalResults = json.total_results;

  return {
    items,
    page: currentPage,
    totalPages,
    totalResults,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

export const tmdbCatalogAdapter: CatalogAdapter = {
  id: 'movie-tv',
  label: 'TV & Movies',
  search: searchTmdb,
};
