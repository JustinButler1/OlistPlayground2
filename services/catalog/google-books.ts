const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  description?: string;
  publishedDate?: string;
  authors?: string[];
  pageCount?: number;
  publisher?: string;
  categories?: string[];
  imageLinks?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
}

export interface GoogleBooksVolume {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksSearchResponse {
  items?: GoogleBooksVolume[];
  totalItems?: number;
}

function getGoogleBooksApiKey() {
  return process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
}

function buildGoogleBooksUrl(path?: string) {
  const url = new URL(path ? `${GOOGLE_BOOKS_BASE}/${path}` : GOOGLE_BOOKS_BASE);
  const apiKey = getGoogleBooksApiKey();

  if (apiKey) {
    url.searchParams.append('key', apiKey);
  }

  return url;
}

export async function fetchGoogleBookDetails(id: string, signal?: AbortSignal): Promise<GoogleBooksVolume> {
  const url = buildGoogleBooksUrl(id);
  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error('google_books_detail_failed');
  }

  return response.json();
}

export async function searchGoogleBooksVolumes(
  query: string,
  options?: {
    maxResults?: number;
    signal?: AbortSignal;
    startIndex?: number;
  }
): Promise<GoogleBooksSearchResponse> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { items: [], totalItems: 0 };
  }

  const url = buildGoogleBooksUrl();
  url.searchParams.append('q', `intitle:${trimmedQuery}`);
  url.searchParams.append('maxResults', String(options?.maxResults ?? 25));
  url.searchParams.append('startIndex', String(options?.startIndex ?? 0));

  const response = await fetch(url.toString(), { signal: options?.signal });
  if (!response.ok) {
    throw new Error('google_books_search_failed');
  }

  return response.json();
}

function normalizeAuthorName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function fetchBooksByAuthor(authorName: string, signal?: AbortSignal): Promise<GoogleBooksVolume[]> {
  const trimmedAuthorName = authorName.trim();
  if (!trimmedAuthorName) {
    return [];
  }

  const maxResults = 40;
  const normalizedAuthorName = normalizeAuthorName(trimmedAuthorName);
  const allItems = new Map<string, GoogleBooksVolume>();
  let startIndex = 0;
  let totalItems = 0;

  do {
    const response = await searchGoogleBooksVolumes(`inauthor:"${trimmedAuthorName}"`, {
      maxResults,
      signal,
      startIndex,
    });

    totalItems = response.totalItems ?? 0;

    for (const item of response.items ?? []) {
      const hasMatchingAuthor = item.volumeInfo.authors?.some(
        (author) => normalizeAuthorName(author) === normalizedAuthorName
      );

      if (hasMatchingAuthor) {
        allItems.set(item.id, item);
      }
    }

    if (!response.items?.length) {
      break;
    }

    startIndex += response.items.length;
  } while (startIndex < totalItems);

  return Array.from(allItems.values()).sort((left, right) => {
    const leftDate = left.volumeInfo.publishedDate ?? '';
    const rightDate = right.volumeInfo.publishedDate ?? '';
    return rightDate.localeCompare(leftDate) || left.volumeInfo.title.localeCompare(right.volumeInfo.title);
  });
}
