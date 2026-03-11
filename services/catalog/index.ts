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

export async function searchCatalog(
  category: CatalogCategory,
  query: string
): Promise<CatalogSearchItem[]> {
  const items = await catalogAdapterById[category].search(query);
  return dedupeCatalogSearchItems(items);
}
