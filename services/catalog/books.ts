import type {
  CatalogAdapter,
  CatalogSearchItem,
  CatalogSearchOptions,
  CatalogSearchResponse,
} from '@/services/catalog/types';
import { searchGoogleBooksVolumes } from '@/services/catalog/google-books';

const PAGE_SIZE = 25;

function bookKeyToSlug(key: string): string {
  return key; // Google Books uses alphanumeric IDs, so we can just use them directly
}


async function searchBooks(
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
  const startIndex = (page - 1) * PAGE_SIZE;
  const json = await searchGoogleBooksVolumes(query, {
    maxResults: PAGE_SIZE,
    signal: options?.signal,
    startIndex,
  });
  const items = (json.items ?? []).map((item) => {
    const publishedYear = item.volumeInfo.publishedDate?.slice(0, 4);
    const author = item.volumeInfo.authors?.join(', ');
    const location = [item.volumeInfo.publisher, publishedYear].filter(Boolean).join(' | ');
    const progressLabel =
      typeof item.volumeInfo.pageCount === 'number'
        ? `${item.volumeInfo.pageCount} pages`
        : undefined;

    return {
      id: item.id,
      title: [item.volumeInfo.title, item.volumeInfo.subtitle].filter(Boolean).join(': '),
      description: item.volumeInfo.description?.trim() || undefined,
      subtitle: [author, location, progressLabel].filter(Boolean).join(' | '),
      location: location || undefined,
      author: author || undefined,
      progressLabel,
      tags: item.volumeInfo.categories ?? [],
      imageUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
      type: 'book',
      detailPath: `books/${bookKeyToSlug(item.id)}`,
      sourceRef: {
        source: 'book',
        externalId: item.id,
        detailPath: `books/${bookKeyToSlug(item.id)}`,
        canonicalUrl: `https://books.google.com/books?id=${item.id}`,
      },
    } satisfies CatalogSearchItem;
  });

  const totalResults = json.totalItems ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  return {
    items,
    page,
    totalPages,
    totalResults,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export const booksCatalogAdapter: CatalogAdapter = {
  id: 'book',
  label: 'Books',
  search: searchBooks,
};
