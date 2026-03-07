import type {
  EntryStatus,
  ListEntry,
  ListFilterMode,
  ListPreferences,
  TrackerList,
} from '@/data/mock-lists';

export interface EntryWithList {
  entry: ListEntry;
  list: TrackerList;
}

const ACTIVE_STATUSES: EntryStatus[] = ['active', 'paused'];

function compareByStatus(a: ListEntry, b: ListEntry): number {
  const order: EntryStatus[] = ['active', 'planned', 'paused', 'completed', 'dropped'];
  return order.indexOf(a.status) - order.indexOf(b.status);
}

function compareByUpdatedAtDesc(a: ListEntry, b: ListEntry): number {
  return b.updatedAt - a.updatedAt;
}

function compareByRatingDesc(a: ListEntry, b: ListEntry): number {
  return (b.rating ?? -1) - (a.rating ?? -1) || compareByUpdatedAtDesc(a, b);
}

function compareByTitleAsc(a: ListEntry, b: ListEntry): number {
  return a.title.localeCompare(b.title);
}

export function filterEntryByMode(entry: ListEntry, filterMode: ListFilterMode): boolean {
  if (filterMode === 'all') {
    return !entry.archivedAt;
  }

  if (filterMode === 'archived') {
    return !!entry.archivedAt;
  }

  return !entry.archivedAt && entry.status === filterMode;
}

export function sortEntries(entries: ListEntry[], preferences: ListPreferences): ListEntry[] {
  const visibleEntries = entries.filter((entry) =>
    filterEntryByMode(entry, preferences.filterMode)
  );
  const completedFiltered = preferences.showCompleted
    ? visibleEntries
    : visibleEntries.filter((entry) => entry.status !== 'completed');

  const nextEntries = [...completedFiltered];

  switch (preferences.sortMode) {
    case 'title-asc':
      return nextEntries.sort(compareByTitleAsc);
    case 'rating-desc':
      return nextEntries.sort(compareByRatingDesc);
    case 'status':
      return nextEntries.sort(compareByStatus);
    case 'updated-desc':
    default:
      return nextEntries.sort(compareByUpdatedAtDesc);
  }
}

export function flattenEntries(lists: TrackerList[]): EntryWithList[] {
  return lists.flatMap((list) =>
    list.entries.map((entry) => ({
      entry,
      list,
    }))
  );
}

export function getContinueTrackingEntries(lists: TrackerList[], limit = 6): EntryWithList[] {
  return flattenEntries(lists)
    .filter(({ entry }) => ACTIVE_STATUSES.includes(entry.status) && !entry.archivedAt)
    .sort((a, b) => b.entry.updatedAt - a.entry.updatedAt)
    .slice(0, limit);
}

export function getRecentlyUpdatedEntries(lists: TrackerList[], limit = 8): EntryWithList[] {
  return flattenEntries(lists)
    .filter(({ entry }) => !entry.archivedAt)
    .sort((a, b) => b.entry.updatedAt - a.entry.updatedAt)
    .slice(0, limit);
}

export function getUpcomingReminderEntries(lists: TrackerList[], limit = 8): EntryWithList[] {
  const now = Date.now();
  return flattenEntries(lists)
    .filter(
      ({ entry }) =>
        !entry.archivedAt &&
        typeof entry.reminderAt === 'number' &&
        entry.reminderAt > now
    )
    .sort((a, b) => (a.entry.reminderAt ?? 0) - (b.entry.reminderAt ?? 0))
    .slice(0, limit);
}

export function getAddAgainEntries(lists: TrackerList[], limit = 6): EntryWithList[] {
  const seenTitles = new Set<string>();

  return getRecentlyUpdatedEntries(lists, 24).filter(({ entry }) => {
    const normalizedTitle = entry.title.trim().toLowerCase();
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) {
      return false;
    }
    seenTitles.add(normalizedTitle);
    return true;
  }).slice(0, limit);
}

export function getListStats(list: TrackerList) {
  const total = list.entries.filter((entry) => !entry.archivedAt).length;
  const completed = list.entries.filter(
    (entry) => !entry.archivedAt && entry.status === 'completed'
  ).length;
  const active = list.entries.filter(
    (entry) => !entry.archivedAt && ACTIVE_STATUSES.includes(entry.status)
  ).length;
  const planned = list.entries.filter(
    (entry) => !entry.archivedAt && entry.status === 'planned'
  ).length;

  return {
    total,
    completed,
    active,
    planned,
  };
}

export function getRecentLists(lists: TrackerList[], recentListIds: string[]): TrackerList[] {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const orderedRecent = recentListIds
    .map((id) => byId.get(id))
    .filter((list): list is TrackerList => !!list);
  const includedIds = new Set(orderedRecent.map((list) => list.id));

  const fallbackLists = [...lists]
    .filter((list) => !includedIds.has(list.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return [...orderedRecent, ...fallbackLists];
}

export function getPinnedLists(lists: TrackerList[]): TrackerList[] {
  return [...lists]
    .filter((list) => list.pinned && !list.archivedAt && !list.deletedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getArchivedLists(lists: TrackerList[]): TrackerList[] {
  return [...lists]
    .filter((list) => !!list.archivedAt && !list.deletedAt)
    .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
}

export function findEntryLocation(lists: TrackerList[], entryId: string): EntryWithList | null {
  for (const list of lists) {
    const entry = list.entries.find((item) => item.id === entryId);
    if (entry) {
      return { entry, list };
    }
  }

  return null;
}

export function formatProgressLabel(entry: ListEntry): string | null {
  if (!entry.progress) {
    return null;
  }

  const { current, total, unit } = entry.progress;
  const unitLabel =
    unit === 'episode'
      ? 'ep'
      : unit === 'chapter'
      ? 'ch'
      : unit === 'volume'
      ? 'vol'
      : unit === 'percent'
      ? '%'
      : 'item';

  if (unit === 'percent') {
    return `${current}%`;
  }

  return total ? `${current}/${total} ${unitLabel}` : `${current} ${unitLabel}`;
}
