import type { CatalogAdapter, CatalogSearchItem } from '@/services/catalog/types';
import { normalizeRating } from '@/lib/tracker-metadata';

const JIKAN_API = 'https://api.jikan.moe/v4';

interface JikanAnimeSearchResponse {
  data?: Array<{
    mal_id: number;
    title: string;
    images?: {
      jpg?: { image_url?: string; small_image_url?: string };
      webp?: { image_url?: string; small_image_url?: string };
    };
    episodes?: number | null;
    score?: number | null;
    year?: number | null;
    type?: string | null;
  }>;
}

async function searchAnime(query: string): Promise<CatalogSearchItem[]> {
  if (!query.trim()) {
    return [];
  }

  const response = await fetch(
    `${JIKAN_API}/anime?q=${encodeURIComponent(query.trim())}&limit=25`
  );
  if (!response.ok) {
    throw new Error('anime_search_failed');
  }

  const json: JikanAnimeSearchResponse = await response.json();

  return (json.data ?? []).map((item) => {
    const imageUrl =
      item.images?.jpg?.image_url ??
      item.images?.webp?.image_url ??
      item.images?.jpg?.small_image_url ??
      item.images?.webp?.small_image_url;

    return {
      id: String(item.mal_id),
      title: item.title,
      subtitle: [item.type, item.episodes ? `${item.episodes} ep` : null, item.year]
        .filter(Boolean)
        .join(' | '),
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
    };
  });
}

export const animeCatalogAdapter: CatalogAdapter = {
  id: 'anime',
  label: 'Anime',
  search: searchAnime,
};
