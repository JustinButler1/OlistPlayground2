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
export type ListEntryType = EntrySourceType | 'game' | 'list';
export type ListPreset = 'blank' | 'tracking';
export type ListViewMode = 'list' | 'grid' | 'compare' | 'tier';
export type ListSortMode = 'manual' | 'updated-desc' | 'title-asc' | 'rating-desc' | 'status';
export type ListAddonId =
  | 'toggle'
  | 'status'
  | 'progress'
  | 'rating'
  | 'tags'
  | 'notes'
  | 'reminders'
  | 'cover'
  | 'links'
  | 'custom-fields'
  | 'sublists'
  | 'compare'
  | 'tier';
export type ListFieldKind = 'text' | 'number' | 'url';
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
  current?: number;
  total?: number;
  unit: EntryProgressUnit;
  label?: string;
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

export interface ListFieldDefinition {
  id: string;
  label: string;
  kind: ListFieldKind;
}

export interface ListAutomationBlock {
  id: string;
  kind: 'if-then';
  sourceAddonId: 'toggle';
  sourceField: 'checked';
  operator: 'equals';
  sourceValue: boolean;
  targetAddonId: 'status';
  targetField: 'status';
  operation: 'set';
  targetValue: EntryStatus;
}

export interface ListConfig {
  addons: ListAddonId[];
  automationBlocks: ListAutomationBlock[];
  fieldDefinitions: ListFieldDefinition[];
  defaultEntryType: Exclude<ListEntryType, 'game' | 'list'> | 'custom';
}

export interface ItemUserData {
  tags: string[];
  notes?: string;
  rating?: number;
  progress?: EntryProgress;
  customFields: CustomField[];
  updatedAt: number;
}

export interface ListEntry {
  id: string;
  title: string;
  type: ListEntryType;
  imageUrl?: string;
  detailPath?: string;
  notes?: string;
  customFields?: CustomField[];
  displayVariant?: 'simple' | 'checkbox' | 'details' | 'checkbox-details';
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  linkedEntryId?: string;
  linkedListId?: string;
  checked?: boolean;
  status?: EntryStatus;
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
  imageUrl?: string;
  description?: string;
  tags: string[];
  preset: ListPreset;
  config: ListConfig;
  entries: ListEntry[];
  preferences: ListPreferences;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
  parentListId?: string;
  archivedAt?: number;
  deletedAt?: number;
}

export type MockList = TrackerList;

export interface ListTemplate {
  id: string;
  title: string;
  description: string;
  source: 'built-in' | 'user';
  preset: ListPreset;
  config: ListConfig;
  starterEntries: Array<
    Omit<ListEntry, 'id' | 'addedAt' | 'updatedAt' | 'checked' | 'status' | 'tags' | 'sourceRef'>
    & {
      checked?: boolean;
      status?: EntryStatus;
      tags?: string[];
      sourceRef?: EntrySourceRef;
    }
  >;
}

export const DEFAULT_LIST_PREFERENCES: ListPreferences = {
  viewMode: 'list',
  sortMode: 'manual',
  filterMode: 'all',
  groupMode: 'none',
  showCompleted: true,
};

export function createListPreferences(
  overrides: Partial<ListPreferences> = {}
): ListPreferences {
  return {
    ...DEFAULT_LIST_PREFERENCES,
    ...overrides,
  };
}

export const DEFAULT_LIST_CONFIG: ListConfig = {
  addons: [],
  automationBlocks: [],
  fieldDefinitions: [],
  defaultEntryType: 'custom',
};

export const TRACKING_LIST_CONFIG: ListConfig = {
  addons: ['status', 'progress', 'rating', 'tags', 'notes', 'reminders', 'cover'],
  automationBlocks: [],
  fieldDefinitions: [],
  defaultEntryType: 'custom',
};

function normalizeAutomationBlocks(
  blocks: ListAutomationBlock[] | undefined,
  addons: ListAddonId[]
): ListAutomationBlock[] {
  if (!blocks?.length) {
    return [];
  }

  const enabledAddons = new Set(addons);

  return blocks
    .filter((block) => {
      return (
        block.kind === 'if-then' &&
        block.sourceAddonId === 'toggle' &&
        block.sourceField === 'checked' &&
        block.operator === 'equals' &&
        typeof block.sourceValue === 'boolean' &&
        block.targetAddonId === 'status' &&
        block.targetField === 'status' &&
        block.operation === 'set' &&
        (block.targetValue === 'planned' ||
          block.targetValue === 'active' ||
          block.targetValue === 'paused' ||
          block.targetValue === 'completed' ||
          block.targetValue === 'dropped') &&
        enabledAddons.has(block.sourceAddonId) &&
        enabledAddons.has(block.targetAddonId)
      );
    })
    .map((block) => ({
      ...block,
    }));
}

function createListFieldDefinition(
  id: string,
  label: string,
  kind: ListFieldKind
): ListFieldDefinition {
  return {
    id,
    label,
    kind,
  };
}

export function createListConfig(overrides: Partial<ListConfig> = {}): ListConfig {
  const addons = Array.from(new Set(overrides.addons ?? DEFAULT_LIST_CONFIG.addons));
  return {
    addons,
    automationBlocks: normalizeAutomationBlocks(overrides.automationBlocks, addons),
    fieldDefinitions: (overrides.fieldDefinitions ?? []).map((field) => ({
      ...field,
    })),
    defaultEntryType: overrides.defaultEntryType ?? DEFAULT_LIST_CONFIG.defaultEntryType,
  };
}

export function derivePresetFromConfig(config: ListConfig): ListPreset {
  return config.addons.includes('progress') ? 'tracking' : 'blank';
}

export function createListAutomationBlock(
  overrides: Partial<ListAutomationBlock> = {}
): ListAutomationBlock {
  return {
    id: `automation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'if-then',
    sourceAddonId: 'toggle',
    sourceField: 'checked',
    operator: 'equals',
    sourceValue: true,
    targetAddonId: 'status',
    targetField: 'status',
    operation: 'set',
    targetValue: 'completed',
    ...overrides,
  };
}

export function hasListAddon(config: ListConfig, addonId: ListAddonId): boolean {
  return config.addons.includes(addonId);
}

export function sanitizeListPreferencesForConfig(
  preferences: ListPreferences,
  config: ListConfig
): ListPreferences {
  const hasStatus = hasListAddon(config, 'status');
  const hasCompare = hasListAddon(config, 'compare');
  const hasTier = hasListAddon(config, 'tier');

  return {
    ...preferences,
    viewMode:
      preferences.viewMode === 'compare' && !hasCompare
        ? 'list'
        : preferences.viewMode === 'tier' && !hasTier
          ? 'list'
          : preferences.viewMode,
    sortMode:
      preferences.sortMode === 'status' && !hasStatus ? 'manual' : preferences.sortMode,
    filterMode:
      !hasStatus &&
      preferences.filterMode !== 'all' &&
      preferences.filterMode !== 'archived'
        ? 'all'
        : preferences.filterMode,
    groupMode:
      preferences.groupMode === 'status' && !hasStatus ? 'none' : preferences.groupMode,
    showCompleted: hasStatus ? preferences.showCompleted : true,
  };
}

export function applyAutomationBlocks(
  config: ListConfig,
  trigger: {
    addonId: 'toggle';
    field: 'checked';
    value: boolean;
  }
): Partial<ListEntry> {
  if (!hasListAddon(config, trigger.addonId)) {
    return {};
  }

  const nextUpdates: Partial<ListEntry> = {};

  config.automationBlocks.forEach((block) => {
    if (
      block.sourceAddonId !== trigger.addonId ||
      block.sourceField !== trigger.field ||
      block.sourceValue !== trigger.value
    ) {
      return;
    }

    if (block.targetAddonId === 'status' && hasListAddon(config, 'status')) {
      nextUpdates.status = block.targetValue;
    }
  });

  return nextUpdates;
}

export function createEmptyItemUserData(): ItemUserData {
  return {
    tags: [],
    progress: undefined,
    customFields: [],
    updatedAt: Date.now(),
  };
}

export function getItemUserDataKey(source: EntrySourceType, externalId: string): string {
  return `${source}:${externalId}`;
}

function createSeedEntry(
  id: string,
  title: string,
  type: ListEntryType,
  options: Partial<ListEntry> = {}
): ListEntry {
  const source =
    options.sourceRef?.source ??
    (type === 'game' || type === 'list' ? 'custom' : type);
  const progressUpdatedAt =
    options.progress?.updatedAt ?? options.updatedAt ?? options.addedAt ?? NOW;

  return {
    id,
    title,
    type,
    checked: options.checked,
    status: options.status,
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
    displayVariant: options.displayVariant,
    totalEpisodes: options.totalEpisodes,
    totalChapters: options.totalChapters,
    totalVolumes: options.totalVolumes,
    linkedEntryId: options.linkedEntryId,
    linkedListId: options.linkedListId,
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
  const config = createListConfig(options.config ?? (options.preset === 'tracking'
    ? TRACKING_LIST_CONFIG
    : DEFAULT_LIST_CONFIG));

  return {
    id,
    title,
    imageUrl: options.imageUrl,
    description: options.description,
    tags: options.tags ? [...options.tags] : [],
    preset: options.preset ?? derivePresetFromConfig(config),
    config,
    entries,
    preferences: sanitizeListPreferencesForConfig(
      options.preferences ?? DEFAULT_LIST_PREFERENCES,
      config
    ),
    pinned: options.pinned ?? false,
    createdAt: options.createdAt ?? NOW,
    updatedAt: options.updatedAt ?? NOW,
    templateId: options.templateId,
    parentListId: options.parentListId,
    archivedAt: options.archivedAt,
    deletedAt: options.deletedAt,
  };
}

export const BUILT_IN_LIST_TEMPLATES: ListTemplate[] = [
  {
    id: 'template-books',
    title: 'Book Tracking',
    description: 'Progress, ratings, reminders, and a few book-specific fields.',
    source: 'built-in',
    preset: 'tracking',
    config: createListConfig({
      addons: ['status', 'progress', 'rating', 'tags', 'notes', 'reminders', 'cover', 'custom-fields'],
      fieldDefinitions: [
        createListFieldDefinition('book-author', 'Author', 'text'),
        createListFieldDefinition('book-format', 'Format', 'text'),
        createListFieldDefinition('book-pages', 'Pages', 'number'),
      ],
      defaultEntryType: 'book',
    }),
    starterEntries: [],
  },
  {
    id: 'template-recipes',
    title: 'Recipes',
    description: 'Ingredient and prep metadata without forcing a separate recipe mode.',
    source: 'built-in',
    preset: 'blank',
    config: createListConfig({
      addons: ['tags', 'notes', 'cover', 'links', 'custom-fields'],
      fieldDefinitions: [
        createListFieldDefinition('recipe-servings', 'Servings', 'number'),
        createListFieldDefinition('recipe-cook-time', 'Cook Time', 'number'),
        createListFieldDefinition('recipe-source', 'Source URL', 'url'),
      ],
      defaultEntryType: 'custom',
    }),
    starterEntries: [],
  },
  {
    id: 'template-projects',
    title: 'Project Planning',
    description: 'Statuses, reminders, sublists, and custom fields for flexible planning.',
    source: 'built-in',
    preset: 'blank',
    config: createListConfig({
      addons: ['status', 'tags', 'notes', 'reminders', 'sublists', 'custom-fields'],
      fieldDefinitions: [
        createListFieldDefinition('project-owner', 'Owner', 'text'),
        createListFieldDefinition('project-due', 'Due Date', 'text'),
        createListFieldDefinition('project-link', 'Reference URL', 'url'),
      ],
      defaultEntryType: 'custom',
    }),
    starterEntries: [],
  },
  {
    id: 'template-tier',
    title: 'Tier List',
    description: 'A generic list with sublists and tier view enabled.',
    source: 'built-in',
    preset: 'blank',
    config: createListConfig({
      addons: ['sublists', 'tier', 'cover'],
      fieldDefinitions: [],
      defaultEntryType: 'custom',
    }),
    starterEntries: [],
  },
];

export const LIST_TEMPLATES = BUILT_IN_LIST_TEMPLATES;

export function deriveListConfigFromLegacy(options: {
  preset?: ListPreset;
  entries?: Pick<
    ListEntry,
    | 'customFields'
    | 'checked'
    | 'detailPath'
    | 'linkedListId'
    | 'notes'
    | 'productUrl'
    | 'rating'
    | 'reminderAt'
    | 'status'
    | 'tags'
    | 'type'
    | 'progress'
  >[];
}): ListConfig {
  const addons = new Set<ListAddonId>(DEFAULT_LIST_CONFIG.addons);
  const entries = options.entries ?? [];

  if (options.preset === 'tracking') {
    addons.add('status');
    addons.add('progress');
    addons.add('rating');
    addons.add('cover');
  }

  entries.forEach((entry) => {
    if (entry.checked !== undefined) {
      addons.add('toggle');
    }
    if (entry.status && entry.status !== 'planned') {
      addons.add('status');
    }
    if (entry.progress) {
      addons.add('progress');
    }
    if (typeof entry.rating === 'number') {
      addons.add('rating');
    }
    if (entry.tags?.length) {
      addons.add('tags');
    }
    if (entry.notes) {
      addons.add('notes');
    }
    if (entry.reminderAt) {
      addons.add('reminders');
    }
    if (entry.productUrl || entry.type === 'link') {
      addons.add('links');
    }
    if (entry.customFields?.length) {
      addons.add('custom-fields');
      addons.add('compare');
    }
    if (entry.linkedListId || entry.detailPath?.startsWith('list/')) {
      addons.add('sublists');
    }
  });

  if (entries.some((entry) => entry.linkedListId)) {
    addons.add('tier');
  }

  const defaultEntryType =
    options.preset === 'tracking'
      ? 'custom'
      : ((entries.find((entry) => entry.type !== 'list' && entry.type !== 'game')?.type ??
          'custom') as ListConfig['defaultEntryType']);

  return createListConfig({
    addons: [...addons],
    defaultEntryType,
  });
}

export interface MockListsSeed {
  lists: TrackerList[];
  deletedLists: TrackerList[];
  savedTemplates: ListTemplate[];
  itemUserDataByKey: Record<string, ItemUserData>;
  recentSearches: string[];
  recentListIds: string[];
}

function bookKeyToDetailPath(key: string): string {
  return `books/${key.replace(/^\//, '').replace(/\//g, '--')}`;
}

export function createPowerUserMockSeed(): MockListsSeed {
  const tmdbPoster = (path: string) => `https://image.tmdb.org/t/p/w342${path}`;
  const createUserData = (
    tags: string[],
    notes: string,
    rating?: number,
    customFields: CustomField[] = []
  ): ItemUserData => ({
    tags,
    notes,
    rating,
    customFields,
    updatedAt: NOW - DAY_MS,
  });

  const watchQueueId = 'list-mock-watch-queue';
  const readingStackId = 'list-mock-reading-stack';
  const wishlistId = 'list-mock-wishlist';
  const homeProjectsId = 'list-mock-home-projects';
  const pantryResetId = 'list-mock-pantry-reset';
  const galleryWallId = 'list-mock-gallery-wall';
  const takeoutTierId = 'list-mock-takeout-tier';
  const takeoutSTierId = 'list-mock-takeout-s';
  const takeoutATierId = 'list-mock-takeout-a';
  const takeoutBTierId = 'list-mock-takeout-b';
  const takeoutCTierId = 'list-mock-takeout-c';
  const archivedReadingChallengeId = 'list-mock-reading-challenge-2025';
  const deletedGiftIdeasId = 'list-mock-gift-ideas-2025';

  const watchQueue = createSeedList(
    watchQueueId,
    'Watch Queue',
    [
      createSeedEntry('entry-mock-frieren', 'Sousou no Frieren', 'anime', {
        imageUrl: 'https://myanimelist.net/images/anime/1015/138006.jpg',
        detailPath: 'anime/52991',
        totalEpisodes: 28,
        status: 'active',
        rating: 10,
        tags: ['fantasy', 'weekly'],
        progress: {
          current: 21,
          total: 28,
          unit: 'episode',
          updatedAt: NOW - DAY_MS,
        },
        notes: 'Saving the final arc for a quiet Sunday binge.',
        reminderAt: NOW + DAY_MS * 2,
        sourceRef: {
          source: 'anime',
          externalId: '52991',
          detailPath: 'anime/52991',
        },
        addedAt: NOW - DAY_MS * 28,
        updatedAt: NOW - DAY_MS,
      }),
      createSeedEntry('entry-mock-blue-lock', 'Blue Lock', 'anime', {
        imageUrl: 'https://myanimelist.net/images/anime/1258/126929.jpg',
        detailPath: 'anime/49596',
        totalEpisodes: 24,
        status: 'paused',
        rating: 8,
        tags: ['sports', 'dub'],
        progress: {
          current: 14,
          total: 24,
          unit: 'episode',
          updatedAt: NOW - DAY_MS * 6,
        },
        notes: 'On pause until the group watch catches up.',
        sourceRef: {
          source: 'anime',
          externalId: '49596',
          detailPath: 'anime/49596',
        },
        addedAt: NOW - DAY_MS * 40,
        updatedAt: NOW - DAY_MS * 6,
      }),
      createSeedEntry('entry-mock-the-bear', 'The Bear', 'tv', {
        imageUrl: tmdbPoster('/eKfVzzEazSIjJMrw9ADa2x8ksLz.jpg'),
        detailPath: 'tv-movie/tv/136315',
        status: 'completed',
        rating: 9,
        tags: ['rewatch', 'fx'],
        progress: {
          current: 18,
          total: 18,
          unit: 'episode',
          updatedAt: NOW - DAY_MS * 4,
        },
        notes: 'Season 2 finale still clears almost everything else from last year.',
        sourceRef: {
          source: 'tv',
          externalId: '136315',
          detailPath: 'tv-movie/tv/136315',
        },
        addedAt: NOW - DAY_MS * 75,
        updatedAt: NOW - DAY_MS * 4,
      }),
      createSeedEntry('entry-mock-severance', 'Severance', 'tv', {
        imageUrl: tmdbPoster('/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg'),
        detailPath: 'tv-movie/tv/95396',
        status: 'planned',
        tags: ['apple-tv+', 'office-horror'],
        notes: 'Waiting for two more episodes before starting the new season.',
        reminderAt: NOW + DAY_MS * 5,
        sourceRef: {
          source: 'tv',
          externalId: '95396',
          detailPath: 'tv-movie/tv/95396',
        },
        addedAt: NOW - DAY_MS * 18,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-dune-part-two', 'Dune: Part Two', 'movie', {
        imageUrl: tmdbPoster('/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
        detailPath: 'tv-movie/movie/693134',
        status: 'completed',
        rating: 9,
        tags: ['imax', 'sci-fi'],
        progress: {
          current: 1,
          total: 1,
          unit: 'item',
          updatedAt: NOW - DAY_MS * 8,
        },
        notes: 'Rewatch before the next adaptation lands.',
        sourceRef: {
          source: 'movie',
          externalId: '693134',
          detailPath: 'tv-movie/movie/693134',
        },
        addedAt: NOW - DAY_MS * 12,
        updatedAt: NOW - DAY_MS * 8,
      }),
    ],
    {
      description: 'A mixed media queue with progress, reminders, and ratings.',
      preset: 'tracking',
      pinned: true,
      config: createListConfig({
        addons: ['status', 'progress', 'rating', 'tags', 'notes', 'reminders', 'cover'],
        fieldDefinitions: [],
        defaultEntryType: 'tv',
      }),
      preferences: createListPreferences({
        viewMode: 'grid',
        groupMode: 'status',
      }),
      createdAt: NOW - DAY_MS * 90,
      updatedAt: NOW - DAY_MS,
    }
  );

  const readingStack = createSeedList(
    readingStackId,
    'Reading Stack',
    [
      createSeedEntry('entry-mock-atomic-habits', 'Atomic Habits', 'book', {
        imageUrl: 'https://books.google.com/books/content?id=f280CwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        detailPath: bookKeyToDetailPath('f280CwAAQBAJ'),
        status: 'active',
        rating: 9,
        tags: ['nonfiction', 'morning-routine'],
        progress: {
          current: 42,
          total: 100,
          unit: 'percent',
          updatedAt: NOW - DAY_MS * 2,
        },
        reminderAt: NOW + DAY_MS * 1,
        notes: 'Reading a chapter every weekday morning.',
        customFields: [
          { title: 'Creator', value: 'James Clear' },
          { title: 'Format', value: 'Hardcover' },
          { title: 'Length', value: '320', format: 'numbers' },
        ],
        sourceRef: {
          source: 'book',
          externalId: 'f280CwAAQBAJ',
          detailPath: bookKeyToDetailPath('f280CwAAQBAJ'),
          canonicalUrl: 'https://books.google.com/books?id=f280CwAAQBAJ',
        },
        addedAt: NOW - DAY_MS * 24,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-the-hobbit', 'The Hobbit', 'book', {
        imageUrl: 'https://books.google.com/books/content?id=pD6arNyKyi8C&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        detailPath: bookKeyToDetailPath('pD6arNyKyi8C'),
        status: 'completed',
        rating: 10,
        tags: ['fantasy', 'reread'],
        progress: {
          current: 100,
          total: 100,
          unit: 'percent',
          updatedAt: NOW - DAY_MS * 14,
        },
        notes: 'Annual comfort reread in late December.',
        customFields: [
          { title: 'Creator', value: 'J.R.R. Tolkien' },
          { title: 'Format', value: 'Paperback' },
          { title: 'Length', value: '310', format: 'numbers' },
        ],
        sourceRef: {
          source: 'book',
          externalId: 'pD6arNyKyi8C',
          detailPath: bookKeyToDetailPath('pD6arNyKyi8C'),
          canonicalUrl: 'https://books.google.com/books?id=pD6arNyKyi8C',
        },
        addedAt: NOW - DAY_MS * 80,
        updatedAt: NOW - DAY_MS * 14,
      }),
      createSeedEntry('entry-mock-blue-period', 'Blue Period', 'manga', {
        detailPath: 'manga/107931',
        status: 'active',
        rating: 9,
        tags: ['art', 'ongoing'],
        progress: {
          current: 64,
          unit: 'chapter',
          updatedAt: NOW - DAY_MS * 1,
        },
        notes: 'Caught up digitally and buying physical volumes slowly.',
        customFields: [
          { title: 'Creator', value: 'Tsubasa Yamaguchi' },
          { title: 'Format', value: 'Digital' },
          { title: 'Length', value: '16', format: 'numbers' },
        ],
        sourceRef: {
          source: 'manga',
          externalId: '107931',
          detailPath: 'manga/107931',
        },
        addedAt: NOW - DAY_MS * 55,
        updatedAt: NOW - DAY_MS * 1,
      }),
      createSeedEntry('entry-mock-one-piece', 'One Piece', 'manga', {
        detailPath: 'manga/13',
        status: 'paused',
        rating: 10,
        tags: ['marathon'],
        progress: {
          current: 1112,
          unit: 'chapter',
          updatedAt: NOW - DAY_MS * 9,
        },
        notes: 'Paused until the current arc is a little further ahead.',
        customFields: [
          { title: 'Creator', value: 'Eiichiro Oda' },
          { title: 'Format', value: 'Shonen Jump app' },
          { title: 'Length', value: '1112', format: 'numbers' },
        ],
        sourceRef: {
          source: 'manga',
          externalId: '13',
          detailPath: 'manga/13',
        },
        addedAt: NOW - DAY_MS * 180,
        updatedAt: NOW - DAY_MS * 9,
      }),
    ],
    {
      description: 'Books and manga managed like a serious reading backlog.',
      preset: 'tracking',
      pinned: true,
      config: createListConfig({
        addons: [
          'status',
          'progress',
          'rating',
          'tags',
          'notes',
          'reminders',
          'cover',
          'custom-fields',
          'compare',
        ],
        fieldDefinitions: [
          createListFieldDefinition('creator', 'Creator', 'text'),
          createListFieldDefinition('format', 'Format', 'text'),
          createListFieldDefinition('length', 'Length', 'number'),
        ],
        defaultEntryType: 'book',
      }),
      preferences: createListPreferences({
        viewMode: 'compare',
        sortMode: 'rating-desc',
      }),
      createdAt: NOW - DAY_MS * 120,
      updatedAt: NOW - DAY_MS,
    }
  );

  const wishlist = createSeedList(
    wishlistId,
    'Wishlist',
    [
      createSeedEntry('entry-mock-aeropress-xl', 'AeroPress XL', 'link', {
        status: 'planned',
        tags: ['coffee', 'gear'],
        notes: 'Large enough for brewing when friends come over.',
        productUrl: 'https://aeropress.com/products/aeropress-xl-coffee-press',
        price: '$69.95',
        customFields: [
          { title: 'Store', value: 'AeroPress' },
          { title: 'Target Price', value: '60', format: 'numbers' },
          { title: 'Why', value: 'Batch coffee without switching to drip gear' },
        ],
        sourceRef: {
          source: 'link',
          canonicalUrl: 'https://aeropress.com/products/aeropress-xl-coffee-press',
        },
        addedAt: NOW - DAY_MS * 20,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-mx-master', 'Logitech MX Master 3S', 'link', {
        status: 'planned',
        tags: ['desk', 'productivity'],
        notes: 'Waiting for a sale before replacing the travel mouse.',
        productUrl: 'https://www.logitech.com/en-us/products/mice/mx-master-3s.910-006556.html',
        price: '$99.99',
        customFields: [
          { title: 'Store', value: 'Logitech' },
          { title: 'Target Price', value: '80', format: 'numbers' },
          { title: 'Why', value: 'Better ergonomics for daily editing work' },
        ],
        sourceRef: {
          source: 'link',
          canonicalUrl:
            'https://www.logitech.com/en-us/products/mice/mx-master-3s.910-006556.html',
        },
        addedAt: NOW - DAY_MS * 31,
        updatedAt: NOW - DAY_MS * 7,
      }),
      createSeedEntry('entry-mock-kindle-paperwhite', 'Kindle Paperwhite Signature Edition', 'link', {
        status: 'planned',
        tags: ['reading', 'travel'],
        notes: 'For library holds and flights when carrying hardcovers gets old.',
        productUrl: 'https://www.amazon.com/dp/B08B495319',
        price: '$189.99',
        customFields: [
          { title: 'Store', value: 'Amazon' },
          { title: 'Target Price', value: '150', format: 'numbers' },
          { title: 'Why', value: 'Battery life and warm light for night reading' },
        ],
        sourceRef: {
          source: 'link',
          canonicalUrl: 'https://www.amazon.com/dp/B08B495319',
        },
        addedAt: NOW - DAY_MS * 16,
        updatedAt: NOW - DAY_MS * 3,
      }),
      createSeedEntry('entry-mock-black-hole', 'Patagonia Black Hole Mini MLC 30L', 'link', {
        status: 'planned',
        tags: ['travel', 'carry-on'],
        notes: 'Would replace the overstuffed weekender bag for short trips.',
        productUrl: 'https://www.patagonia.com/product/black-hole-mini-mlc-convertible-backpack-30-liters/49266.html',
        price: '$199.00',
        customFields: [
          { title: 'Store', value: 'Patagonia' },
          { title: 'Target Price', value: '170', format: 'numbers' },
          { title: 'Why', value: 'Cleaner one-bag setup for 2-3 day trips' },
        ],
        sourceRef: {
          source: 'link',
          canonicalUrl:
            'https://www.patagonia.com/product/black-hole-mini-mlc-convertible-backpack-30-liters/49266.html',
        },
        addedAt: NOW - DAY_MS * 22,
        updatedAt: NOW - DAY_MS * 5,
      }),
    ],
    {
      description: 'A practical wishlist with links, pricing, and comparison notes.',
      preset: 'blank',
      config: createListConfig({
        addons: ['tags', 'notes', 'links', 'cover', 'custom-fields', 'compare'],
        fieldDefinitions: [
          createListFieldDefinition('store', 'Store', 'text'),
          createListFieldDefinition('target-price', 'Target Price', 'number'),
          createListFieldDefinition('why', 'Why', 'text'),
        ],
        defaultEntryType: 'link',
      }),
      preferences: createListPreferences({
        viewMode: 'compare',
      }),
      createdAt: NOW - DAY_MS * 48,
      updatedAt: NOW - DAY_MS * 2,
    }
  );

  const pantryReset = createSeedList(
    pantryResetId,
    'Pantry Reset',
    [
      createSeedEntry('entry-mock-pantry-measure', 'Measure shelf heights', 'custom', {
        status: 'completed',
        tags: ['prep'],
        notes: 'Needed exact measurements before ordering bins.',
        addedAt: NOW - DAY_MS * 11,
        updatedAt: NOW - DAY_MS * 10,
      }),
      createSeedEntry('entry-mock-pantry-bins', 'Order three clear storage bins', 'custom', {
        status: 'active',
        tags: ['shopping'],
        reminderAt: NOW + DAY_MS * 1,
        notes: 'Looking for matching lids so snacks stack cleanly.',
        addedAt: NOW - DAY_MS * 9,
        updatedAt: NOW - DAY_MS * 1,
      }),
      createSeedEntry('entry-mock-pantry-labels', 'Label breakfast and baking shelves', 'custom', {
        status: 'planned',
        tags: ['organization'],
        addedAt: NOW - DAY_MS * 8,
        updatedAt: NOW - DAY_MS * 8,
      }),
    ],
    {
      description: 'Step-by-step checklist for the kitchen refresh.',
      preset: 'blank',
      config: createListConfig({
        addons: ['status', 'tags', 'notes', 'reminders'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      preferences: createListPreferences({
        groupMode: 'status',
      }),
      createdAt: NOW - DAY_MS * 14,
      updatedAt: NOW - DAY_MS * 1,
    }
  );

  const galleryWall = createSeedList(
    galleryWallId,
    'Gallery Wall',
    [
      createSeedEntry('entry-mock-gallery-frames', 'Order five walnut frames', 'custom', {
        status: 'active',
        tags: ['shopping'],
        notes: 'Mix 8x10 and 11x14 sizes.',
        addedAt: NOW - DAY_MS * 18,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-gallery-prints', 'Print family photos from the fall trip', 'custom', {
        status: 'planned',
        tags: ['photos'],
        reminderAt: NOW + DAY_MS * 6,
        addedAt: NOW - DAY_MS * 16,
        updatedAt: NOW - DAY_MS * 16,
      }),
      createSeedEntry('entry-mock-gallery-patch', 'Patch the old anchor holes', 'custom', {
        status: 'planned',
        tags: ['paint'],
        addedAt: NOW - DAY_MS * 15,
        updatedAt: NOW - DAY_MS * 15,
      }),
    ],
    {
      description: 'The short list behind the hallway wall project.',
      preset: 'blank',
      config: createListConfig({
        addons: ['status', 'tags', 'notes', 'reminders'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      preferences: createListPreferences({
        groupMode: 'status',
      }),
      createdAt: NOW - DAY_MS * 20,
      updatedAt: NOW - DAY_MS * 2,
    }
  );

  const homeProjects = createSeedList(
    homeProjectsId,
    'Home Projects',
    [
      createSeedEntry('entry-mock-home-pantry', 'Pantry Reset', 'list', {
        linkedListId: pantryResetId,
        detailPath: `list/${pantryResetId}`,
        status: 'active',
        tags: ['kitchen'],
        notes: 'Sublist tracks the individual setup tasks.',
        customFields: [
          { title: 'Owner', value: 'Justin' },
          { title: 'Due Date', value: 'March 18' },
          { title: 'Budget', value: '120', format: 'numbers' },
        ],
        addedAt: NOW - DAY_MS * 12,
        updatedAt: NOW - DAY_MS * 1,
      }),
      createSeedEntry('entry-mock-home-gallery', 'Entryway Gallery Wall', 'list', {
        linkedListId: galleryWallId,
        detailPath: `list/${galleryWallId}`,
        status: 'planned',
        tags: ['decor'],
        notes: 'Waiting until the frame sizes are final.',
        customFields: [
          { title: 'Owner', value: 'Justin + Sam' },
          { title: 'Due Date', value: 'April 02' },
          { title: 'Budget', value: '240', format: 'numbers' },
        ],
        addedAt: NOW - DAY_MS * 18,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-home-tax', 'Tax paperwork cleanup', 'custom', {
        status: 'active',
        tags: ['admin'],
        reminderAt: NOW + DAY_MS * 4,
        notes: 'Need one digital folder and one physical folder, nothing fancy.',
        customFields: [
          { title: 'Owner', value: 'Justin' },
          { title: 'Due Date', value: 'March 20' },
          { title: 'Budget', value: '0', format: 'numbers' },
        ],
        addedAt: NOW - DAY_MS * 6,
        updatedAt: NOW - DAY_MS * 1,
      }),
      createSeedEntry('entry-mock-home-ac', 'Window AC deep clean', 'custom', {
        status: 'planned',
        tags: ['seasonal'],
        customFields: [
          { title: 'Owner', value: 'Justin' },
          { title: 'Due Date', value: 'April 12' },
          { title: 'Budget', value: '25', format: 'numbers' },
        ],
        addedAt: NOW - DAY_MS * 5,
        updatedAt: NOW - DAY_MS * 5,
      }),
    ],
    {
      description: 'A project list that leans on reminders, custom fields, and sublists.',
      preset: 'blank',
      config: createListConfig({
        addons: ['status', 'tags', 'notes', 'reminders', 'sublists', 'custom-fields'],
        fieldDefinitions: [
          createListFieldDefinition('owner', 'Owner', 'text'),
          createListFieldDefinition('due-date', 'Due Date', 'text'),
          createListFieldDefinition('budget', 'Budget', 'number'),
        ],
        defaultEntryType: 'custom',
      }),
      preferences: createListPreferences({
        groupMode: 'status',
      }),
      createdAt: NOW - DAY_MS * 21,
      updatedAt: NOW - DAY_MS * 1,
    }
  );

  const takeoutSTier = createSeedList(
    takeoutSTierId,
    'S Tier',
    [
      createSeedEntry('entry-mock-cava', 'CAVA', 'custom', {
        tags: ['fast-casual', 'healthy'],
        notes: 'Reliable lunch order, and the pita chips never miss.',
        rating: 9,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-shake-shack', 'Shake Shack', 'custom', {
        tags: ['burgers'],
        notes: 'Best default “everyone agrees on it” dinner order.',
        rating: 9,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 4,
      }),
    ],
    {
      preset: 'blank',
      config: createListConfig({
        addons: ['cover', 'notes', 'tags'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      createdAt: NOW - DAY_MS * 35,
      updatedAt: NOW - DAY_MS * 2,
    }
  );

  const takeoutATier = createSeedList(
    takeoutATierId,
    'A Tier',
    [
      createSeedEntry('entry-mock-sweetgreen', 'Sweetgreen', 'custom', {
        tags: ['salads'],
        notes: 'Solid default for weekdays when energy is low.',
        rating: 8,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 5,
      }),
      createSeedEntry('entry-mock-dominos', "Domino's", 'custom', {
        tags: ['pizza', 'late-night'],
        notes: 'Not artisanal, just dependable.',
        rating: 8,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 7,
      }),
    ],
    {
      preset: 'blank',
      config: createListConfig({
        addons: ['cover', 'notes', 'tags'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      createdAt: NOW - DAY_MS * 35,
      updatedAt: NOW - DAY_MS * 5,
    }
  );

  const takeoutBTier = createSeedList(
    takeoutBTierId,
    'B Tier',
    [
      createSeedEntry('entry-mock-chipotle', 'Chipotle', 'custom', {
        tags: ['burritos'],
        notes: 'Great until the guac price starts feeling personal.',
        rating: 7,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 9,
      }),
      createSeedEntry('entry-mock-five-guys', 'Five Guys', 'custom', {
        tags: ['burgers', 'fries'],
        notes: 'Worth it only when the craving is specific.',
        rating: 7,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 12,
      }),
    ],
    {
      preset: 'blank',
      config: createListConfig({
        addons: ['cover', 'notes', 'tags'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      createdAt: NOW - DAY_MS * 35,
      updatedAt: NOW - DAY_MS * 9,
    }
  );

  const takeoutCTier = createSeedList(
    takeoutCTierId,
    'C Tier',
    [
      createSeedEntry('entry-mock-panera', 'Panera Bread', 'custom', {
        tags: ['soup'],
        notes: 'Fine in airports. Rarely the first choice at home.',
        rating: 5,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 15,
      }),
    ],
    {
      preset: 'blank',
      config: createListConfig({
        addons: ['cover', 'notes', 'tags'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      createdAt: NOW - DAY_MS * 35,
      updatedAt: NOW - DAY_MS * 15,
    }
  );

  const takeoutTier = createSeedList(
    takeoutTierId,
    'Favorite Takeout Tier List',
    [
      createSeedEntry('entry-mock-tier-s', 'S Tier', 'list', {
        linkedListId: takeoutSTierId,
        detailPath: `list/${takeoutSTierId}`,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 2,
      }),
      createSeedEntry('entry-mock-tier-a', 'A Tier', 'list', {
        linkedListId: takeoutATierId,
        detailPath: `list/${takeoutATierId}`,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 5,
      }),
      createSeedEntry('entry-mock-tier-b', 'B Tier', 'list', {
        linkedListId: takeoutBTierId,
        detailPath: `list/${takeoutBTierId}`,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 9,
      }),
      createSeedEntry('entry-mock-tier-c', 'C Tier', 'list', {
        linkedListId: takeoutCTierId,
        detailPath: `list/${takeoutCTierId}`,
        addedAt: NOW - DAY_MS * 35,
        updatedAt: NOW - DAY_MS * 15,
      }),
    ],
    {
      description: 'A lightweight tier board built from linked sublists.',
      preset: 'blank',
      config: createListConfig({
        addons: ['sublists', 'tier', 'cover'],
        fieldDefinitions: [],
        defaultEntryType: 'custom',
      }),
      preferences: createListPreferences({
        viewMode: 'tier',
      }),
      createdAt: NOW - DAY_MS * 35,
      updatedAt: NOW - DAY_MS * 2,
    }
  );

  const archivedReadingChallenge = createSeedList(
    archivedReadingChallengeId,
    '2025 Reading Challenge',
    [
      createSeedEntry('entry-mock-deep-work', 'Deep Work', 'book', {
        status: 'completed',
        rating: 8,
        tags: ['focus'],
        progress: {
          current: 100,
          total: 100,
          unit: 'percent',
          updatedAt: NOW - DAY_MS * 40,
        },
        customFields: [
          { title: 'Creator', value: 'Cal Newport' },
          { title: 'Format', value: 'Audiobook' },
          { title: 'Length', value: '304', format: 'numbers' },
        ],
        addedAt: NOW - DAY_MS * 220,
        updatedAt: NOW - DAY_MS * 40,
      }),
      createSeedEntry('entry-mock-project-hail-mary', 'Project Hail Mary', 'book', {
        status: 'completed',
        rating: 9,
        tags: ['sci-fi'],
        progress: {
          current: 100,
          total: 100,
          unit: 'percent',
          updatedAt: NOW - DAY_MS * 70,
        },
        customFields: [
          { title: 'Creator', value: 'Andy Weir' },
          { title: 'Format', value: 'Hardcover' },
          { title: 'Length', value: '496', format: 'numbers' },
        ],
        addedAt: NOW - DAY_MS * 260,
        updatedAt: NOW - DAY_MS * 70,
      }),
    ],
    {
      description: 'Archived after the yearly challenge wrapped.',
      preset: 'tracking',
      config: createListConfig({
        addons: ['status', 'progress', 'rating', 'tags', 'notes', 'cover', 'custom-fields'],
        fieldDefinitions: [
          createListFieldDefinition('creator-archive', 'Creator', 'text'),
          createListFieldDefinition('format-archive', 'Format', 'text'),
          createListFieldDefinition('length-archive', 'Length', 'number'),
        ],
        defaultEntryType: 'book',
      }),
      preferences: createListPreferences({
        viewMode: 'list',
        filterMode: 'completed',
      }),
      archivedAt: NOW - DAY_MS * 30,
      createdAt: NOW - DAY_MS * 280,
      updatedAt: NOW - DAY_MS * 30,
    }
  );

  const deletedGiftIdeas = createSeedList(
    deletedGiftIdeasId,
    'Holiday Gift Ideas 2025',
    [
      createSeedEntry('entry-mock-gift-hoodie', 'Champion Reverse Weave Hoodie', 'link', {
        productUrl: 'https://www.champion.com/reverse-weave-hoodie.html',
        price: '$65.00',
        notes: 'Good backup gift idea for my brother.',
        tags: ['family'],
        addedAt: NOW - DAY_MS * 100,
        updatedAt: NOW - DAY_MS * 92,
      }),
      createSeedEntry('entry-mock-gift-mug', 'Fellow Carter Move Mug', 'link', {
        productUrl: 'https://fellowproducts.com/products/carter-move-mug',
        price: '$30.00',
        notes: 'Almost bought this twice, so the list did its job.',
        tags: ['coffee'],
        addedAt: NOW - DAY_MS * 103,
        updatedAt: NOW - DAY_MS * 95,
      }),
    ],
    {
      description: 'Deleted after the holidays were over.',
      preset: 'blank',
      config: createListConfig({
        addons: ['tags', 'notes', 'links'],
        fieldDefinitions: [],
        defaultEntryType: 'link',
      }),
      deletedAt: NOW - DAY_MS * 85,
      createdAt: NOW - DAY_MS * 110,
      updatedAt: NOW - DAY_MS * 85,
    }
  );

  return {
    lists: [
      watchQueue,
      readingStack,
      wishlist,
      homeProjects,
      pantryReset,
      galleryWall,
      takeoutTier,
      takeoutSTier,
      takeoutATier,
      takeoutBTier,
      takeoutCTier,
      archivedReadingChallenge,
    ],
    deletedLists: [deletedGiftIdeas],
    savedTemplates: [
      {
        id: 'template-user-weekend-reset',
        title: 'Weekend Reset',
        description: 'A reusable household reset with reminders and a couple of owner fields.',
        source: 'user',
        preset: 'blank',
        config: createListConfig({
          addons: ['status', 'tags', 'notes', 'reminders', 'custom-fields'],
          fieldDefinitions: [
            createListFieldDefinition('weekend-area', 'Area', 'text'),
            createListFieldDefinition('weekend-timebox', 'Timebox', 'number'),
          ],
          defaultEntryType: 'custom',
        }),
        starterEntries: [
          {
            title: 'Laundry',
            type: 'custom',
            status: 'planned',
            tags: ['home'],
            customFields: [
              { title: 'Area', value: 'Bedroom' },
              { title: 'Timebox', value: '45', format: 'numbers' },
            ],
          },
          {
            title: 'Inbox zero',
            type: 'custom',
            status: 'planned',
            tags: ['admin'],
            customFields: [
              { title: 'Area', value: 'Office' },
              { title: 'Timebox', value: '30', format: 'numbers' },
            ],
          },
        ],
      },
    ],
    itemUserDataByKey: {
      [getItemUserDataKey('anime', '52991')]: createUserData(
        ['favorite', 'rewatch'],
        'Episode 10 is still the benchmark for this entire season.',
        10,
        [{ title: 'Watch With', value: 'Sunday dinner crew' }]
      ),
      [getItemUserDataKey('tv', '136315')]: createUserData(
        ['kitchen-nightmare', 'comfort-rewatch'],
        'The sound design alone makes it worth revisiting with headphones.',
        9
      ),
      [getItemUserDataKey('tv', '95396')]: createUserData(
        ['office-horror'],
        'Holding off until I can binge more than one episode at a time.'
      ),
      [getItemUserDataKey('book', '/works/OL17930368W')]: createUserData(
        ['highlight-heavy'],
        'Using this as the current “small habit” reset read.',
        9,
        [{ title: 'Favorite Chapter', value: 'The 2-Minute Rule' }]
      ),
      [getItemUserDataKey('book', '/works/OL27482W')]: createUserData(
        ['comfort-read'],
        'Still the easiest fantasy reread to recommend to anyone.',
        10
      ),
      [getItemUserDataKey('manga', '107931')]: createUserData(
        ['art-school'],
        'One of the best depictions of taste and craft in any manga.',
        9
      ),
      [getItemUserDataKey('manga', '13')]: createUserData(
        ['long-haul'],
        'Too big to track casually, but impossible to drop entirely.',
        10
      ),
    },
    recentSearches: ['frieren', 'atomic habits', 'mx master 3s', 'severance'],
    recentListIds: [watchQueueId, readingStackId, homeProjectsId, wishlistId, takeoutTierId],
  };
}

export const DEFAULT_LISTS: TrackerList[] = [];

export const MOCK_LISTS = DEFAULT_LISTS;
export const MOCK_TIER_SUBLISTS: TrackerList[] = [];

export const LEGACY_MOCK_LISTS: TrackerList[] = [];

export const LEGACY_MOCK_TIER_SUBLISTS: TrackerList[] = [];

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
    tags: [...list.tags],
    config: createListConfig(list.config),
    preferences: { ...list.preferences },
    entries: list.entries.map(cloneEntry),
  };
}

export function cloneTemplate(template: ListTemplate): ListTemplate {
  return {
    ...template,
    config: createListConfig(template.config),
    starterEntries: template.starterEntries.map((entry) => ({
      ...entry,
      checked: entry.checked,
      tags: entry.tags ? [...entry.tags] : undefined,
      progress: entry.progress ? { ...entry.progress } : undefined,
      sourceRef: entry.sourceRef ? { ...entry.sourceRef } : undefined,
      customFields: entry.customFields?.map((field) => ({ ...field })),
    })),
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
          checked: entry.checked,
          status: entry.status,
          tags: entry.tags ?? [],
          sourceRef:
            entry.sourceRef ??
            ({
              source:
                entry.type === 'game' || entry.type === 'list' ? 'custom' : entry.type,
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
      config: template.config,
      preset: template.preset,
      pinned: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      templateId: template.id,
    }
  );
}
