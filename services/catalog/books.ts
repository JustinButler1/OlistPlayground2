import type { CatalogAdapter, CatalogSearchItem } from '@/services/catalog/types';

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json';

interface OpenLibrarySearchResponse {
  docs?: Array<{
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    cover_i?: number;
  }>;
}

function bookKeyToSlug(key: string): string {
  return key.replace(/^\//, '').replace(/\//g, '--');
}

async function searchBooks(query: string): Promise<CatalogSearchItem[]> {
  if (!query.trim()) {
    return [];
  }

  const response = await fetch(
    `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query.trim())}&limit=25`
  );
  if (!response.ok) {
    throw new Error('book_search_failed');
  }

  const json: OpenLibrarySearchResponse = await response.json();

  return (json.docs ?? []).map((item) => ({
    id: item.key,
    title: item.title,
    subtitle: [item.author_name?.join(', '), item.first_publish_year]
      .filter(Boolean)
      .join(' | '),
    imageUrl: item.cover_i
      ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
      : undefined,
    type: 'book',
    detailPath: `books/${bookKeyToSlug(item.key)}`,
    sourceRef: {
      source: 'book',
      externalId: item.key,
      detailPath: `books/${bookKeyToSlug(item.key)}`,
      canonicalUrl: `https://openlibrary.org${item.key}`,
    },
  }));
}

export const booksCatalogAdapter: CatalogAdapter = {
  id: 'book',
  label: 'Books',
  search: searchBooks,
};
