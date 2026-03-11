import type { CatalogCategory } from '@/services/catalog';

type TmdbType = 'movie' | 'tv';
type JikanImageType = 'anime' | 'manga' | 'authors' | 'producers';

export const apiQueryKeys = {
  book: {
    detail: (id: string) => ['book', 'detail', id] as const,
  },
  catalog: {
    all: ['catalog'] as const,
    search: (category: CatalogCategory, query: string) =>
      ['catalog', 'search', category, query] as const,
  },
  game: {
    detail: (id: string) => ['game', 'detail', id] as const,
  },
  jikan: {
    image: (type: JikanImageType, id: number) => ['jikan', 'image', type, id] as const,
  },
  anime: {
    characters: (id: string) => ['anime', 'characters', id] as const,
    detail: (id: string) => ['anime', 'detail', id] as const,
  },
  manga: {
    characters: (id: string) => ['manga', 'characters', id] as const,
    detail: (id: string) => ['manga', 'detail', id] as const,
  },
  tmdb: {
    credits: (type: TmdbType, id: string) => ['tmdb', type, 'credits', id] as const,
    detail: (type: TmdbType, id: string) => ['tmdb', type, 'detail', id] as const,
    recommendations: (type: TmdbType, id: string) =>
      ['tmdb', type, 'recommendations', id] as const,
    videos: (type: TmdbType, id: string) => ['tmdb', type, 'videos', id] as const,
  },
};
