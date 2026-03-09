import type { CatalogAdapter, CatalogSearchItem } from '@/services/catalog/types';

const GOOGLE_BOOKS_SEARCH = 'https://www.googleapis.com/books/v1/volumes';

interface GoogleBooksSearchParams {
  q: string;
  maxResults?: number;
  key?: string;
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
    };
  };
}

interface GoogleBooksSearchResponse {
  items?: GoogleBooksVolume[];
}

function bookKeyToSlug(key: string): string {
  return key; // Google Books uses alphanumeric IDs, so we can just use them directly
}


async function searchBooks(query: string): Promise<CatalogSearchItem[]> {
  if (!query.trim()) {
    return [];
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const url = new URL(GOOGLE_BOOKS_SEARCH);
  url.searchParams.append('q', query.trim());
  url.searchParams.append('maxResults', '25');
  if (apiKey) {
    url.searchParams.append('key', apiKey);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('book_search_failed');
  }

  const json: GoogleBooksSearchResponse = await response.json();

  return (json.items ?? []).map((item) => {
    const publishedYear = item.volumeInfo.publishedDate
      ? new Date(item.volumeInfo.publishedDate).getFullYear()
      : undefined;

    return {
      id: item.id,
      title: item.volumeInfo.title,
      subtitle: [item.volumeInfo.authors?.join(', '), publishedYear]
        .filter(Boolean)
        .join(' | '),
      imageUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
      type: 'book',
      detailPath: `books/${bookKeyToSlug(item.id)}`,
      sourceRef: {
        source: 'book',
        externalId: item.id,
        detailPath: `books/${bookKeyToSlug(item.id)}`,
        canonicalUrl: `https://books.google.com/books?id=${item.id}`,
      },
    };
  });
}

export const booksCatalogAdapter: CatalogAdapter = {
  id: 'book',
  label: 'Books',
  search: searchBooks,
};
