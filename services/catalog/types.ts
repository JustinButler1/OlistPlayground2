import type { EntryProgressUnit, EntrySourceRef, ListEntryType } from '@/data/mock-lists';

export type CatalogCategory = 'anime' | 'manga' | 'book' | 'movie-tv';

export interface CatalogSearchItem {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  location?: string;
  author?: string;
  progressLabel?: string;
  tags?: string[];
  imageUrl?: string;
  type: ListEntryType;
  detailPath?: string;
  sourceRef: EntrySourceRef;
  rating?: number;
  progressUnit?: EntryProgressUnit;
  totalProgress?: number;
}

export interface CatalogSearchOptions {
  page?: number;
  signal?: AbortSignal;
}

export interface CatalogSearchResponse {
  items: CatalogSearchItem[];
  page: number;
  totalPages: number;
  totalResults?: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CatalogAdapter {
  id: CatalogCategory;
  label: string;
  search(query: string, options?: CatalogSearchOptions): Promise<CatalogSearchResponse>;
}
