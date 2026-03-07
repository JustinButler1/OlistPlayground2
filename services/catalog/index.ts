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

export async function searchCatalog(
  category: CatalogCategory,
  query: string
): Promise<CatalogSearchItem[]> {
  return catalogAdapterById[category].search(query);
}
