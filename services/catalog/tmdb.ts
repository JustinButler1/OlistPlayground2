import type { CatalogAdapter, CatalogSearchItem } from '@/services/catalog/types';

const TMDB_SEARCH_MULTI = 'https://api.themoviedb.org/3/search/multi';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

interface TmdbSearchResponse {
  results?: Array<{
    id: number;
    media_type: string;
    title?: string;
    name?: string;
    poster_path?: string | null;
    vote_average?: number | null;
    release_date?: string;
    first_air_date?: string;
  }>;
}

function getTmdbApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();
  return key || null;
}

async function searchTmdb(query: string): Promise<CatalogSearchItem[]> {
  if (!query.trim()) {
    return [];
  }

  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('missing_tmdb_api_key');
  }

  const response = await fetch(
    `${TMDB_SEARCH_MULTI}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(
      query.trim()
    )}&include_adult=false&page=1`
  );
  if (!response.ok) {
    throw new Error('tmdb_search_failed');
  }

  const json: TmdbSearchResponse = await response.json();

  return (json.results ?? [])
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item) => {
      const type = item.media_type === 'movie' ? 'movie' : 'tv';
      const title = item.title ?? item.name ?? 'Untitled';
      const year = (type === 'movie' ? item.release_date : item.first_air_date)?.slice(0, 4);

      return {
        id: String(item.id),
        title,
        subtitle: [type === 'movie' ? 'Movie' : 'TV', year].filter(Boolean).join(' | '),
        imageUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : undefined,
        type,
        detailPath: `tv-movie/${type}/${item.id}`,
        sourceRef: {
          source: type,
          externalId: String(item.id),
          detailPath: `tv-movie/${type}/${item.id}`,
        },
        rating: typeof item.vote_average === 'number' ? item.vote_average : undefined,
      } satisfies CatalogSearchItem;
    });
}

export const tmdbCatalogAdapter: CatalogAdapter = {
  id: 'movie-tv',
  label: 'TV & Movies',
  search: searchTmdb,
};
