/**
 * Mock data for My Lists and list detail screens.
 */

export type ListEntryType = 'anime' | 'manga' | 'movie' | 'tv' | 'book' | 'game';

export interface ListEntry {
  id: string;
  title: string;
  type: ListEntryType;
  imageUrl?: string;
  /** Optional link to detail screen: e.g. anime/123, manga/456, tv-movie/movie/789 */
  detailPath?: string;
}

export interface MockList {
  id: string;
  title: string;
  entries: ListEntry[];
}

export const MOCK_LISTS: MockList[] = [
  {
    id: 'list-watchlist',
    title: 'Watchlist',
    entries: [
      {
        id: 'e1',
        title: 'Attack on Titan',
        type: 'anime',
        imageUrl: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
        detailPath: 'anime/16498',
      },
      {
        id: 'e2',
        title: 'Dune',
        type: 'movie',
        imageUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
        detailPath: 'tv-movie/movie/438631',
      },
      {
        id: 'e3',
        title: 'The Legend of Zelda: Breath of the Wild',
        type: 'game',
        detailPath: 'games/7346',
      },
      {
        id: 'e4',
        title: 'Chainsaw Man',
        type: 'manga',
        imageUrl: 'https://cdn.myanimelist.net/images/manga/2/249278.jpg',
        detailPath: 'manga/119161',
      },
    ],
  },
  {
    id: 'list-favorites',
    title: 'Favorites',
    entries: [
      {
        id: 'e5',
        title: 'Steins;Gate',
        type: 'anime',
        imageUrl: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg',
        detailPath: 'anime/9253',
      },
      {
        id: 'e6',
        title: 'Breaking Bad',
        type: 'tv',
        imageUrl: 'https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        detailPath: 'tv-movie/tv/1396',
      },
      {
        id: 'e7',
        title: 'Project Hail Mary',
        type: 'book',
        detailPath: 'books/OL34852204W',
      },
    ],
  },
  {
    id: 'list-reading',
    title: 'Currently Reading',
    entries: [
      {
        id: 'e8',
        title: 'Berserk',
        type: 'manga',
        imageUrl: 'https://cdn.myanimelist.net/images/manga/1/157931.jpg',
        detailPath: 'manga/2',
      },
      {
        id: 'e9',
        title: 'The Three-Body Problem',
        type: 'book',
        detailPath: 'books/OL26346984W',
      },
    ],
  },
  {
    id: 'list-games-backlog',
    title: 'Games Backlog',
    entries: [
      {
        id: 'e10',
        title: 'Elden Ring',
        type: 'game',
        detailPath: 'games/190667',
      },
      {
        id: 'e11',
        title: 'Hades',
        type: 'game',
        detailPath: 'games/112461',
      },
    ],
  },
];

/** List id -> list (for detail lookup). */
export const MOCK_LISTS_BY_ID = Object.fromEntries(
  MOCK_LISTS.map((list) => [list.id, list])
);

/** Flatten to ListItem shape for My Lists tab: id + title. */
export const MOCK_LIST_ITEMS = MOCK_LISTS.map((list) => ({
  id: list.id,
  title: list.title,
}));
