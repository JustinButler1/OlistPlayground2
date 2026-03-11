import { QueryClient } from '@tanstack/react-query';

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (
    error instanceof Error &&
    (error.message === 'missing_tmdb_api_key' ||
      error.message === 'missing_igdb_credentials' ||
      error.message === 'TMDB API key not configured')
  ) {
    return false;
  }

  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
    },
  });
}
