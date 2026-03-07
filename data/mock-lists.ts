const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-03-07T12:00:00.000Z').getTime();

export type EntryStatus = 'planned' | 'active' | 'paused' | 'completed' | 'dropped';
export type EntryProgressUnit = 'episode' | 'chapter' | 'volume' | 'item' | 'percent';
export type EntrySourceType =
  | 'anime'
  | 'manga'
  | 'book'
  | 'movie'
  | 'tv'
  | 'link'
  | 'custom';
export type ListEntryType = EntrySourceType | 'game';
export type ListPreset = 'blank' | 'tracking';
export type ListViewMode = 'list' | 'grid';
export type ListSortMode = 'updated-desc' | 'title-asc' | 'rating-desc' | 'status';
export type ListFilterMode =
  | 'all'
  | 'active'
  | 'planned'
  | 'completed'
  | 'paused'
  | 'dropped'
  | 'archived';
export type ListGroupMode = 'none' | 'status' | 'tag';

export interface EntryProgress {
  current: number;
  total?: number;
  unit: EntryProgressUnit;
  updatedAt: number;
}

export interface EntrySourceRef {
  source: EntrySourceType;
  externalId?: string;
  detailPath?: string;
  canonicalUrl?: string;
}

export interface CustomField {
  title: string;
  value: string;
  format?: 'text' | 'numbers';
}

export interface ListEntry {
  id: string;
  title: string;
  type: ListEntryType;
  imageUrl?: string;
  detailPath?: string;
  notes?: string;
  customFields?: CustomField[];
  status: EntryStatus;
  rating?: number;
  tags: string[];
  progress?: EntryProgress;
  sourceRef: EntrySourceRef;
  addedAt: number;
  updatedAt: number;
  reminderAt?: number;
  coverAssetUri?: string;
  productUrl?: string;
  price?: string;
  archivedAt?: number;
}

export interface ListPreferences {
  viewMode: ListViewMode;
  sortMode: ListSortMode;
  filterMode: ListFilterMode;
  groupMode: ListGroupMode;
  showCompleted: boolean;
}

export interface TrackerList {
  id: string;
  title: string;
  description?: string;
  preset: ListPreset;
  entries: ListEntry[];
  preferences: ListPreferences;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
  archivedAt?: number;
  deletedAt?: number;
}

export type MockList = TrackerList;

export interface ListTemplate {
  id: string;
  title: string;
  description: string;
  preset: ListPreset;
  suggestedTags: string[];
  starterEntries: Array<
    Omit<ListEntry, 'id' | 'addedAt' | 'updatedAt' | 'status' | 'tags' | 'sourceRef'>
    & {
      status?: EntryStatus;
      tags?: string[];
      sourceRef?: EntrySourceRef;
    }
  >;
}

export const DEFAULT_LIST_PREFERENCES: ListPreferences = {
  viewMode: 'list',
  sortMode: 'updated-desc',
  filterMode: 'all',
  groupMode: 'none',
  showCompleted: true,
};

function createSeedEntry(
  id: string,
  title: string,
  type: ListEntryType,
  options: Partial<ListEntry> = {}
): ListEntry {
  const source = options.sourceRef?.source ?? (type === 'game' ? 'custom' : type);
  const progressUpdatedAt =
    options.progress?.updatedAt ?? options.updatedAt ?? options.addedAt ?? NOW;

  return {
    id,
    title,
    type,
    status: options.status ?? 'planned',
    tags: options.tags ?? [],
    addedAt: options.addedAt ?? NOW,
    updatedAt: options.updatedAt ?? options.addedAt ?? NOW,
    sourceRef: options.sourceRef ?? {
      source,
      externalId: options.detailPath?.split('/').pop(),
      detailPath: options.detailPath,
      canonicalUrl: options.productUrl,
    },
    imageUrl: options.imageUrl,
    detailPath: options.detailPath,
    notes: options.notes,
    customFields: options.customFields,
    rating: options.rating,
    progress: options.progress
      ? {
          ...options.progress,
          updatedAt: progressUpdatedAt,
        }
      : undefined,
    reminderAt: options.reminderAt,
    coverAssetUri: options.coverAssetUri,
    productUrl: options.productUrl,
    price: options.price,
    archivedAt: options.archivedAt,
  };
}

function createSeedList(
  id: string,
  title: string,
  entries: ListEntry[],
  options: Partial<TrackerList> = {}
): TrackerList {
  return {
    id,
    title,
    description: options.description,
    preset: options.preset ?? 'tracking',
    entries,
    preferences: options.preferences ?? DEFAULT_LIST_PREFERENCES,
    pinned: options.pinned ?? false,
    createdAt: options.createdAt ?? NOW,
    updatedAt: options.updatedAt ?? NOW,
    templateId: options.templateId,
    archivedAt: options.archivedAt,
    deletedAt: options.deletedAt,
  };
}

export const LIST_TEMPLATES: ListTemplate[] = [
  {
    id: 'template-watch',
    title: 'Watch Rotation',
    description: 'Keep one active show, one planned movie, and one comfort rewatch in view.',
    preset: 'tracking',
    suggestedTags: ['night', 'weekend', 'comfort'],
    starterEntries: [
      {
        title: "Frieren: Beyond Journey's End",
        type: 'anime',
        imageUrl: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
        detailPath: 'anime/52991',
        progress: { current: 12, total: 28, unit: 'episode', updatedAt: NOW - DAY_MS },
        status: 'active',
        rating: 9,
        tags: ['comfort'],
      },
      {
        title: 'Dune: Part Two',
        type: 'movie',
        imageUrl: 'https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        detailPath: 'tv-movie/movie/693134',
        status: 'planned',
        tags: ['imax'],
      },
      {
        title: 'Only Murders in the Building',
        type: 'tv',
        imageUrl: 'https://image.tmdb.org/t/p/w342/pq5L9p9xanF7YgU1kR1Y5FusK9M.jpg',
        detailPath: 'tv-movie/tv/107113',
        status: 'paused',
        tags: ['comedy'],
      },
    ],
  },
  {
    id: 'template-reading',
    title: 'Reading Stack',
    description: 'Balance an active manga, a non-fiction read, and a finished shelf.',
    preset: 'tracking',
    suggestedTags: ['morning', 'deep-work', 'loan'],
    starterEntries: [
      {
        title: 'Blue Period',
        type: 'manga',
        imageUrl: 'https://cdn.myanimelist.net/images/manga/1/229262.jpg',
        detailPath: 'manga/107931',
        progress: { current: 38, total: 65, unit: 'chapter', updatedAt: NOW - 2 * DAY_MS },
        status: 'active',
        tags: ['morning'],
      },
      {
        title: 'Atomic Habits',
        type: 'book',
        detailPath: 'books/works--OL17930368W',
        status: 'planned',
        tags: ['deep-work'],
      },
    ],
  },
  {
    id: 'template-links',
    title: 'Buy Later',
    description: 'A lightweight list for gear, books, and links before you are ready to purchase.',
    preset: 'blank',
    suggestedTags: ['sale', 'wishlist', 'gift'],
    starterEntries: [
      {
        title: 'Mechanical keyboard switch sampler',
        type: 'link',
        imageUrl:
          'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=600&q=80',
        status: 'planned',
        price: '$18.00',
        productUrl: 'https://example.com/keyboard-switch-sampler',
        sourceRef: {
          source: 'link',
          canonicalUrl: 'https://example.com/keyboard-switch-sampler',
        },
        tags: ['sale'],
      },
    ],
  },
];

export const DEFAULT_LISTS: TrackerList[] = [
  createSeedList(
    'list-watchlist',
    'Continue Watching',
    [
      createSeedEntry('seed-watch-1', "Frieren: Beyond Journey's End", 'anime', {
        imageUrl: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
        detailPath: 'anime/52991',
        status: 'active',
        rating: 9,
        tags: ['comfort', 'weekly'],
        progress: {
          current: 12,
          total: 28,
          unit: 'episode',
          updatedAt: NOW - DAY_MS,
        },
        reminderAt: NOW + DAY_MS,
        addedAt: NOW - 8 * DAY_MS,
        updatedAt: NOW - DAY_MS,
      }),
      createSeedEntry('seed-watch-2', 'Dune: Part Two', 'movie', {
        imageUrl: 'https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        detailPath: 'tv-movie/movie/693134',
        status: 'planned',
        tags: ['weekend'],
        addedAt: NOW - 6 * DAY_MS,
        updatedAt: NOW - 2 * DAY_MS,
      }),
      createSeedEntry('seed-watch-3', 'The Bear', 'tv', {
        imageUrl: 'https://image.tmdb.org/t/p/w342/nmVOQpyT5ztQcyy3dG6VfQm7N3K.jpg',
        detailPath: 'tv-movie/tv/136315',
        status: 'paused',
        tags: ['short'],
        progress: {
          current: 4,
          total: 10,
          unit: 'episode',
          updatedAt: NOW - 3 * DAY_MS,
        },
        addedAt: NOW - 10 * DAY_MS,
        updatedAt: NOW - 3 * DAY_MS,
      }),
    ],
    {
      description: 'Current TV, movie, and anime rotation.',
      pinned: true,
      templateId: 'template-watch',
      updatedAt: NOW - DAY_MS,
    }
  ),
  createSeedList(
    'list-reading',
    'Reading Queue',
    [
      createSeedEntry('seed-read-1', 'Blue Period', 'manga', {
        imageUrl: 'https://cdn.myanimelist.net/images/manga/1/229262.jpg',
        detailPath: 'manga/107931',
        status: 'active',
        tags: ['morning'],
        progress: {
          current: 38,
          total: 65,
          unit: 'chapter',
          updatedAt: NOW - 2 * DAY_MS,
        },
        addedAt: NOW - 14 * DAY_MS,
        updatedAt: NOW - 2 * DAY_MS,
      }),
      createSeedEntry('seed-read-2', 'Project Hail Mary', 'book', {
        detailPath: 'books/works--OL24210561W',
        status: 'planned',
        tags: ['sci-fi'],
        addedAt: NOW - 5 * DAY_MS,
        updatedAt: NOW - 5 * DAY_MS,
      }),
    ],
    {
      description: 'Books and manga to keep moving through.',
      pinned: true,
      templateId: 'template-reading',
      updatedAt: NOW - 2 * DAY_MS,
    }
  ),
  createSeedList(
    'list-favorites',
    'Finished Favorites',
    [
      createSeedEntry('seed-fav-1', 'Steins;Gate', 'anime', {
        imageUrl: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg',
        detailPath: 'anime/9253',
        status: 'completed',
        rating: 10,
        tags: ['all-timer'],
        addedAt: NOW - 60 * DAY_MS,
        updatedAt: NOW - 20 * DAY_MS,
      }),
      createSeedEntry('seed-fav-2', 'Everything Everywhere All at Once', 'movie', {
        imageUrl: 'https://image.tmdb.org/t/p/w342/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
        detailPath: 'tv-movie/movie/545611',
        status: 'completed',
        rating: 9,
        tags: ['rewatch'],
        addedAt: NOW - 45 * DAY_MS,
        updatedAt: NOW - 12 * DAY_MS,
      }),
    ],
    {
      description: 'Completed items worth keeping visible.',
      updatedAt: NOW - 12 * DAY_MS,
    }
  ),
  createSeedList(
    'list-links',
    'Quick Captures',
    [
      createSeedEntry('seed-link-1', 'Mechanical keyboard switch sampler', 'link', {
        imageUrl:
          'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=600&q=80',
        status: 'planned',
        tags: ['sale'],
        productUrl: 'https://example.com/keyboard-switch-sampler',
        price: '$18.00',
        sourceRef: {
          source: 'link',
          canonicalUrl: 'https://example.com/keyboard-switch-sampler',
        },
        notes: 'Compare against tactile pack before ordering.',
        addedAt: NOW - 3 * DAY_MS,
        updatedAt: NOW - 3 * DAY_MS,
      }),
    ],
    {
      description: 'Manual notes, link imports, and one-off ideas.',
      preset: 'blank',
      templateId: 'template-links',
      updatedAt: NOW - 3 * DAY_MS,
    }
  ),
];

export const MOCK_LISTS = DEFAULT_LISTS;
export const MOCK_TIER_SUBLISTS: TrackerList[] = [];

export const LEGACY_MOCK_LISTS: TrackerList[] = [
  createSeedList(
    'list-watchlist',
    'Watchlist',
    [
      createSeedEntry('e1', 'Attack on Titan', 'anime', {
        imageUrl: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
        detailPath: 'anime/16498',
      }),
      createSeedEntry('e2', 'Dune', 'movie', {
        imageUrl: 'https://image.tmdb.org/t/p/w200/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
        detailPath: 'tv-movie/movie/438631',
      }),
      createSeedEntry('e3', 'The Legend of Zelda: Breath of the Wild', 'game', {
        detailPath: 'games/7346',
      }),
      createSeedEntry('e4', 'Chainsaw Man', 'manga', {
        imageUrl: 'https://cdn.myanimelist.net/images/manga/3/216464.jpg',
        detailPath: 'manga/116778',
      }),
    ],
    { preset: 'tracking' }
  ),
  createSeedList(
    'list-favorites',
    'Favorites',
    [
      createSeedEntry('e5', 'Steins;Gate', 'anime', {
        imageUrl: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg',
        detailPath: 'anime/9253',
      }),
      createSeedEntry('e6', 'Breaking Bad', 'tv', {
        imageUrl: 'https://image.tmdb.org/t/p/w200/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        detailPath: 'tv-movie/tv/1396',
      }),
      createSeedEntry('e7', 'Project Hail Mary', 'book', {
        detailPath: 'books/OL21745884W',
      }),
    ]
  ),
  createSeedList(
    'list-reading',
    'Currently Reading',
    [
      createSeedEntry('e8', 'Berserk', 'manga', {
        imageUrl: 'https://cdn.myanimelist.net/images/manga/1/157931.jpg',
        detailPath: 'manga/2',
      }),
      createSeedEntry('e9', 'The Three-Body Problem', 'book', {
        detailPath: 'books/OL17267881W',
      }),
    ]
  ),
  createSeedList(
    'list-games-backlog',
    'Games Backlog',
    [
      createSeedEntry('e10', 'Elden Ring', 'game', { detailPath: 'games/190667' }),
      createSeedEntry('e11', 'Hades', 'game', { detailPath: 'games/112461' }),
    ]
  ),
  createSeedList(
    'list-movie-tier',
    'Movie tier list',
    [
      createSeedEntry('tl1', 'S', 'custom', {
        detailPath: 'list/list-tier-s',
        notes: 'Legacy tier list bucket.',
      }),
      createSeedEntry('tl2', 'A', 'custom', {
        detailPath: 'list/list-tier-a',
        notes: 'Legacy tier list bucket.',
      }),
      createSeedEntry('tl3', 'B', 'custom', {
        detailPath: 'list/list-tier-b',
        notes: 'Legacy tier list bucket.',
      }),
      createSeedEntry('tl4', 'C', 'custom', {
        detailPath: 'list/list-tier-c',
        notes: 'Legacy tier list bucket.',
      }),
      createSeedEntry('tl5', 'D', 'custom', {
        detailPath: 'list/list-tier-d',
        notes: 'Legacy tier list bucket.',
      }),
      createSeedEntry('tl6', 'E', 'custom', {
        detailPath: 'list/list-tier-e',
        notes: 'Legacy tier list bucket.',
      }),
      createSeedEntry('tl7', 'F', 'custom', {
        detailPath: 'list/list-tier-f',
        notes: 'Legacy tier list bucket.',
      }),
    ],
    { preset: 'blank' }
  ),
];

export const LEGACY_MOCK_TIER_SUBLISTS: TrackerList[] = [
  createSeedList('list-tier-s', 'S', []),
  createSeedList('list-tier-a', 'A', []),
  createSeedList('list-tier-b', 'B', []),
  createSeedList('list-tier-c', 'C', []),
  createSeedList('list-tier-d', 'D', []),
  createSeedList('list-tier-e', 'E', []),
  createSeedList('list-tier-f', 'F', []),
];

export function cloneEntry(entry: ListEntry): ListEntry {
  return {
    ...entry,
    tags: [...entry.tags],
    customFields: entry.customFields?.map((field) => ({ ...field })),
    progress: entry.progress ? { ...entry.progress } : undefined,
    sourceRef: { ...entry.sourceRef },
  };
}

export function cloneList(list: TrackerList): TrackerList {
  return {
    ...list,
    preferences: { ...list.preferences },
    entries: list.entries.map(cloneEntry),
  };
}

export function createListFromTemplate(template: ListTemplate): TrackerList {
  const timestamp = Date.now();
  return createSeedList(
    `list-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    template.title,
    template.starterEntries.map((entry, index) =>
      createSeedEntry(
        `entry-${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        entry.title,
        entry.type,
        {
          ...entry,
          status: entry.status ?? 'planned',
          tags: entry.tags ?? [],
          sourceRef:
            entry.sourceRef ??
            ({
              source: entry.type === 'game' ? 'custom' : entry.type,
              detailPath: entry.detailPath,
              canonicalUrl: entry.productUrl,
            } satisfies EntrySourceRef),
          addedAt: timestamp,
          updatedAt: timestamp,
        }
      )
    ),
    {
      description: template.description,
      preset: template.preset,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      templateId: template.id,
    }
  );
}
