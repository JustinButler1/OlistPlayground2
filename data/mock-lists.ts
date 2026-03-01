/**
 * Mock data for My Lists and list detail screens.
 */

export type ListEntryType = 'anime' | 'manga' | 'movie' | 'tv' | 'book' | 'game' | 'list' | 'link';

/** Preset when creating a list: blank = normal list; tracking = show 0/X progress for items with chapters/volumes/episodes */
export type ListPreset = 'blank' | 'tracking';

export interface ListEntry {
  id: string;
  title: string;
  type: ListEntryType;
  imageUrl?: string;
  /** Optional link to detail screen: e.g. anime/123, manga/456, tv-movie/movie/789 */
  detailPath?: string;
  /** Optional user notes for custom entries. */
  notes?: string;
  /** Custom title/value fields for custom entries (e.g. Author, Year). */
  customFields?: { title: string; value: string; format?: 'text' | 'numbers' }[];
  /**
   * Controls how the entry behaves in list detail:
   * - 'simple': image + title only
   * - 'checkbox': bulk tap toggles checked
   * - 'details': bulk tap navigates to details (default)
   * - 'checkbox-details': bulk tap toggles checked, separate details affordance
   */
  displayVariant?: 'simple' | 'checkbox' | 'details' | 'checkbox-details';
  /** For tracking lists: total episodes (anime), chapters/volumes (manga), etc. Shown as 0/X on the item. */
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  /** Link to another entry: display and open use the referenced entry's current data (changes reflected). */
  linkedEntryId?: string;
  /** Link to another list: this entry represents that list (e.g. nested list); tap opens the list. */
  linkedListId?: string;
  /** For link type: product page URL on an e-commerce site. */
  productUrl?: string;
  /** For link type: parsed product price (e.g. "$29.99"). */
  price?: string;
}

export interface MockList {
  id: string;
  title: string;
  /** Preset: 'blank' (default) or 'tracking'. Tracking lists show 0/X on items that have totalEpisodes/totalChapters/totalVolumes. */
  preset?: ListPreset;
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
        imageUrl: 'https://cdn.myanimelist.net/images/manga/3/216464.jpg',
        detailPath: 'manga/116778',
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
        detailPath: 'books/OL21745884W',
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
        detailPath: 'books/OL17267881W',
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
  // Parent tier list – shows on My Lists (S/A/B/C/D/E/F sublists are in MOCK_TIER_SUBLISTS, not on main list page)
  {
    id: 'list-movie-tier',
    title: 'Movie tier list',
    entries: [
      { id: 'tl1', title: 'S', type: 'list', linkedListId: 'list-tier-s', detailPath: 'list/list-tier-s' },
      { id: 'tl2', title: 'A', type: 'list', linkedListId: 'list-tier-a', detailPath: 'list/list-tier-a' },
      { id: 'tl3', title: 'B', type: 'list', linkedListId: 'list-tier-b', detailPath: 'list/list-tier-b' },
      { id: 'tl4', title: 'C', type: 'list', linkedListId: 'list-tier-c', detailPath: 'list/list-tier-c' },
      { id: 'tl5', title: 'D', type: 'list', linkedListId: 'list-tier-d', detailPath: 'list/list-tier-d' },
      { id: 'tl6', title: 'E', type: 'list', linkedListId: 'list-tier-e', detailPath: 'list/list-tier-e' },
      { id: 'tl7', title: 'F', type: 'list', linkedListId: 'list-tier-f', detailPath: 'list/list-tier-f' },
    ],
  },
];

/** Movie tier list sublists (S, A, B, C, D, E, F) – used when drilling into Movie tier list, not shown on main My Lists page. */
export const MOCK_TIER_SUBLISTS: MockList[] = [
  {
    id: 'list-tier-s',
    title: 'S',
    entries: [
      { id: 'mt1', title: 'The Godfather', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', detailPath: 'tv-movie/movie/238' },
      { id: 'mt2', title: 'The Dark Knight', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/qJ2tW6WMUDux911r6m7haRef0WH.jpg', detailPath: 'tv-movie/movie/155' },
      { id: 'mt3', title: 'Breaking Bad', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', detailPath: 'tv-movie/tv/1396' },
      { id: 'mt4', title: 'Dune', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', detailPath: 'tv-movie/movie/438631' },
      { id: 'mt5', title: 'Oppenheimer', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', detailPath: 'tv-movie/movie/872585' },
      { id: 'mt6', title: 'The Shawshank Redemption', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', detailPath: 'tv-movie/movie/278' },
    ],
  },
  {
    id: 'list-tier-a',
    title: 'A',
    entries: [
      { id: 'mt7', title: 'Inception', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5ürs.jpg', detailPath: 'tv-movie/movie/27205' },
      { id: 'mt8', title: 'Game of Thrones', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg', detailPath: 'tv-movie/tv/1399' },
      { id: 'mt9', title: 'Parasite', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', detailPath: 'tv-movie/movie/496243' },
      { id: 'mt10', title: 'The Last of Us', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg', detailPath: 'tv-movie/tv/100088' },
      { id: 'mt11', title: 'Interstellar', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', detailPath: 'tv-movie/movie/157336' },
      { id: 'mt12', title: 'Succession', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/6646VvD9e2VTHYCBnC2N8GEP2S7.jpg', detailPath: 'tv-movie/tv/76331' },
    ],
  },
  {
    id: 'list-tier-b',
    title: 'B',
    entries: [
      { id: 'mt13', title: 'Stranger Things', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', detailPath: 'tv-movie/tv/66732' },
      { id: 'mt14', title: 'Everything Everywhere All at Once', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg', detailPath: 'tv-movie/movie/545611' },
      { id: 'mt15', title: 'The Bear', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/rKgvctIuPFOBsndd2kbfjE3dUxh.jpg', detailPath: 'tv-movie/tv/114461' },
      { id: 'mt16', title: 'Pulp Fiction', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', detailPath: 'tv-movie/movie/680' },
      { id: 'mt17', title: 'The White Lotus', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/b5XPfB3nJvtnPK0wdnJ3F7F5Rm0.jpg', detailPath: 'tv-movie/tv/86423' },
      { id: 'mt18', title: 'Black Panther', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', detailPath: 'tv-movie/movie/284054' },
    ],
  },
  {
    id: 'list-tier-c',
    title: 'C',
    entries: [
      { id: 'mt19', title: 'The Witcher', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/7vjaCdMw15FEbXyLQTVa04URsPm.jpg', detailPath: 'tv-movie/tv/71912' },
      { id: 'mt20', title: 'Dune: Part Two', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', detailPath: 'tv-movie/movie/693134' },
      { id: 'mt21', title: 'Wednesday', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/9PFonBhy4cQy7Jz20NpMygczOkv.jpg', detailPath: 'tv-movie/tv/119051' },
      { id: 'mt22', title: 'Top Gun: Maverick', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/62HCnUTziyWcpDaBO2i1DX17ljH.jpg', detailPath: 'tv-movie/movie/361743' },
      { id: 'mt23', title: 'House of the Dragon', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/utgsn9rk5COheVM6K4LuZA2wDfD.jpg', detailPath: 'tv-movie/tv/94997' },
      { id: 'mt24', title: 'Avatar', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/6EiRUJpuicQP7xKZRsNUxtzEYxN.jpg', detailPath: 'tv-movie/movie/19995' },
    ],
  },
  {
    id: 'list-tier-d',
    title: 'D',
    entries: [
      { id: 'mt25', title: 'The Mandalorian', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg', detailPath: 'tv-movie/tv/82856' },
      { id: 'mt26', title: 'Spider-Man: No Way Home', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', detailPath: 'tv-movie/movie/634649' },
      { id: 'mt27', title: 'Ted Lasso', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/y4xbfvLjbHnjTmwmnpTTj2AIeBN.jpg', detailPath: 'tv-movie/tv/83867' },
      { id: 'mt28', title: 'Knives Out', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/pThyQovXQrw2m0s9x82twj48Jq4.jpg', detailPath: 'tv-movie/movie/546554' },
      { id: 'mt29', title: 'Euphoria', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/jtnfNzqZwN4E32FGGxx1YZaBWWf.jpg', detailPath: 'tv-movie/tv/85552' },
      { id: 'mt30', title: 'Jurassic World', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/A17KFVDbNxsG5BYXjRRHzLCbM9B.jpg', detailPath: 'tv-movie/movie/135397' },
    ],
  },
  {
    id: 'list-tier-e',
    title: 'E',
    entries: [
      { id: 'mt31', title: 'Squid Game', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/dDlEmu3EF0Pvfi1OVlEe8X8SXGV.jpg', detailPath: 'tv-movie/tv/93405' },
      { id: 'mt32', title: 'The Batman', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/74xTEgt7R36Fpooo50r9T25onhq.jpg', detailPath: 'tv-movie/movie/414906' },
      { id: 'mt33', title: 'Bridgerton', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/k0bK0bs40UDGgB2bBj0OoieM4V.jpg', detailPath: 'tv-movie/tv/87739' },
      { id: 'mt34', title: 'Barbie', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg', detailPath: 'tv-movie/movie/346698' },
      { id: 'mt35', title: 'Severance', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/lRfe2ylLMpK5xBkp9dq7cbSa2lP.jpg', detailPath: 'tv-movie/tv/95396' },
      { id: 'mt36', title: 'Free Guy', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/xmbU4JTUm8rsdtn7Y3Fcm30GmcT.jpg', detailPath: 'tv-movie/movie/550988' },
    ],
  },
  {
    id: 'list-tier-f',
    title: 'F',
    entries: [
      { id: 'mt37', title: 'The Gray Man', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/8cXbitsS6dWQ5gfMTZdorpAAzEH.jpg', detailPath: 'tv-movie/movie/725201' },
      { id: 'mt38', title: 'Moon Knight', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/6L6U2yffb8EvxkuXfMhZIQJ5VS0.jpg', detailPath: 'tv-movie/tv/92749' },
      { id: 'mt39', title: 'Red Notice', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/wdE6ewaKZHr62buDD4r3DeId6Tl.jpg', detailPath: 'tv-movie/movie/512195' },
      { id: 'mt40', title: 'The Rings of Power', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg', detailPath: 'tv-movie/tv/84773' },
      { id: 'mt41', title: 'Uncharted', type: 'movie', imageUrl: 'https://image.tmdb.org/t/p/w200/rJHC1RUORu5ht0vodFHXa4Ng27J.jpg', detailPath: 'tv-movie/movie/335787' },
      { id: 'mt42', title: 'Halo', type: 'tv', imageUrl: 'https://image.tmdb.org/t/p/w200/7Bd4EUOqNgPKRwQRRPvv01bKcqU.jpg', detailPath: 'tv-movie/tv/52814' },
    ],
  },
];

/** List id -> list (for detail lookup). Includes tier sublists. */
export const MOCK_LISTS_BY_ID = Object.fromEntries(
  [...MOCK_LISTS, ...MOCK_TIER_SUBLISTS].map((list) => [list.id, list])
);

/** Flatten to ListItem shape for My Lists tab: id + title. */
export const MOCK_LIST_ITEMS = MOCK_LISTS.map((list) => ({
  id: list.id,
  title: list.title,
}));
