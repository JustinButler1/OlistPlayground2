import type {
  CatalogAdapter,
  CatalogSearchItem,
  CatalogSearchOptions,
  CatalogSearchResponse,
} from '@/services/catalog/types';
import { getPreferredJikanTitle } from '@/services/catalog/jikan';
import { normalizeRating } from '@/lib/tracker-metadata';

const JIKAN_API = 'https://api.jikan.moe/v4';
const PAGE_SIZE = 25;

interface JikanMangaSearchResponse {
  data?: Array<{
    mal_id: number;
    title: string;
    title_english?: string | null;
    titles?: Array<{
      type?: string | null;
      title?: string | null;
    }>;
    synopsis?: string | null;
    images?: {
      jpg?: { image_url?: string; small_image_url?: string };
      webp?: { image_url?: string; small_image_url?: string };
    };
    chapters?: number | null;
    volumes?: number | null;
    score?: number | null;
    type?: string | null;
    published?: {
      prop?: {
        from?: { year?: number };
        to?: { year?: number | null };
      };
    };
    genres?: Array<{
      mal_id: number;
      name: string;
    }>;
    authors?: Array<{
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

async function searchManga(
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
    `${JIKAN_API}/manga?q=${encodeURIComponent(query.trim())}&limit=${PAGE_SIZE}&page=${page}`,
    { signal: options?.signal }
  );
  if (!response.ok) {
    throw new Error('manga_search_failed');
  }

  const json: JikanMangaSearchResponse = await response.json();
  const items = (json.data ?? []).map((item) => {
    const imageUrl =
      item.images?.jpg?.image_url ??
      item.images?.webp?.image_url ??
      item.images?.jpg?.small_image_url ??
      item.images?.webp?.small_image_url;
    const year = item.published?.prop?.from?.year ?? item.published?.prop?.to?.year;
    const location = [item.type, year].filter(Boolean).join(' | ');
    const author = item.authors?.map((authorItem) => authorItem.name).join(', ');
    const progressLabel = [
      typeof item.volumes === 'number' ? `${item.volumes} volumes` : null,
      typeof item.chapters === 'number' ? `${item.chapters} chapters` : null,
    ]
      .filter(Boolean)
      .join(' | ');
    const tags = (item.genres ?? []).map((genre) => genre.name);

    return {
      id: String(item.mal_id),
      title: getPreferredJikanTitle(item),
      description: item.synopsis?.trim() || undefined,
      subtitle: [author, location, progressLabel].filter(Boolean).join(' | '),
      location: location || undefined,
      author: author || undefined,
      progressLabel: progressLabel || undefined,
      tags,
      imageUrl: imageUrl ?? undefined,
      type: 'manga',
      detailPath: `manga/${item.mal_id}`,
      sourceRef: {
        source: 'manga',
        externalId: String(item.mal_id),
        detailPath: `manga/${item.mal_id}`,
      },
      rating: normalizeRating(typeof item.score === 'number' ? item.score : undefined),
      progressUnit:
        typeof item.chapters === 'number'
          ? 'chapter'
          : typeof item.volumes === 'number'
          ? 'volume'
          : undefined,
      totalProgress:
        typeof item.chapters === 'number'
          ? item.chapters
          : typeof item.volumes === 'number'
          ? item.volumes
          : undefined,
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

export const mangaCatalogAdapter: CatalogAdapter = {
  id: 'manga',
  label: 'Manga',
  search: searchManga,
};
