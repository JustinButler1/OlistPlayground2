import type { CatalogAdapter, CatalogSearchItem } from '@/services/catalog/types';
import { normalizeRating } from '@/lib/tracker-metadata';

const JIKAN_API = 'https://api.jikan.moe/v4';

interface JikanMangaSearchResponse {
  data?: Array<{
    mal_id: number;
    title: string;
    images?: {
      jpg?: { image_url?: string; small_image_url?: string };
      webp?: { image_url?: string; small_image_url?: string };
    };
    chapters?: number | null;
    volumes?: number | null;
    score?: number | null;
    published?: {
      prop?: {
        from?: { year?: number };
        to?: { year?: number | null };
      };
    };
  }>;
}

async function searchManga(query: string): Promise<CatalogSearchItem[]> {
  if (!query.trim()) {
    return [];
  }

  const response = await fetch(
    `${JIKAN_API}/manga?q=${encodeURIComponent(query.trim())}&limit=25`
  );
  if (!response.ok) {
    throw new Error('manga_search_failed');
  }

  const json: JikanMangaSearchResponse = await response.json();

  return (json.data ?? []).map((item) => {
    const imageUrl =
      item.images?.jpg?.image_url ??
      item.images?.webp?.image_url ??
      item.images?.jpg?.small_image_url ??
      item.images?.webp?.small_image_url;
    const year = item.published?.prop?.from?.year ?? item.published?.prop?.to?.year;

    return {
      id: String(item.mal_id),
      title: item.title,
      subtitle: [
        typeof item.volumes === 'number' ? `${item.volumes} vol` : null,
        typeof item.chapters === 'number' ? `${item.chapters} ch` : null,
        year,
      ]
        .filter(Boolean)
        .join(' | '),
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
    };
  });
}

export const mangaCatalogAdapter: CatalogAdapter = {
  id: 'manga',
  label: 'Manga',
  search: searchManga,
};
