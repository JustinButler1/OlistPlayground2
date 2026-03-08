import { Platform } from 'react-native';
import LegacyAsyncStorage from '@react-native-async-storage/async-storage';
import SQLiteAsyncStorage from 'expo-sqlite/kv-store';

import {
  cloneList,
  cloneTemplate,
  createPowerUserMockSeed,
  createListConfig,
  DEFAULT_LISTS,
  DEFAULT_LIST_PREFERENCES,
  deriveListConfigFromLegacy,
  LEGACY_MOCK_LISTS,
  LEGACY_MOCK_TIER_SUBLISTS,
  type CustomField,
  type EntryProgress,
  type EntrySourceRef,
  type ItemUserData,
  type ListConfig,
  type ListEntry,
  type ListFilterMode,
  type ListFieldDefinition,
  type ListFieldKind,
  type ListGroupMode,
  type ListPreferences,
  type ListPreset,
  type ListSortMode,
  type ListTemplate,
  type ListViewMode,
  type TrackerList,
} from '@/data/mock-lists';
import {
  normalizeProgress as normalizeTrackerProgress,
  normalizeRating,
} from '@/lib/tracker-metadata';

const STORAGE_KEY = 'lists-state-v5';
const LEGACY_SQLITE_STORAGE_KEY = 'lists-state-v4';
const LEGACY_SQLITE_STORAGE_V2_KEY = 'lists-state-v3';
const LEGACY_SQLITE_STORAGE_V3_KEY = 'lists-state-v2';
const LEGACY_ASYNC_STORAGE_KEY = 'lists-state-v1';

export interface ListsState {
  version: 5;
  lists: TrackerList[];
  deletedLists: TrackerList[];
  savedTemplates: ListTemplate[];
  itemUserDataByKey: Record<string, ItemUserData>;
  recentSearches: string[];
  recentListIds: string[];
  reminderNotificationIds: Record<string, string>;
  lastExportedAt?: number;
}

interface LegacyChildChange {
  checked?: boolean;
  updatedAt?: number;
}

interface LegacyListMetadata {
  viewMode?: 'list' | 'grid' | 'compare' | 'tier';
  updatedAt?: number;
}

interface LegacyEntry {
  id: string;
  title: string;
  type?: string;
  imageUrl?: string;
  detailPath?: string;
  notes?: string;
  customFields?: CustomField[];
  totalEpisodes?: number;
  totalChapters?: number;
  totalVolumes?: number;
  productUrl?: string;
  price?: string;
}

interface LegacyList {
  id: string;
  title: string;
  preset?: ListPreset;
  entries?: LegacyEntry[];
}

interface LegacyListsState {
  userLists?: LegacyList[];
  addedByListId?: Record<string, LegacyEntry[]>;
  listMetadataById?: Record<string, LegacyListMetadata>;
  childChangesByListId?: Record<string, Record<string, LegacyChildChange>>;
  deletedListIds?: Record<string, true>;
  deletedEntryIdsByListId?: Record<string, Record<string, true>>;
}

interface ExportEnvelope {
  exportedAt: number;
  payload: ListsState;
}

export function createInitialListsState(): ListsState {
  return {
    version: 5,
    lists: DEFAULT_LISTS.map(cloneList),
    deletedLists: [],
    savedTemplates: [],
    itemUserDataByKey: {},
    recentSearches: [],
    recentListIds: [],
    reminderNotificationIds: {},
  };
}

export function createPowerUserMockListsState(): ListsState {
  const seed = createPowerUserMockSeed();
  const normalizeSeedList = (list: TrackerList): TrackerList => ({
    ...cloneList(list),
    entries: list.entries.map((entry) => ({
      ...entry,
      rating: normalizeRating(entry.rating),
      progress: normalizeTrackerProgress(entry.progress),
    })),
  });

  return {
    version: 5,
    lists: seed.lists.map(normalizeSeedList),
    deletedLists: seed.deletedLists.map(normalizeSeedList),
    savedTemplates: seed.savedTemplates.map(cloneTemplate),
    itemUserDataByKey: Object.fromEntries(
      Object.entries(seed.itemUserDataByKey).map(([key, item]) => [
        key,
        {
          ...item,
          tags: [...item.tags],
          rating: normalizeRating(item.rating),
          progress: normalizeTrackerProgress(item.progress),
          customFields: item.customFields.map((field) => ({ ...field })),
        },
      ])
    ),
    recentSearches: [...seed.recentSearches],
    recentListIds: [...seed.recentListIds],
    reminderNotificationIds: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isListViewMode(value: unknown): value is ListViewMode {
  return value === 'list' || value === 'grid' || value === 'compare' || value === 'tier';
}

function isListSortMode(value: unknown): value is ListSortMode {
  return (
    value === 'updated-desc' ||
    value === 'title-asc' ||
    value === 'rating-desc' ||
    value === 'status'
  );
}

function isListFilterMode(value: unknown): value is ListFilterMode {
  return (
    value === 'all' ||
    value === 'active' ||
    value === 'planned' ||
    value === 'completed' ||
    value === 'paused' ||
    value === 'dropped' ||
    value === 'archived'
  );
}

function isListGroupMode(value: unknown): value is ListGroupMode {
  return value === 'none' || value === 'status' || value === 'tag';
}

function isListFieldKind(value: unknown): value is ListFieldKind {
  return value === 'text' || value === 'number' || value === 'url';
}

function isListAddon(value: unknown): value is ListConfig['addons'][number] {
  return (
    value === 'status' ||
    value === 'progress' ||
    value === 'rating' ||
    value === 'tags' ||
    value === 'notes' ||
    value === 'reminders' ||
    value === 'cover' ||
    value === 'links' ||
    value === 'custom-fields' ||
    value === 'sublists' ||
    value === 'compare' ||
    value === 'tier'
  );
}

function normalizeFieldDefinitions(value: unknown): ListFieldDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (field): field is Record<string, unknown> =>
        isRecord(field) &&
        typeof field.id === 'string' &&
        typeof field.label === 'string' &&
        isListFieldKind(field.kind)
    )
    .map((field) => ({
      id: field.id as string,
      label: field.label as string,
      kind: field.kind as ListFieldKind,
    }));
}

function normalizeListConfig(
  value: unknown,
  fallback?: { entries?: ListEntry[]; preset?: ListPreset }
): ListConfig {
  if (!isRecord(value)) {
    return deriveListConfigFromLegacy({
      preset: fallback?.preset,
      entries: fallback?.entries,
    });
  }

  const defaultEntryType =
    value.defaultEntryType === 'anime' ||
    value.defaultEntryType === 'manga' ||
    value.defaultEntryType === 'book' ||
    value.defaultEntryType === 'movie' ||
    value.defaultEntryType === 'tv' ||
    value.defaultEntryType === 'link' ||
    value.defaultEntryType === 'custom'
      ? value.defaultEntryType
      : 'custom';

  return createListConfig({
    addons: Array.isArray(value.addons)
      ? value.addons.filter((item): item is ListConfig['addons'][number] => isListAddon(item))
      : deriveListConfigFromLegacy({
          preset: fallback?.preset,
          entries: fallback?.entries,
        }).addons,
    fieldDefinitions: normalizeFieldDefinitions(value.fieldDefinitions),
    defaultEntryType,
  });
}

function normalizeItemUserData(value: unknown): ItemUserData | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    rating: normalizeRating(typeof value.rating === 'number' ? value.rating : undefined),
    progress: normalizeTrackerProgress(isRecord(value.progress) ? value.progress : undefined),
    customFields: Array.isArray(value.customFields)
      ? value.customFields
          .filter((field): field is CustomField => isRecord(field) && typeof field.title === 'string')
          .map((field) => ({
            title: field.title,
            value: typeof field.value === 'string' ? field.value : '',
            format: field.format === 'numbers' ? 'numbers' : 'text',
          }))
      : [],
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
  };
}

function normalizeSourceRef(value: unknown, fallback: Partial<EntrySourceRef> = {}): EntrySourceRef {
  const record = isRecord(value) ? value : {};
  const source = typeof record.source === 'string' ? record.source : fallback.source ?? 'custom';
  const normalizedSource =
    source === 'anime' ||
    source === 'manga' ||
    source === 'book' ||
    source === 'movie' ||
    source === 'tv' ||
    source === 'link' ||
    source === 'custom'
      ? source
      : 'custom';

  return {
    source: normalizedSource,
    externalId:
      typeof record.externalId === 'string'
        ? record.externalId
        : fallback.externalId,
    detailPath:
      typeof record.detailPath === 'string'
        ? record.detailPath
        : fallback.detailPath,
    canonicalUrl:
      typeof record.canonicalUrl === 'string'
        ? record.canonicalUrl
        : fallback.canonicalUrl,
  };
}

function normalizeProgress(value: unknown): EntryProgress | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return normalizeTrackerProgress({
    current: typeof value.current === 'number' ? value.current : undefined,
    total: typeof value.total === 'number' ? value.total : undefined,
    unit: value.unit as EntryProgress['unit'],
    label: typeof value.label === 'string' ? value.label : undefined,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : undefined,
  });
}

function normalizePreferences(value: unknown): ListPreferences {
  const record = isRecord(value) ? value : {};

  return {
    viewMode: isListViewMode(record.viewMode)
      ? record.viewMode
      : DEFAULT_LIST_PREFERENCES.viewMode,
    sortMode: isListSortMode(record.sortMode)
      ? record.sortMode
      : DEFAULT_LIST_PREFERENCES.sortMode,
    filterMode: isListFilterMode(record.filterMode)
      ? record.filterMode
      : DEFAULT_LIST_PREFERENCES.filterMode,
    groupMode: isListGroupMode(record.groupMode)
      ? record.groupMode
      : DEFAULT_LIST_PREFERENCES.groupMode,
    showCompleted:
      typeof record.showCompleted === 'boolean'
        ? record.showCompleted
        : DEFAULT_LIST_PREFERENCES.showCompleted,
  };
}

function normalizeListTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeEntry(value: unknown): ListEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null;
  }

  const fallbackSource =
    typeof value.type === 'string' &&
    value.type !== 'game' &&
    value.type !== 'list' &&
    value.type !== 'custom' &&
    value.type !== 'link'
      ? { source: value.type as EntrySourceRef['source'] }
      : undefined;

  const type =
    value.type === 'anime' ||
    value.type === 'manga' ||
    value.type === 'movie' ||
    value.type === 'tv' ||
    value.type === 'book' ||
    value.type === 'link' ||
    value.type === 'custom' ||
    value.type === 'game' ||
    value.type === 'list'
      ? value.type
      : 'custom';

  const status =
    value.status === 'planned' ||
    value.status === 'active' ||
    value.status === 'paused' ||
    value.status === 'completed' ||
    value.status === 'dropped'
      ? value.status
      : 'planned';

  return {
    id: value.id,
    title: value.title,
    type,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : undefined,
    detailPath: typeof value.detailPath === 'string' ? value.detailPath : undefined,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    customFields: Array.isArray(value.customFields)
      ? value.customFields
          .filter((field): field is CustomField => isRecord(field) && typeof field.title === 'string')
          .map((field) => ({
            title: field.title,
            value: typeof field.value === 'string' ? field.value : '',
            format: field.format === 'numbers' ? 'numbers' : 'text',
          }))
      : undefined,
    displayVariant:
      value.displayVariant === 'simple' ||
      value.displayVariant === 'checkbox' ||
      value.displayVariant === 'details' ||
      value.displayVariant === 'checkbox-details'
        ? value.displayVariant
        : undefined,
    totalEpisodes:
      typeof value.totalEpisodes === 'number' ? value.totalEpisodes : undefined,
    totalChapters:
      typeof value.totalChapters === 'number' ? value.totalChapters : undefined,
    totalVolumes:
      typeof value.totalVolumes === 'number' ? value.totalVolumes : undefined,
    linkedEntryId:
      typeof value.linkedEntryId === 'string' ? value.linkedEntryId : undefined,
    linkedListId:
      typeof value.linkedListId === 'string' ? value.linkedListId : undefined,
    status,
    rating: normalizeRating(typeof value.rating === 'number' ? value.rating : undefined),
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    progress: normalizeProgress(value.progress),
    sourceRef: normalizeSourceRef(value.sourceRef, {
      ...fallbackSource,
      detailPath: typeof value.detailPath === 'string' ? value.detailPath : undefined,
      canonicalUrl:
        typeof value.productUrl === 'string'
          ? value.productUrl
          : typeof value.canonicalUrl === 'string'
          ? value.canonicalUrl
          : undefined,
    }),
    addedAt: typeof value.addedAt === 'number' ? value.addedAt : Date.now(),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    reminderAt: typeof value.reminderAt === 'number' ? value.reminderAt : undefined,
    coverAssetUri:
      typeof value.coverAssetUri === 'string' ? value.coverAssetUri : undefined,
    productUrl: typeof value.productUrl === 'string' ? value.productUrl : undefined,
    price: typeof value.price === 'string' ? value.price : undefined,
    archivedAt: typeof value.archivedAt === 'number' ? value.archivedAt : undefined,
  };
}

function normalizeList(value: unknown): TrackerList | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null;
  }

  const entries = Array.isArray(value.entries)
    ? value.entries
        .map((entry) => normalizeEntry(entry))
        .filter((entry): entry is ListEntry => entry !== null)
    : [];
  const preset = value.preset === 'blank' ? 'blank' : 'tracking';

  return {
    id: value.id,
    title: value.title,
    description: typeof value.description === 'string' ? value.description : undefined,
    tags: normalizeListTags(value.tags),
    preset,
    config: normalizeListConfig(value.config, { entries, preset }),
    entries,
    preferences: normalizePreferences(value.preferences),
    pinned: typeof value.pinned === 'boolean' ? value.pinned : false,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
    templateId: typeof value.templateId === 'string' ? value.templateId : undefined,
    parentListId: typeof value.parentListId === 'string' ? value.parentListId : undefined,
    archivedAt: typeof value.archivedAt === 'number' ? value.archivedAt : undefined,
    deletedAt: typeof value.deletedAt === 'number' ? value.deletedAt : undefined,
  };
}

function normalizeTemplate(value: unknown): ListTemplate | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string'
  ) {
    return null;
  }

  const starterEntries = Array.isArray(value.starterEntries)
    ? value.starterEntries
        .map((entry) => normalizeEntry({ ...entry, id: entry.id ?? 'template-entry', addedAt: Date.now(), updatedAt: Date.now() }))
        .filter((entry): entry is ListEntry => entry !== null)
        .map((entry) => {
          const { id, addedAt, updatedAt, ...rest } = entry;
          return rest;
        })
    : [];
  const preset = value.preset === 'blank' ? 'blank' : 'tracking';

  return {
    id: value.id,
    title: value.title,
    description: value.description,
    source: value.source === 'user' ? 'user' : 'built-in',
    preset,
    config: normalizeListConfig(value.config, { preset }),
    starterEntries,
  };
}

function normalizeListsState(value: unknown): ListsState | null {
  if (!isRecord(value)) {
    return null;
  }

  const lists = Array.isArray(value.lists)
    ? value.lists.map((list) => normalizeList(list)).filter((list): list is TrackerList => list !== null)
    : [];
  const deletedLists = Array.isArray(value.deletedLists)
    ? value.deletedLists
        .map((list) => normalizeList(list))
        .filter((list): list is TrackerList => list !== null)
    : [];
  const savedTemplates = Array.isArray(value.savedTemplates)
    ? value.savedTemplates
        .map((template) => normalizeTemplate(template))
        .filter((template): template is ListTemplate => template !== null)
    : [];
  const itemUserDataByKey = isRecord(value.itemUserDataByKey)
    ? Object.fromEntries(
        Object.entries(value.itemUserDataByKey)
          .map(([key, item]) => [key, normalizeItemUserData(item)] as const)
          .filter((entry): entry is [string, ItemUserData] => entry[1] !== null)
      )
    : {};

  const recentSearches = Array.isArray(value.recentSearches)
    ? value.recentSearches.filter((item): item is string => typeof item === 'string')
    : [];
  const recentListIds = Array.isArray(value.recentListIds)
    ? value.recentListIds.filter((item): item is string => typeof item === 'string')
    : [];

  const reminderNotificationIds = isRecord(value.reminderNotificationIds)
    ? Object.fromEntries(
        Object.entries(value.reminderNotificationIds).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      )
    : {};

  return {
    version: 5,
    lists,
    deletedLists,
    savedTemplates,
    itemUserDataByKey,
    recentSearches,
    recentListIds,
    reminderNotificationIds,
    lastExportedAt:
      typeof value.lastExportedAt === 'number' ? value.lastExportedAt : undefined,
  };
}

function normalizeLegacyState(value: unknown): LegacyListsState | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    userLists: Array.isArray(value.userLists) ? (value.userLists as LegacyList[]) : [],
    addedByListId: isRecord(value.addedByListId)
      ? (value.addedByListId as Record<string, LegacyEntry[]>)
      : {},
    listMetadataById: isRecord(value.listMetadataById)
      ? (value.listMetadataById as Record<string, LegacyListMetadata>)
      : {},
    childChangesByListId: isRecord(value.childChangesByListId)
      ? (value.childChangesByListId as Record<string, Record<string, LegacyChildChange>>)
      : {},
    deletedListIds: isRecord(value.deletedListIds)
      ? (value.deletedListIds as Record<string, true>)
      : {},
    deletedEntryIdsByListId: isRecord(value.deletedEntryIdsByListId)
      ? (value.deletedEntryIdsByListId as Record<string, Record<string, true>>)
      : {},
  };
}

function legacyViewModeToPreferences(metadata?: LegacyListMetadata): ListPreferences {
  const viewMode =
    metadata?.viewMode === 'grid' ||
    metadata?.viewMode === 'compare' ||
    metadata?.viewMode === 'tier'
      ? metadata.viewMode
      : 'list';
  return {
    ...DEFAULT_LIST_PREFERENCES,
    viewMode,
  };
}

function progressFromLegacyEntry(entry: LegacyEntry): EntryProgress | undefined {
  if (typeof entry.totalEpisodes === 'number') {
    return {
      current: undefined,
      total: entry.totalEpisodes,
      unit: 'episode',
      updatedAt: Date.now(),
    };
  }

  if (typeof entry.totalChapters === 'number') {
    return {
      current: undefined,
      total: entry.totalChapters,
      unit: 'chapter',
      updatedAt: Date.now(),
    };
  }

  if (typeof entry.totalVolumes === 'number') {
    return {
      current: undefined,
      total: entry.totalVolumes,
      unit: 'volume',
      updatedAt: Date.now(),
    };
  }

  return undefined;
}

function sourceFromLegacyType(type?: string): EntrySourceRef['source'] {
  switch (type) {
    case 'anime':
    case 'manga':
    case 'book':
    case 'movie':
    case 'tv':
    case 'link':
      return type;
    default:
      return 'custom';
  }
}

function convertLegacyEntry(
  entry: LegacyEntry,
  childChange?: LegacyChildChange,
  updatedAt = Date.now()
): ListEntry {
  const type =
    entry.type === 'anime' ||
    entry.type === 'manga' ||
    entry.type === 'book' ||
    entry.type === 'movie' ||
    entry.type === 'tv' ||
    entry.type === 'link' ||
    entry.type === 'game' ||
    entry.type === 'list'
      ? entry.type
      : 'custom';

  const progress = progressFromLegacyEntry(entry);

  return {
    id: entry.id,
    title: entry.title,
    type,
    imageUrl: entry.imageUrl,
    detailPath: entry.detailPath,
    notes: entry.notes,
    customFields: entry.customFields,
    displayVariant: undefined,
    totalEpisodes: entry.totalEpisodes,
    totalChapters: entry.totalChapters,
    totalVolumes: entry.totalVolumes,
    linkedEntryId: undefined,
    linkedListId: undefined,
    status: childChange?.checked ? 'completed' : 'planned',
    rating: undefined,
    tags: [],
    progress,
    sourceRef: {
      source: sourceFromLegacyType(entry.type),
      detailPath: entry.detailPath,
      canonicalUrl: entry.productUrl,
      externalId: entry.detailPath?.split('/').pop(),
    },
    addedAt: updatedAt,
    updatedAt: childChange?.updatedAt ?? updatedAt,
    reminderAt: undefined,
    coverAssetUri: undefined,
    productUrl: entry.productUrl,
    price: entry.price,
    archivedAt: undefined,
  };
}

function convertLegacyList(
  list: LegacyList,
  legacy: LegacyListsState,
  timestamp: number
): TrackerList {
  const deletedEntryIds = legacy.deletedEntryIdsByListId?.[list.id] ?? {};
  const baseEntries = Array.isArray(list.entries) ? list.entries : [];
  const addedEntries = legacy.addedByListId?.[list.id] ?? [];
  const childChanges = legacy.childChangesByListId?.[list.id] ?? {};
  const mergedEntries = [...baseEntries, ...addedEntries]
    .filter((entry) => !deletedEntryIds[entry.id])
    .map((entry) => convertLegacyEntry(entry, childChanges[entry.id], timestamp));

  return {
    id: list.id,
    title: list.title,
    description: undefined,
    tags: [],
    preset: list.preset === 'blank' ? 'blank' : 'tracking',
    config: deriveListConfigFromLegacy({
      preset: list.preset === 'blank' ? 'blank' : 'tracking',
      entries: mergedEntries,
    }),
    entries: mergedEntries,
    preferences: legacyViewModeToPreferences(legacy.listMetadataById?.[list.id]),
    pinned: false,
    createdAt: timestamp,
    updatedAt:
      legacy.listMetadataById?.[list.id]?.updatedAt ??
      mergedEntries.reduce((max, entry) => Math.max(max, entry.updatedAt), timestamp),
    templateId: undefined,
    parentListId: undefined,
    archivedAt: undefined,
    deletedAt: undefined,
  };
}

function migrateLegacyState(value: unknown): ListsState | null {
  const legacy = normalizeLegacyState(value);
  if (!legacy) {
    return null;
  }

  const timestamp = Date.now();
  const baseLists = [
    ...LEGACY_MOCK_LISTS.map(cloneList),
    ...LEGACY_MOCK_TIER_SUBLISTS.map(cloneList),
    ...(legacy.userLists ?? []).map((list) => ({
      ...list,
      entries: Array.isArray(list.entries) ? list.entries : [],
    })),
  ];

  const dedupedLists = new Map<string, LegacyList>();
  baseLists.forEach((list) => {
    dedupedLists.set(list.id, list);
  });

  const activeLists: TrackerList[] = [];
  const deletedLists: TrackerList[] = [];

  for (const list of dedupedLists.values()) {
    const converted = convertLegacyList(list, legacy, timestamp);
    if (legacy.deletedListIds?.[list.id]) {
      deletedLists.push({
        ...converted,
        deletedAt: timestamp,
      });
    } else {
      activeLists.push(converted);
    }
  }

  return {
    version: 5,
    lists: activeLists,
    deletedLists,
    savedTemplates: [],
    itemUserDataByKey: {},
    recentSearches: [],
    recentListIds: [],
    reminderNotificationIds: {},
  };
}

async function loadLegacyAsyncStorage(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
  }

  return LegacyAsyncStorage.getItem(LEGACY_ASYNC_STORAGE_KEY);
}

async function clearLegacyAsyncStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
    return;
  }

  await LegacyAsyncStorage.removeItem(LEGACY_ASYNC_STORAGE_KEY);
}

async function clearLegacySqliteStorage(): Promise<void> {
  await SQLiteAsyncStorage.removeItem(LEGACY_SQLITE_STORAGE_KEY);
  await SQLiteAsyncStorage.removeItem(LEGACY_SQLITE_STORAGE_V2_KEY);
  await SQLiteAsyncStorage.removeItem(LEGACY_SQLITE_STORAGE_V3_KEY);
}

export function serializeListsState(state: ListsState): string {
  return JSON.stringify({
    exportedAt: Date.now(),
    payload: state,
  } satisfies ExportEnvelope);
}

export function parseImportedListsState(raw: string): ListsState {
  const parsed = JSON.parse(raw) as unknown;

  if (isRecord(parsed) && 'payload' in parsed) {
    const envelope = parsed as unknown as ExportEnvelope;
    const normalizedPayload = normalizeListsState(envelope.payload);
    if (normalizedPayload) {
      return normalizedPayload;
    }
  }

  const normalized = normalizeListsState(parsed);
  if (!normalized) {
    throw new Error('invalid_backup');
  }

  return normalized;
}

export async function loadListsState(): Promise<ListsState | null> {
  try {
    const raw = await SQLiteAsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeListsState(JSON.parse(raw));
    }

    const legacySqliteRaw = await SQLiteAsyncStorage.getItem(LEGACY_SQLITE_STORAGE_KEY);
    if (legacySqliteRaw) {
      await clearLegacySqliteStorage();
      await clearLegacyAsyncStorage();
      return null;
    }

    const legacySqliteV2Raw = await SQLiteAsyncStorage.getItem(LEGACY_SQLITE_STORAGE_V2_KEY);
    if (legacySqliteV2Raw) {
      await clearLegacySqliteStorage();
      await clearLegacyAsyncStorage();
      return null;
    }

    const legacyAsyncRaw = await loadLegacyAsyncStorage();
    if (legacyAsyncRaw) {
      await clearLegacySqliteStorage();
      await clearLegacyAsyncStorage();
      return null;
    }

    return null;
  } catch (error) {
    console.warn('Failed to load lists state', error);
    return null;
  }
}

export async function saveListsState(state: ListsState): Promise<void> {
  try {
    await SQLiteAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save lists state', error);
  }
}

export async function clearListsState(): Promise<void> {
  try {
    await SQLiteAsyncStorage.removeItem(STORAGE_KEY);
    await clearLegacySqliteStorage();
    await clearLegacyAsyncStorage();
  } catch (error) {
    console.warn('Failed to clear lists state', error);
  }
}

export function cloneListsState(state: ListsState): ListsState {
  return {
    ...state,
    lists: state.lists.map(cloneList),
    deletedLists: state.deletedLists.map(cloneList),
    savedTemplates: state.savedTemplates.map(cloneTemplate),
    itemUserDataByKey: Object.fromEntries(
      Object.entries(state.itemUserDataByKey).map(([key, item]) => [
        key,
        {
          ...item,
          tags: [...item.tags],
          progress: item.progress ? { ...item.progress } : undefined,
          customFields: item.customFields.map((field) => ({ ...field })),
        },
      ])
    ),
    recentSearches: [...state.recentSearches],
    recentListIds: [...state.recentListIds],
    reminderNotificationIds: { ...state.reminderNotificationIds },
  };
}
