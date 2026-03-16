import {
  createPowerUserMockSeed,
  createListConfig,
  DEFAULT_LIST_PREFERENCES,
  hydrateListHierarchy,
  sanitizeListPreferencesForConfig,
  type EntryProgress,
  type ItemUserData,
  type ListEntry,
  type ListTemplate,
  type MockListsSeed,
  type TrackerList,
} from './mock-lists';

const rawSeed = require('./power-user-mock-seed.json') as MockListsSeed;
const PLACEHOLDER_THUMBNAIL_SIZE = { width: 320, height: 480 };

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function shouldUsePlaceholderThumbnail(key: string): boolean {
  return hashString(`coverage:${key}`) % 4 !== 0;
}

function buildPlaceholderThumbnailUrl(key: string): string {
  const seed = encodeURIComponent(`olist-${hashString(`image:${key}`).toString(36)}`);
  return `https://picsum.photos/seed/${seed}/${PLACEHOLDER_THUMBNAIL_SIZE.width}/${PLACEHOLDER_THUMBNAIL_SIZE.height}`;
}

function normalizeImageUrl(imageUrl?: string): string | undefined {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : undefined;
}

function canResolveJikanThumbnail(
  sourceRef?: Pick<ListEntry['sourceRef'], 'source' | 'externalId'>,
  detailPath?: string
): boolean {
  const rawExternalId =
    sourceRef?.externalId ??
    (detailPath && sourceRef?.source && detailPath.startsWith(`${sourceRef.source}/`)
      ? detailPath.slice(sourceRef.source.length + 1)
      : undefined);
  const numericId = Number(rawExternalId);

  return (
    (sourceRef?.source === 'anime' || sourceRef?.source === 'manga') &&
    Number.isInteger(numericId) &&
    numericId > 0
  );
}

function canUsePlaceholderForRawEntry(
  entry: {
    imageUrl?: string;
    coverAssetUri?: string;
    detailPath?: string;
    sourceRef?: Pick<ListEntry['sourceRef'], 'source' | 'externalId'>;
  }
): boolean {
  return (
    !normalizeImageUrl(entry.imageUrl) &&
    !normalizeImageUrl(entry.coverAssetUri) &&
    !canResolveJikanThumbnail(entry.sourceRef, entry.detailPath)
  );
}

const legacyMockSeed = createPowerUserMockSeed();
const ELIGIBLE_MOCK_LIST_IDS = new Set(
  [...rawSeed.lists, ...rawSeed.deletedLists, ...legacyMockSeed.lists, ...legacyMockSeed.deletedLists]
    .filter((list) => !normalizeImageUrl(list.imageUrl))
    .map((list) => list.id)
);
const ELIGIBLE_MOCK_ENTRY_IDS = new Set(
  [...rawSeed.lists, ...rawSeed.deletedLists, ...legacyMockSeed.lists, ...legacyMockSeed.deletedLists]
    .flatMap((list) => list.entries)
    .filter(canUsePlaceholderForRawEntry)
    .map((entry) => entry.id)
);
const ELIGIBLE_MOCK_TEMPLATE_ENTRY_KEYS = new Set(
  [...rawSeed.savedTemplates, ...legacyMockSeed.savedTemplates].flatMap((template) =>
    template.starterEntries
      .filter(canUsePlaceholderForRawEntry)
      .map(
        (entry) =>
          entry.detailPath ??
          entry.sourceRef?.externalId ??
          `${template.id}:${entry.type}:${entry.title}`
      )
  )
);

function getMockImageUrl(key: string, shouldUsePlaceholder: boolean): string | undefined {
  if (!shouldUsePlaceholder) {
    return undefined;
  }

  if (!shouldUsePlaceholderThumbnail(key)) {
    return undefined;
  }

  return buildPlaceholderThumbnailUrl(key);
}

export function resolveMockListImageUrl(listId: string, existingImageUrl?: string): string | undefined {
  const normalizedImageUrl = normalizeImageUrl(existingImageUrl);
  return normalizedImageUrl ?? getMockImageUrl(`list:${listId}`, ELIGIBLE_MOCK_LIST_IDS.has(listId));
}

export function resolveMockEntryImageUrl(
  entry: Pick<ListEntry, 'id' | 'imageUrl' | 'coverAssetUri' | 'detailPath' | 'sourceRef'>
): string | undefined {
  const normalizedImageUrl = normalizeImageUrl(entry.imageUrl);
  if (normalizedImageUrl) {
    return normalizedImageUrl;
  }

  if (normalizeImageUrl(entry.coverAssetUri) || canResolveJikanThumbnail(entry.sourceRef, entry.detailPath)) {
    return undefined;
  }

  return getMockImageUrl(`entry:${entry.id}`, ELIGIBLE_MOCK_ENTRY_IDS.has(entry.id));
}

export function resolveMockTemplateEntryImageUrl(
  templateId: string,
  entry: Pick<
    ListTemplate['starterEntries'][number],
    'detailPath' | 'type' | 'title' | 'sourceRef' | 'imageUrl'
  >
): string | undefined {
  const normalizedImageUrl = normalizeImageUrl(entry.imageUrl);
  if (normalizedImageUrl) {
    return normalizedImageUrl;
  }

  if (canResolveJikanThumbnail(entry.sourceRef, entry.detailPath)) {
    return undefined;
  }

  const entryKey =
    entry.detailPath ??
    entry.sourceRef?.externalId ??
    `${templateId}:${entry.type}:${entry.title}`;

  return getMockImageUrl(
    `template-entry:${entryKey}`,
    ELIGIBLE_MOCK_TEMPLATE_ENTRY_KEYS.has(entryKey)
  );
}

export function applyMockThumbnailsToList(list: TrackerList): TrackerList {
  return {
    ...list,
    imageUrl: resolveMockListImageUrl(list.id, list.imageUrl),
    entries: list.entries.map((entry) => ({
      ...entry,
      imageUrl: resolveMockEntryImageUrl(entry),
    })),
  };
}

export function applyMockThumbnailsToLists(lists: TrackerList[]): TrackerList[] {
  return lists.map(applyMockThumbnailsToList);
}

function normalizeTags(tags?: string[]): string[] {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function normalizeProgress(progress?: EntryProgress): EntryProgress | undefined {
  return progress
    ? {
        ...progress,
      }
    : undefined;
}

function normalizeEntry(entry: ListEntry): ListEntry {
  return {
    ...entry,
    imageUrl: resolveMockEntryImageUrl(entry),
    tags: normalizeTags(entry.tags),
    customFields: entry.customFields?.map((field) => ({ ...field })),
    progress: normalizeProgress(entry.progress),
    sourceRef: { ...entry.sourceRef },
  };
}

function normalizeList(list: TrackerList): TrackerList {
  const nextConfig = createListConfig(list.config);

  return {
    ...list,
    imageUrl: resolveMockListImageUrl(list.id, list.imageUrl),
    tags: normalizeTags(list.tags),
    config: nextConfig,
    preferences: sanitizeListPreferencesForConfig(
      list.preferences ?? DEFAULT_LIST_PREFERENCES,
      nextConfig
    ),
    showInMyLists: list.showInMyLists ?? !list.parentListId,
    childListIds: list.childListIds ?? [],
    entries: list.entries.map(normalizeEntry),
  };
}

function normalizeTemplate(template: ListTemplate): ListTemplate {
  const nextConfig = createListConfig(template.config);

  return {
    ...template,
    config: nextConfig,
    starterEntries: template.starterEntries.map((entry) => {
      return {
        ...entry,
        imageUrl: resolveMockTemplateEntryImageUrl(template.id, entry),
        tags: entry.tags ? normalizeTags(entry.tags) : undefined,
        customFields: entry.customFields?.map((field) => ({ ...field })),
        progress: normalizeProgress(entry.progress),
        sourceRef: entry.sourceRef ? { ...entry.sourceRef } : undefined,
      };
    }),
  };
}

function normalizeItemUserData(item: ItemUserData): ItemUserData {
  return {
    ...item,
    tags: normalizeTags(item.tags),
    customFields: item.customFields.map((field) => ({ ...field })),
    progress: normalizeProgress(item.progress),
  };
}

export function createPowerUserMockSeedFromJson(): MockListsSeed {
  return {
    lists: hydrateListHierarchy(rawSeed.lists.map(normalizeList)),
    deletedLists: hydrateListHierarchy(rawSeed.deletedLists.map(normalizeList)),
    savedTemplates: rawSeed.savedTemplates.map(normalizeTemplate),
    itemUserDataByKey: Object.fromEntries(
      Object.entries(rawSeed.itemUserDataByKey).map(([itemKey, item]) => [
        itemKey,
        normalizeItemUserData(item),
      ])
    ),
    recentSearches: [...rawSeed.recentSearches],
    recentListIds: [...rawSeed.recentListIds],
  };
}
