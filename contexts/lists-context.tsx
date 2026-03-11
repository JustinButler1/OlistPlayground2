'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  BUILT_IN_LIST_TEMPLATES,
  applyAutomationBlocks,
  cloneEntry,
  createEmptyItemUserData,
  createListConfig,
  createListFromTemplate,
  DEFAULT_LIST_PREFERENCES,
  derivePresetFromConfig,
  type EntryProgress,
  type EntrySourceRef,
  type EntryStatus,
  type ItemUserData,
  type ListConfig,
  type ListEntry,
  type ListPreset,
  type ListPreferences,
  type ListTemplate,
  type ListViewMode,
  type TrackerList,
  sanitizeListPreferencesForConfig,
} from '@/data/mock-lists';
import {
  clearListsState,
  cloneListsState,
  createInitialListsState,
  createPowerUserMockListsState,
  loadListsState,
  parseImportedListsState,
  saveListsState,
  serializeListsState,
  type ListsState,
} from '@/lib/lists-storage';
import { reconcileReminderNotifications } from '@/lib/reminders';
import {
  getAddAgainEntries,
  getArchivedLists,
  getContinueTrackingEntries,
  getPinnedLists,
  getRecentLists,
  getRecentlyUpdatedEntries,
  getUpcomingReminderEntries,
} from '@/lib/tracker-selectors';
import {
  normalizeProgress,
  normalizeRating,
} from '@/lib/tracker-metadata';

export interface EntryDraft
  extends Partial<
    Omit<ListEntry, 'id' | 'addedAt' | 'updatedAt' | 'checked' | 'status' | 'tags' | 'sourceRef'>
  > {
  title: string;
  type: ListEntry['type'];
  checked?: boolean;
  status?: EntryStatus;
  tags?: string[];
  sourceRef?: EntrySourceRef;
}

interface ListsQueryValue {
  lists: TrackerList[];
  activeLists: TrackerList[];
  deletedLists: TrackerList[];
  pinnedLists: TrackerList[];
  recentLists: TrackerList[];
  archivedLists: TrackerList[];
  listTemplates: ListTemplate[];
  itemUserDataByKey: Record<string, ItemUserData>;
  recentSearches: string[];
  recentListIds: string[];
  continueTracking: Array<{ entry: ListEntry; list: TrackerList }>;
  recentlyUpdated: Array<{ entry: ListEntry; list: TrackerList }>;
  upcomingReminders: Array<{ entry: ListEntry; list: TrackerList }>;
  addAgain: Array<{ entry: ListEntry; list: TrackerList }>;
  isHydrated: boolean;
}

interface ListActionsValue {
  createList: (
    title: string,
    presetOrOptions?:
      | ListPreset
      | {
          config?: Partial<ListConfig>;
          description?: string;
          pinned?: boolean;
          preset?: ListPreset;
          templateId?: string;
          tags?: string[];
          parentListId?: string;
        },
    options?: Partial<
      Pick<TrackerList, 'description' | 'pinned' | 'templateId' | 'tags' | 'parentListId'>
    >
  ) => string | null;
  createListFromTemplate: (
    templateId: string,
    overrides?: Partial<
      Pick<TrackerList, 'title' | 'description' | 'pinned' | 'tags' | 'parentListId'>
    >
  ) => string | null;
  updateList: (
    listId: string,
    updates: Partial<
      Pick<
        TrackerList,
        'title' | 'description' | 'pinned' | 'config' | 'templateId' | 'tags' | 'parentListId'
      >
    >
  ) => void;
  saveListAsTemplate: (
    listId: string,
    template: Pick<ListTemplate, 'title' | 'description'>
  ) => string | null;
  deleteTemplate: (templateId: string) => void;
  archiveList: (listId: string) => void;
  restoreArchivedList: (listId: string) => void;
  deleteList: (listId: string) => void;
  restoreList: (listId: string) => void;
  setListPreferences: (listId: string, updates: Partial<ListPreferences>) => void;
  markListOpened: (listId: string) => void;
  recordRecentSearch: (query: string) => void;
  convertTagToSublist: (listId: string, tag: string) => string | null;
  convertSublistToTag: (sublistId: string) => string | null;
  exportLists: () => string;
  importLists: (raw: string) => void;
  loadMockData: () => void;
  resetAllLists: () => void;
}

interface EntryActionsValue {
  addEntryToList: (listId: string, draft: EntryDraft) => string | null;
  updateEntry: (listId: string, entryId: string, updates: Partial<ListEntry>) => void;
  deleteEntryFromList: (listId: string, entryId: string) => void;
  moveEntry: (sourceListId: string, targetListId: string, entryIds: string[]) => void;
  reorderEntries: (listId: string, orderedEntryIds: string[]) => void;
  setEntryProgress: (listId: string, entryId: string, progress?: EntryProgress) => void;
  setEntryChecked: (listId: string, entryId: string, checked: boolean) => void;
  setEntryStatus: (listId: string, entryId: string, status: EntryStatus) => void;
  duplicateEntries: (listId: string, entryIds: string[]) => void;
  archiveEntries: (listId: string, entryIds: string[]) => void;
}

interface ItemUserDataActionsValue {
  setItemUserData: (itemKey: string, value: ItemUserData) => void;
}

interface ListsContextValue {
  query: ListsQueryValue;
  listActions: ListActionsValue;
  entryActions: EntryActionsValue;
  itemUserDataActions: ItemUserDataActionsValue;
}

const ListsContext = createContext<ListsContextValue | null>(null);

function createListId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEntryId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function touchRecentListIds(currentIds: string[], listId: string): string[] {
  return [listId, ...currentIds.filter((id) => id !== listId)].slice(0, 10);
}

function parseItemKey(itemKey: string): { source: string; externalId: string } | null {
  const separatorIndex = itemKey.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === itemKey.length - 1) {
    return null;
  }

  return {
    source: itemKey.slice(0, separatorIndex),
    externalId: itemKey.slice(separatorIndex + 1),
  };
}

function createEntryFromDraft(draft: EntryDraft, config?: ListConfig): ListEntry {
  const timestamp = Date.now();
  const canonicalUrl =
    draft.sourceRef?.canonicalUrl ??
    draft.productUrl ??
    (draft.type === 'link' ? draft.productUrl : undefined);
  const hasToggle = config?.addons.includes('toggle') ?? false;
  const hasStatus = config?.addons.includes('status') ?? false;

  return {
    id: createEntryId(),
    title: draft.title.trim(),
    type: draft.type,
    imageUrl: draft.imageUrl,
    detailPath: draft.detailPath,
    notes: draft.notes,
    customFields: draft.customFields,
    displayVariant: draft.displayVariant,
    totalEpisodes: draft.totalEpisodes,
    totalChapters: draft.totalChapters,
    totalVolumes: draft.totalVolumes,
    linkedEntryId: draft.linkedEntryId,
    linkedListId: draft.linkedListId,
    checked: hasToggle ? draft.checked ?? false : draft.checked,
    status: hasStatus ? draft.status ?? 'planned' : draft.status,
    rating: normalizeRating(draft.rating),
    tags: draft.tags ?? [],
    progress: normalizeProgress(
      draft.progress
        ? {
            ...draft.progress,
            updatedAt: draft.progress.updatedAt ?? timestamp,
          }
        : undefined
    ),
    sourceRef:
      draft.sourceRef ??
      ({
        source:
          draft.type === 'game' || draft.type === 'list' ? 'custom' : draft.type,
        externalId: draft.detailPath?.split('/').pop(),
        detailPath: draft.detailPath,
        canonicalUrl,
      } satisfies EntrySourceRef),
    addedAt: timestamp,
    updatedAt: timestamp,
    reminderAt: draft.reminderAt,
    coverAssetUri: draft.coverAssetUri,
    productUrl: draft.productUrl,
    price: draft.price,
    archivedAt: draft.archivedAt,
  };
}

function updateListEntries(
  list: TrackerList,
  updater: (entries: ListEntry[]) => ListEntry[]
): TrackerList {
  const nextEntries = updater(list.entries);
  if (nextEntries === list.entries) {
    return list;
  }

  return {
    ...list,
    entries: nextEntries,
    updatedAt: Date.now(),
  };
}

function hasOwn<T extends object>(value: T, key: keyof any): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function addTag(tags: string[], tag: string): string[] {
  return normalizeTags([...tags, tag]);
}

function removeTag(tags: string[], tag: string): string[] {
  return normalizeTags(tags.filter((value) => value !== tag));
}

function createLinkedListEntry(title: string, linkedListId: string, tags: string[] = []): ListEntry {
  return createEntryFromDraft({
    title,
    type: 'list',
    detailPath: `list/${linkedListId}`,
    linkedListId,
    tags,
    sourceRef: {
      source: 'custom',
      detailPath: `list/${linkedListId}`,
    },
  });
}

function normalizeItemUserDataDraft(value: ItemUserData): ItemUserData {
  return {
    tags: value.tags
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: value.notes?.trim() || undefined,
    rating: normalizeRating(value.rating),
    progress: normalizeProgress(value.progress),
    customFields: value.customFields
      .map((field) => ({
        title: field.title.trim(),
        value: field.value.trim(),
        format: field.format === 'numbers' ? ('numbers' as const) : ('text' as const),
      }))
      .filter((field) => field.title || field.value),
    updatedAt: Date.now(),
  };
}

function isEmptyItemUserData(value: ItemUserData): boolean {
  return (
    value.tags.length === 0 &&
    !value.notes &&
    value.rating === undefined &&
    value.progress === undefined &&
    value.customFields.length === 0
  );
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ListsState>(createInitialListsState);
  const [isHydrated, setIsHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await loadListsState();
        if (stored && isMounted) {
          setState(stored);
        }
      } catch (error) {
        console.warn('ListsProvider: failed to hydrate lists state', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void saveListsState(state);
  }, [isHydrated, state]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let cancelled = false;

    (async () => {
      const reminderNotificationIds = await reconcileReminderNotifications(stateRef.current);
      if (cancelled) {
        return;
      }

      setState((prev) => {
        const prevKeys = Object.keys(prev.reminderNotificationIds);
        const nextKeys = Object.keys(reminderNotificationIds);
        const sameShape =
          prevKeys.length === nextKeys.length &&
          prevKeys.every((key) => prev.reminderNotificationIds[key] === reminderNotificationIds[key]);

        if (sameShape) {
          return prev;
        }

        return {
          ...prev,
          reminderNotificationIds,
        };
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, state.lists]);

  const runStateUpdate = useCallback((updater: (current: ListsState) => ListsState) => {
    setState((current) => updater(cloneListsState(current)));
  }, []);

  const createListAction = useCallback<ListActionsValue['createList']>(
    (title, presetOrOptions = 'tracking', options) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return null;
      }

      const legacyPreset =
        typeof presetOrOptions === 'string' ? presetOrOptions : presetOrOptions.preset;
      const config = createListConfig(
        typeof presetOrOptions === 'string'
          ? legacyPreset === 'tracking'
            ? {
                addons: ['status', 'progress', 'rating', 'tags', 'notes', 'reminders', 'cover'],
                automationBlocks: [],
                defaultEntryType: 'custom',
              }
            : undefined
          : presetOrOptions.config
      );
      const normalizedOptions =
        typeof presetOrOptions === 'string'
          ? options
          : {
              description: presetOrOptions.description,
              pinned: presetOrOptions.pinned,
              templateId: presetOrOptions.templateId,
              tags: presetOrOptions.tags,
              parentListId: presetOrOptions.parentListId,
            };
      const listId = createListId();

      runStateUpdate((current) => {
        const timestamp = Date.now();
        current.lists.unshift({
          id: listId,
          title: trimmedTitle,
          description: normalizedOptions?.description,
          tags: normalizeTags(normalizedOptions?.tags),
          preset: legacyPreset ?? derivePresetFromConfig(config),
          config,
          entries: [],
          preferences: sanitizeListPreferencesForConfig(DEFAULT_LIST_PREFERENCES, config),
          pinned: normalizedOptions?.pinned ?? false,
          createdAt: timestamp,
          updatedAt: timestamp,
          templateId: normalizedOptions?.templateId,
          parentListId: normalizedOptions?.parentListId,
        });
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });

      return listId;
    },
    [runStateUpdate]
  );

  const createListFromTemplateAction = useCallback<ListActionsValue['createListFromTemplate']>(
    (templateId, overrides) => {
      const template = [...BUILT_IN_LIST_TEMPLATES, ...stateRef.current.savedTemplates].find(
        (item) => item.id === templateId
      );
      if (!template) {
        return null;
      }

      const list = createListFromTemplate(template);
      const normalizedTitle = overrides?.title?.trim();
      const normalizedDescription = overrides?.description?.trim();
      const normalizedTags = normalizeTags(overrides?.tags);

      runStateUpdate((current) => {
        current.lists.unshift(list);
        current.lists = current.lists.map((item) =>
          item.id === list.id
            ? {
                ...item,
                title: normalizedTitle || item.title,
                description: normalizedDescription || item.description,
                pinned: overrides?.pinned ?? item.pinned,
                tags: normalizedTags.length ? normalizedTags : item.tags,
                parentListId: overrides?.parentListId ?? item.parentListId,
                updatedAt: Date.now(),
              }
            : item
        );
        current.recentListIds = touchRecentListIds(current.recentListIds, list.id);
        return current;
      });
      return list.id;
    },
    [runStateUpdate]
  );

  const updateList = useCallback<ListActionsValue['updateList']>(
    (listId, updates) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? {
                ...list,
                ...updates,
                ...(hasOwn(updates, 'tags') ? { tags: normalizeTags(updates.tags) } : {}),
                ...(updates.config
                  ? {
                      config: createListConfig(updates.config),
                      preset: derivePresetFromConfig(createListConfig(updates.config)),
                      preferences: sanitizeListPreferencesForConfig(
                        list.preferences,
                        createListConfig(updates.config)
                      ),
                    }
                  : {}),
                updatedAt: Date.now(),
              }
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const saveListAsTemplate = useCallback<ListActionsValue['saveListAsTemplate']>(
    (listId, template) => {
      const sourceList = stateRef.current.lists.find((item) => item.id === listId);
      if (!sourceList) {
        return null;
      }

      const templateId = createTemplateId();
      runStateUpdate((current) => {
        const currentList = current.lists.find((item) => item.id === listId);
        if (!currentList) {
          return current;
        }

        current.savedTemplates.unshift({
          id: templateId,
          title: template.title.trim(),
          description: template.description.trim(),
          source: 'user',
          preset: currentList.preset,
          config: createListConfig(currentList.config),
          starterEntries: [],
        });
        return current;
      });

      return templateId;
    },
    [runStateUpdate]
  );

  const deleteTemplate = useCallback<ListActionsValue['deleteTemplate']>(
    (templateId) => {
      runStateUpdate((current) => {
        current.savedTemplates = current.savedTemplates.filter((template) => template.id !== templateId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const archiveList = useCallback<ListActionsValue['archiveList']>(
    (listId) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? {
                ...list,
                archivedAt: Date.now(),
                updatedAt: Date.now(),
              }
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const restoreArchivedList = useCallback<ListActionsValue['restoreArchivedList']>(
    (listId) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? {
                ...list,
                archivedAt: undefined,
                updatedAt: Date.now(),
              }
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const deleteList = useCallback<ListActionsValue['deleteList']>(
    (listId) => {
      runStateUpdate((current) => {
        const nextLists: TrackerList[] = [];
        current.lists.forEach((list) => {
          if (list.id === listId) {
            current.deletedLists.unshift({
              ...list,
              deletedAt: Date.now(),
            });
          } else {
            nextLists.push(list);
          }
        });
        current.lists = nextLists;
        current.recentListIds = current.recentListIds.filter((id) => id !== listId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const restoreList = useCallback<ListActionsValue['restoreList']>(
    (listId) => {
      runStateUpdate((current) => {
        const nextDeletedLists: TrackerList[] = [];
        current.deletedLists.forEach((list) => {
          if (list.id === listId) {
            current.lists.unshift({
              ...list,
              deletedAt: undefined,
              updatedAt: Date.now(),
            });
          } else {
            nextDeletedLists.push(list);
          }
        });
        current.deletedLists = nextDeletedLists;
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const setListPreferences = useCallback<ListActionsValue['setListPreferences']>(
    (listId, updates) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? {
                ...list,
                preferences: sanitizeListPreferencesForConfig(
                  {
                    ...list.preferences,
                    ...updates,
                  },
                  list.config
                ),
                updatedAt: Date.now(),
              }
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const markListOpened = useCallback<ListActionsValue['markListOpened']>(
    (listId) => {
      runStateUpdate((current) => {
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const recordRecentSearch = useCallback<ListActionsValue['recordRecentSearch']>(
    (query) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return;
      }

      runStateUpdate((current) => {
        current.recentSearches = [
          trimmedQuery,
          ...current.recentSearches.filter((value) => value !== trimmedQuery),
        ].slice(0, 8);
        return current;
      });
    },
    [runStateUpdate]
  );

  const convertTagToSublist = useCallback<ListActionsValue['convertTagToSublist']>(
    (listId, tag) => {
      const normalizedTag = tag.trim();
      if (!normalizedTag) {
        return null;
      }

      const sourceList = stateRef.current.lists.find((item) => item.id === listId);
      if (!sourceList) {
        return null;
      }

      const matchingEntries = sourceList.entries.filter((entry) => entry.tags.includes(normalizedTag));
      if (!matchingEntries.length) {
        return null;
      }

      const sublistId = createListId();
      const sublistEntry = createLinkedListEntry(normalizedTag, sublistId, [normalizedTag]);

      runStateUpdate((current) => {
        const parentList = current.lists.find((item) => item.id === listId);
        if (!parentList) {
          return current;
        }

        const timestamp = Date.now();
        const matchingEntryIds = new Set(
          parentList.entries
            .filter((entry) => entry.tags.includes(normalizedTag))
            .map((entry) => entry.id)
        );

        if (!matchingEntryIds.size) {
          return current;
        }

        const movedEntries = parentList.entries
          .filter((entry) => matchingEntryIds.has(entry.id))
          .map((entry) => ({
            ...cloneEntry(entry),
            tags: removeTag(entry.tags, normalizedTag),
            updatedAt: timestamp,
          }));
        const movedChildListIds = new Set(
          movedEntries
            .map((entry) => entry.linkedListId)
            .filter((linkedListId): linkedListId is string => !!linkedListId)
        );
        const insertIndex = parentList.entries.findIndex((entry) => matchingEntryIds.has(entry.id));
        const nextSublist: TrackerList = {
          id: sublistId,
          title: normalizedTag,
          description: undefined,
          tags: [normalizedTag],
          preset: derivePresetFromConfig(parentList.config),
          config: createListConfig(parentList.config),
          entries: movedEntries,
          preferences: DEFAULT_LIST_PREFERENCES,
          pinned: false,
          createdAt: timestamp,
          updatedAt: timestamp,
          templateId: undefined,
          parentListId: listId,
        };

        current.lists = current.lists.map((list) => {
          if (list.id === listId) {
            return updateListEntries(list, (entries) => {
              const remainingEntries = entries.filter((entry) => !matchingEntryIds.has(entry.id));
              const nextEntries = [...remainingEntries];
              nextEntries.splice(insertIndex >= 0 ? insertIndex : 0, 0, sublistEntry);
              return nextEntries;
            });
          }

          if (movedChildListIds.has(list.id)) {
            return {
              ...list,
              parentListId: sublistId,
              tags: addTag(list.tags, normalizedTag),
              updatedAt: timestamp,
            };
          }

          return list;
        });
        current.lists.unshift(nextSublist);
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });

      return sublistId;
    },
    [runStateUpdate]
  );

  const convertSublistToTag = useCallback<ListActionsValue['convertSublistToTag']>(
    (sublistId) => {
      const sourceList = stateRef.current.lists.find((item) => item.id === sublistId);
      const parentListId = sourceList?.parentListId;
      const normalizedTag = sourceList?.title.trim() ?? '';

      if (!sourceList || !parentListId || !normalizedTag) {
        return null;
      }

      runStateUpdate((current) => {
        const sublist = current.lists.find((item) => item.id === sublistId);
        if (!sublist?.parentListId) {
          return current;
        }

        const parentId = sublist.parentListId;
        const timestamp = Date.now();
        const movedEntries = sublist.entries.map((entry) => ({
          ...cloneEntry(entry),
          tags: addTag(entry.tags, normalizedTag),
          updatedAt: timestamp,
        }));
        const linkedChildListIds = new Set(
          movedEntries
            .map((entry) => entry.linkedListId)
            .filter((linkedListId): linkedListId is string => !!linkedListId)
        );

        current.lists = current.lists
          .filter((list) => list.id !== sublistId)
          .map((list) => {
            if (list.id === parentId) {
              return updateListEntries(list, (entries) => {
                const linkedEntryIndex = entries.findIndex(
                  (entry) => entry.linkedListId === sublistId || entry.detailPath === `list/${sublistId}`
                );
                const remainingEntries = entries.filter(
                  (entry) => !(entry.linkedListId === sublistId || entry.detailPath === `list/${sublistId}`)
                );
                const nextEntries = [...remainingEntries];
                nextEntries.splice(
                  linkedEntryIndex >= 0 ? linkedEntryIndex : remainingEntries.length,
                  0,
                  ...movedEntries
                );
                return nextEntries;
              });
            }

            if (linkedChildListIds.has(list.id)) {
              return {
                ...list,
                parentListId: parentId,
                tags: addTag(list.tags, normalizedTag),
                updatedAt: timestamp,
              };
            }

            return list;
          });
        current.recentListIds = touchRecentListIds(
          current.recentListIds.filter((id) => id !== sublistId),
          parentId
        );
        return current;
      });

      return normalizedTag;
    },
    [runStateUpdate]
  );

  const exportLists = useCallback<ListActionsValue['exportLists']>(() => {
    return serializeListsState(stateRef.current);
  }, []);

  const importLists = useCallback<ListActionsValue['importLists']>(
    (raw) => {
      const importedState = parseImportedListsState(raw);
      setState(importedState);
    },
    []
  );

  const loadMockData = useCallback<ListActionsValue['loadMockData']>(() => {
    setState(createPowerUserMockListsState());
  }, []);

  const resetAllLists = useCallback<ListActionsValue['resetAllLists']>(() => {
    const nextState = createInitialListsState();
    setState(nextState);
    void clearListsState();
  }, []);

  const addEntryToList = useCallback<EntryActionsValue['addEntryToList']>(
    (listId, draft) => {
      const trimmedTitle = draft.title.trim();
      const targetList = stateRef.current.lists.find((list) => list.id === listId);
      if (!trimmedTitle) {
        return null;
      }
      if (!targetList) {
        return null;
      }

      const entry = createEntryFromDraft({
        ...draft,
        title: trimmedTitle,
      }, targetList.config);

      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) => [...entries, entry])
            : list
        );
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });

      return entry.id;
    },
    [runStateUpdate]
  );

  const updateEntry = useCallback<EntryActionsValue['updateEntry']>(
    (listId, entryId, updates) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) =>
                entries.map((entry) =>
                  entry.id === entryId
                    ? {
                        ...entry,
                        ...(hasOwn(updates, 'title') ? { title: updates.title } : {}),
                        ...(hasOwn(updates, 'type') ? { type: updates.type } : {}),
                        ...(hasOwn(updates, 'imageUrl')
                          ? { imageUrl: updates.imageUrl }
                          : {}),
                        ...(hasOwn(updates, 'detailPath')
                          ? { detailPath: updates.detailPath }
                          : {}),
                        ...(hasOwn(updates, 'notes') ? { notes: updates.notes } : {}),
                        ...(hasOwn(updates, 'customFields')
                          ? { customFields: updates.customFields }
                          : {}),
                        ...(hasOwn(updates, 'checked') ? { checked: updates.checked } : {}),
                        ...(hasOwn(updates, 'status') ? { status: updates.status } : {}),
                        ...(hasOwn(updates, 'rating')
                          ? { rating: normalizeRating(updates.rating) }
                          : {}),
                        ...(hasOwn(updates, 'tags')
                          ? { tags: updates.tags ? [...updates.tags] : [] }
                          : {}),
                        ...(hasOwn(updates, 'progress')
                          ? {
                              progress: normalizeProgress(
                                updates.progress
                                  ? {
                                      ...updates.progress,
                                      updatedAt: updates.progress.updatedAt ?? Date.now(),
                                    }
                                  : undefined
                              ),
                            }
                          : {}),
                        ...(hasOwn(updates, 'sourceRef')
                          ? { sourceRef: { ...entry.sourceRef, ...updates.sourceRef } }
                          : {}),
                        ...(hasOwn(updates, 'reminderAt')
                          ? { reminderAt: updates.reminderAt }
                          : {}),
                        ...(hasOwn(updates, 'coverAssetUri')
                          ? { coverAssetUri: updates.coverAssetUri }
                          : {}),
                        ...(hasOwn(updates, 'productUrl')
                          ? { productUrl: updates.productUrl }
                          : {}),
                        ...(hasOwn(updates, 'price') ? { price: updates.price } : {}),
                        ...(hasOwn(updates, 'archivedAt')
                          ? { archivedAt: updates.archivedAt }
                          : {}),
                        updatedAt: Date.now(),
                      }
                    : entry
                )
              )
            : list
        );
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const deleteEntryFromList = useCallback<EntryActionsValue['deleteEntryFromList']>(
    (listId, entryId) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) =>
                entries.filter((entry) => entry.id !== entryId)
              )
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const moveEntry = useCallback<EntryActionsValue['moveEntry']>(
    (sourceListId, targetListId, entryIds) => {
      if (!entryIds.length || sourceListId === targetListId) {
        return;
      }

      runStateUpdate((current) => {
        let movingEntries: ListEntry[] = [];

        current.lists = current.lists.map((list) => {
          if (list.id === sourceListId) {
            return updateListEntries(list, (entries) => {
              movingEntries = entries
                .filter((entry) => entryIds.includes(entry.id))
                .map((entry) => ({
                  ...entry,
                  updatedAt: Date.now(),
                }));
              return entries.filter((entry) => !entryIds.includes(entry.id));
            });
          }

          return list;
        });

        if (!movingEntries.length) {
          return current;
        }

        current.lists = current.lists.map((list) =>
          list.id === targetListId
            ? updateListEntries(list, (entries) => [...movingEntries, ...entries])
            : list
        );
        current.recentListIds = touchRecentListIds(current.recentListIds, targetListId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const reorderEntries = useCallback<EntryActionsValue['reorderEntries']>(
    (listId, orderedEntryIds) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) => {
                const entryById = new Map(entries.map((entry) => [entry.id, entry]));
                const orderedEntries = orderedEntryIds
                  .map((entryId) => entryById.get(entryId))
                  .filter((entry): entry is ListEntry => !!entry);
                const remainingEntries = entries.filter(
                  (entry) => !orderedEntryIds.includes(entry.id)
                );
                return [...orderedEntries, ...remainingEntries];
              })
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const setEntryProgress = useCallback<EntryActionsValue['setEntryProgress']>(
    (listId, entryId, progress) => {
      if (progress) {
        const normalized = normalizeProgress({
          ...progress,
          updatedAt: progress.updatedAt ?? Date.now(),
        });
        if (!normalized) {
          return;
        }

        updateEntry(listId, entryId, {
          progress: normalized,
        });
        return;
      }

      updateEntry(listId, entryId, {
        progress: undefined,
      });
    },
    [updateEntry]
  );

  const setEntryChecked = useCallback<EntryActionsValue['setEntryChecked']>(
    (listId, entryId, checked) => {
      runStateUpdate((current) => {
        current.lists = current.lists.map((list) => {
          if (list.id !== listId || !list.config.addons.includes('toggle')) {
            return list;
          }

          return updateListEntries(list, (entries) =>
            entries.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    checked,
                    ...applyAutomationBlocks(list.config, {
                      addonId: 'toggle',
                      field: 'checked',
                      value: checked,
                    }),
                    updatedAt: Date.now(),
                  }
                : entry
            )
          );
        });
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const setEntryStatus = useCallback<EntryActionsValue['setEntryStatus']>(
    (listId, entryId, status) => {
      updateEntry(listId, entryId, { status });
    },
    [updateEntry]
  );

  const duplicateEntries = useCallback<EntryActionsValue['duplicateEntries']>(
    (listId, entryIds) => {
      if (!entryIds.length) {
        return;
      }

      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) => {
                const duplicates = entries
                  .filter((entry) => entryIds.includes(entry.id))
                  .map((entry) => ({
                    ...cloneEntry(entry),
                    id: createEntryId(),
                    title: `${entry.title} (Copy)`,
                    addedAt: Date.now(),
                    updatedAt: Date.now(),
                  }));
                return [...duplicates, ...entries];
              })
            : list
        );
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });
    },
    [runStateUpdate]
  );

  const archiveEntries = useCallback<EntryActionsValue['archiveEntries']>(
    (listId, entryIds) => {
      if (!entryIds.length) {
        return;
      }

      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) =>
                entries.map((entry) =>
                  entryIds.includes(entry.id)
                    ? {
                        ...entry,
                        archivedAt: Date.now(),
                        updatedAt: Date.now(),
                      }
                    : entry
                )
              )
            : list
        );
        return current;
      });
    },
    [runStateUpdate]
  );

  const setItemUserData = useCallback<ItemUserDataActionsValue['setItemUserData']>(
    (itemKey, value) => {
      const trimmedKey = itemKey.trim();
      if (!trimmedKey) {
        return;
      }

      runStateUpdate((current) => {
        const normalized = normalizeItemUserDataDraft(value);
        const parsedItemKey = parseItemKey(trimmedKey);

        if (parsedItemKey) {
          current.lists = current.lists.map((list) =>
            updateListEntries(list, (entries) =>
              {
                let didChange = false;
                const nextEntries = entries.map((entry) => {
                  if (
                    entry.sourceRef.source !== parsedItemKey.source ||
                    entry.sourceRef.externalId !== parsedItemKey.externalId
                  ) {
                    return entry;
                  }

                  const nextProgress =
                    normalized.progress !== undefined
                      ? normalizeProgress({
                          ...(entry.progress ?? {}),
                          ...normalized.progress,
                          total: normalized.progress.total ?? entry.progress?.total,
                          unit: normalized.progress.unit ?? entry.progress?.unit ?? 'item',
                          label: normalized.progress.label ?? entry.progress?.label,
                          updatedAt: normalized.progress.updatedAt ?? Date.now(),
                        })
                      : entry.progress
                      ? normalizeProgress({
                          ...entry.progress,
                          current: undefined,
                          updatedAt: Date.now(),
                        })
                      : undefined;

                  const progressChanged =
                    JSON.stringify(nextProgress ?? null) !== JSON.stringify(entry.progress ?? null);

                  if (!progressChanged) {
                    return entry;
                  }

                  didChange = true;
                  return {
                    ...entry,
                    progress: nextProgress,
                    updatedAt: Date.now(),
                  };
                });

                return didChange ? nextEntries : entries;
              }
            )
          );
        }

        if (isEmptyItemUserData(normalized)) {
          delete current.itemUserDataByKey[trimmedKey];
          return current;
        }

        current.itemUserDataByKey[trimmedKey] = normalized;
        return current;
      });
    },
    [runStateUpdate]
  );

  const query = useMemo<ListsQueryValue>(() => {
    const activeLists = state.lists.filter((list) => !list.deletedAt);

    return {
      lists: state.lists,
      activeLists,
      deletedLists: state.deletedLists,
      pinnedLists: getPinnedLists(activeLists),
      recentLists: getRecentLists(activeLists.filter((list) => !list.archivedAt), state.recentListIds),
      archivedLists: getArchivedLists(activeLists),
      listTemplates: [...BUILT_IN_LIST_TEMPLATES, ...state.savedTemplates],
      itemUserDataByKey: state.itemUserDataByKey,
      recentSearches: state.recentSearches,
      recentListIds: state.recentListIds,
      continueTracking: getContinueTrackingEntries(activeLists),
      recentlyUpdated: getRecentlyUpdatedEntries(activeLists),
      upcomingReminders: getUpcomingReminderEntries(activeLists),
      addAgain: getAddAgainEntries(activeLists),
      isHydrated,
    };
  }, [isHydrated, state]);

  const listActions = useMemo<ListActionsValue>(
    () => ({
      createList: createListAction,
      createListFromTemplate: createListFromTemplateAction,
      updateList,
      saveListAsTemplate,
      deleteTemplate,
      archiveList,
      restoreArchivedList,
      deleteList,
      restoreList,
      setListPreferences,
      markListOpened,
      recordRecentSearch,
      convertTagToSublist,
      convertSublistToTag,
      exportLists,
      importLists,
      loadMockData,
      resetAllLists,
    }),
    [
      archiveList,
      createListAction,
      createListFromTemplateAction,
      convertSublistToTag,
      convertTagToSublist,
      deleteTemplate,
      deleteList,
      exportLists,
      importLists,
      loadMockData,
      markListOpened,
      recordRecentSearch,
      resetAllLists,
      restoreArchivedList,
      restoreList,
      saveListAsTemplate,
      setListPreferences,
      updateList,
    ]
  );

  const entryActions = useMemo<EntryActionsValue>(
    () => ({
      addEntryToList,
      updateEntry,
      deleteEntryFromList,
      moveEntry,
      reorderEntries,
      setEntryProgress,
      setEntryChecked,
      setEntryStatus,
      duplicateEntries,
      archiveEntries,
    }),
    [
      addEntryToList,
      archiveEntries,
      deleteEntryFromList,
      duplicateEntries,
      moveEntry,
      reorderEntries,
      setEntryProgress,
      setEntryChecked,
      setEntryStatus,
      updateEntry,
    ]
  );

  const itemUserDataActions = useMemo<ItemUserDataActionsValue>(
    () => ({
      setItemUserData,
    }),
    [setItemUserData]
  );

  const value = useMemo<ListsContextValue>(
    () => ({
      query,
      listActions,
      entryActions,
      itemUserDataActions,
    }),
    [entryActions, itemUserDataActions, listActions, query]
  );

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

function useListsContext(): ListsContextValue {
  const context = useContext(ListsContext);
  if (!context) {
    throw new Error('Lists hooks must be used within ListsProvider');
  }
  return context;
}

export function useListsQuery(): ListsQueryValue {
  return useListsContext().query;
}

export function useListActions(): ListActionsValue {
  return useListsContext().listActions;
}

export function useEntryActions(): EntryActionsValue {
  return useListsContext().entryActions;
}

export function useItemUserDataActions(): ItemUserDataActionsValue {
  return useListsContext().itemUserDataActions;
}

export function useItemUserData(itemKey: string) {
  const { itemUserDataByKey } = useListsQuery();
  const { setItemUserData } = useItemUserDataActions();

  return {
    itemUserData: itemUserDataByKey[itemKey] ?? createEmptyItemUserData(),
    setItemUserData: (value: ItemUserData) => setItemUserData(itemKey, value),
  };
}

export function useListPreferences(listId: string) {
  const { activeLists } = useListsQuery();
  const { setListPreferences } = useListActions();
  const list = activeLists.find((item) => item.id === listId) ?? null;

  return {
    preferences: list?.preferences ?? DEFAULT_LIST_PREFERENCES,
    setListPreferences: (updates: Partial<ListPreferences>) =>
      setListPreferences(listId, updates),
  };
}

export function useLists() {
  const query = useListsQuery();
  const listActions = useListActions();
  const entryActions = useEntryActions();

  return {
    lists: query.activeLists,
    mainLists: query.activeLists.filter((list) => !list.archivedAt),
    addEntryToList: entryActions.addEntryToList,
    createList: listActions.createList,
    getListViewMode: (listId: string): ListViewMode =>
      query.activeLists.find((list) => list.id === listId)?.preferences.viewMode ??
      DEFAULT_LIST_PREFERENCES.viewMode,
    setListViewMode: (listId: string, viewMode: ListViewMode) =>
      listActions.setListPreferences(listId, { viewMode }),
    getCheckedByListId: (listId: string): Record<string, boolean> =>
      Object.fromEntries(
        (query.activeLists.find((list) => list.id === listId)?.entries ?? [])
          .filter((entry) => !!entry.checked)
          .map((entry) => [entry.id, true])
      ),
    toggleEntryChecked: (listId: string, entryId: string) => {
      const entry = query.activeLists
        .find((list) => list.id === listId)
        ?.entries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }
      entryActions.setEntryChecked(listId, entryId, !entry.checked);
    },
    deleteList: listActions.deleteList,
    deleteEntryFromList: entryActions.deleteEntryFromList,
  };
}
