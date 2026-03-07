import type { EntryProgressUnit, EntrySourceRef, ListEntryType } from '@/data/mock-lists';

export type CatalogCategory = 'anime' | 'manga' | 'book' | 'movie-tv';

export interface CatalogSearchItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  type: ListEntryType;
  detailPath?: string;
  sourceRef: EntrySourceRef;
  rating?: number;
  progressUnit?: EntryProgressUnit;
  totalProgress?: number;
}

export interface CatalogAdapter {
  id: CatalogCategory;
  label: string;
  search(query: string): Promise<CatalogSearchItem[]>;
}
