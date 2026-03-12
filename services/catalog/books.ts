import type { CatalogAdapter, CatalogSearchItem } from '@/services/catalog/types';
import { searchGoogleBooksVolumes } from '@/services/catalog/google-books';

function bookKeyToSlug(key: string): string {
  return key; // Google Books uses alphanumeric IDs, so we can just use them directly
}


async function searchBooks(query: string, signal?: AbortSignal): Promise<CatalogSearchItem[]> {
  if (!query.trim()) {
    return [];
  }
  const json = await searchGoogleBooksVolumes(query, { maxResults: 25, signal });

  return (json.items ?? []).map((item) => {
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
    };
  });
}

export const booksCatalogAdapter: CatalogAdapter = {
  id: 'book',
  label: 'Books',
  search: searchBooks,
};
