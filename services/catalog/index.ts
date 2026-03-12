import { animeCatalogAdapter } from '@/services/catalog/anime';
import { booksCatalogAdapter } from '@/services/catalog/books';
import { mangaCatalogAdapter } from '@/services/catalog/manga';
import { tmdbCatalogAdapter } from '@/services/catalog/tmdb';
import type { CatalogAdapter, CatalogCategory, CatalogSearchItem } from '@/services/catalog/types';

export type { CatalogAdapter, CatalogCategory, CatalogSearchItem } from '@/services/catalog/types';

export const catalogAdapters: CatalogAdapter[] = [
  animeCatalogAdapter,
  mangaCatalogAdapter,
  booksCatalogAdapter,
  tmdbCatalogAdapter,
];

const catalogAdapterById = Object.fromEntries(
  catalogAdapters.map((adapter) => [adapter.id, adapter] satisfies [CatalogCategory, CatalogAdapter])
) as Record<CatalogCategory, CatalogAdapter>;

function dedupeCatalogSearchItems(items: CatalogSearchItem[]): CatalogSearchItem[] {
  const seenKeys = new Set<string>();

  return items.filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

function getCatalogSearchRelevancePenalty(item: CatalogSearchItem): number {
  const hasDescription = Boolean(item.description?.trim());
  const hasAuthor = Boolean(item.author?.trim());

  if (hasDescription) {
    return 0;
  }

  return hasAuthor ? 1 : 2;
}

export function sortCatalogSearchItemsByRelevance(
  items: CatalogSearchItem[]
): CatalogSearchItem[] {
  return items
    .map((item, index) => ({
      item,
      index,
      penalty: getCatalogSearchRelevancePenalty(item),
    }))
    .sort((left, right) => left.penalty - right.penalty || left.index - right.index)
    .map(({ item }) => item);
}

export async function searchCatalog(
  category: CatalogCategory,
  query: string,
  signal?: AbortSignal
): Promise<CatalogSearchItem[]> {
  const items = await catalogAdapterById[category].search(query, signal);
  return sortCatalogSearchItemsByRelevance(dedupeCatalogSearchItems(items));
}
