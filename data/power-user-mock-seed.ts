import {
  createListConfig,
  DEFAULT_LIST_PREFERENCES,
  sanitizeListPreferencesForConfig,
  type EntryProgress,
  type ItemUserData,
  type ListEntry,
  type ListTemplate,
  type MockListsSeed,
  type TrackerList,
} from './mock-lists';

const rawSeed = require('./power-user-mock-seed.json') as MockListsSeed;

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
    tags: normalizeTags(list.tags),
    config: nextConfig,
    preferences: sanitizeListPreferencesForConfig(
      list.preferences ?? DEFAULT_LIST_PREFERENCES,
      nextConfig
    ),
    entries: list.entries.map(normalizeEntry),
  };
}

function normalizeTemplate(template: ListTemplate): ListTemplate {
  const nextConfig = createListConfig(template.config);

  return {
    ...template,
    config: nextConfig,
    starterEntries: template.starterEntries.map((entry) => ({
      ...entry,
      tags: entry.tags ? normalizeTags(entry.tags) : undefined,
      customFields: entry.customFields?.map((field) => ({ ...field })),
      progress: normalizeProgress(entry.progress),
      sourceRef: entry.sourceRef ? { ...entry.sourceRef } : undefined,
    })),
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
    lists: rawSeed.lists.map(normalizeList),
    deletedLists: rawSeed.deletedLists.map(normalizeList),
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
