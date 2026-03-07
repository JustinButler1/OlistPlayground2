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
  cloneEntry,
  createListFromTemplate,
  DEFAULT_LIST_PREFERENCES,
  LIST_TEMPLATES,
  type EntryProgress,
  type EntrySourceRef,
  type EntryStatus,
  type ListEntry,
  type ListPreset,
  type ListPreferences,
  type ListTemplate,
  type ListViewMode,
  type TrackerList,
} from '@/data/mock-lists';
import {
  clearListsState,
  cloneListsState,
  createInitialListsState,
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

export interface EntryDraft
  extends Partial<
    Omit<ListEntry, 'id' | 'addedAt' | 'updatedAt' | 'status' | 'tags' | 'sourceRef'>
  > {
  title: string;
  type: ListEntry['type'];
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
    preset?: ListPreset,
    options?: Partial<Pick<TrackerList, 'description' | 'pinned' | 'templateId'>>
  ) => string | null;
  createListFromTemplate: (templateId: string) => string | null;
  updateList: (
    listId: string,
    updates: Partial<Pick<TrackerList, 'title' | 'description' | 'pinned'>>
  ) => void;
  archiveList: (listId: string) => void;
  restoreArchivedList: (listId: string) => void;
  deleteList: (listId: string) => void;
  restoreList: (listId: string) => void;
  setListPreferences: (listId: string, updates: Partial<ListPreferences>) => void;
  markListOpened: (listId: string) => void;
  recordRecentSearch: (query: string) => void;
  exportLists: () => string;
  importLists: (raw: string) => void;
  resetAllLists: () => void;
}

interface EntryActionsValue {
  addEntryToList: (listId: string, draft: EntryDraft) => string | null;
  updateEntry: (listId: string, entryId: string, updates: Partial<ListEntry>) => void;
  deleteEntryFromList: (listId: string, entryId: string) => void;
  moveEntry: (sourceListId: string, targetListId: string, entryIds: string[]) => void;
  reorderEntries: (listId: string, orderedEntryIds: string[]) => void;
  setEntryProgress: (listId: string, entryId: string, progress?: EntryProgress) => void;
  setEntryStatus: (listId: string, entryId: string, status: EntryStatus) => void;
  duplicateEntries: (listId: string, entryIds: string[]) => void;
  archiveEntries: (listId: string, entryIds: string[]) => void;
}

interface ListsContextValue {
  query: ListsQueryValue;
  listActions: ListActionsValue;
  entryActions: EntryActionsValue;
}

const ListsContext = createContext<ListsContextValue | null>(null);

function createListId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEntryId(): string {
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function touchRecentListIds(currentIds: string[], listId: string): string[] {
  return [listId, ...currentIds.filter((id) => id !== listId)].slice(0, 10);
}

function createEntryFromDraft(draft: EntryDraft): ListEntry {
  const timestamp = Date.now();
  const canonicalUrl =
    draft.sourceRef?.canonicalUrl ??
    draft.productUrl ??
    (draft.type === 'link' ? draft.productUrl : undefined);

  return {
    id: createEntryId(),
    title: draft.title.trim(),
    type: draft.type,
    imageUrl: draft.imageUrl,
    detailPath: draft.detailPath,
    notes: draft.notes,
    customFields: draft.customFields,
    status: draft.status ?? 'planned',
    rating: draft.rating,
    tags: draft.tags ?? [],
    progress: draft.progress
      ? {
          ...draft.progress,
          updatedAt: draft.progress.updatedAt ?? timestamp,
        }
      : undefined,
    sourceRef:
      draft.sourceRef ??
      ({
        source: draft.type === 'game' ? 'custom' : draft.type,
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
    (title, preset = 'tracking', options) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return null;
      }

      const listId = createListId();

      runStateUpdate((current) => {
        const timestamp = Date.now();
        current.lists.unshift({
          id: listId,
          title: trimmedTitle,
          description: options?.description,
          preset,
          entries: [],
          preferences: DEFAULT_LIST_PREFERENCES,
          pinned: options?.pinned ?? false,
          createdAt: timestamp,
          updatedAt: timestamp,
          templateId: options?.templateId,
        });
        current.recentListIds = touchRecentListIds(current.recentListIds, listId);
        return current;
      });

      return listId;
    },
    [runStateUpdate]
  );

  const createListFromTemplateAction = useCallback<ListActionsValue['createListFromTemplate']>(
    (templateId) => {
      const template = LIST_TEMPLATES.find((item) => item.id === templateId);
      if (!template) {
        return null;
      }

      const list = createListFromTemplate(template);
      runStateUpdate((current) => {
        current.lists.unshift(list);
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
                updatedAt: Date.now(),
              }
            : list
        );
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
                preferences: {
                  ...list.preferences,
                  ...updates,
                },
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

  const resetAllLists = useCallback<ListActionsValue['resetAllLists']>(() => {
    const nextState = createInitialListsState();
    setState(nextState);
    void clearListsState();
  }, []);

  const addEntryToList = useCallback<EntryActionsValue['addEntryToList']>(
    (listId, draft) => {
      const trimmedTitle = draft.title.trim();
      if (!trimmedTitle) {
        return null;
      }

      const entry = createEntryFromDraft({
        ...draft,
        title: trimmedTitle,
      });

      runStateUpdate((current) => {
        current.lists = current.lists.map((list) =>
          list.id === listId
            ? updateListEntries(list, (entries) => [entry, ...entries])
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
                        ...(hasOwn(updates, 'status') ? { status: updates.status } : {}),
                        ...(hasOwn(updates, 'rating') ? { rating: updates.rating } : {}),
                        ...(hasOwn(updates, 'tags')
                          ? { tags: updates.tags ? [...updates.tags] : [] }
                          : {}),
                        ...(hasOwn(updates, 'progress')
                          ? {
                              progress: updates.progress
                                ? {
                                    ...updates.progress,
                                    updatedAt: updates.progress.updatedAt ?? Date.now(),
                                  }
                                : undefined,
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
        updateEntry(listId, entryId, {
          progress: {
            ...progress,
            updatedAt: progress.updatedAt ?? Date.now(),
          },
          status: progress.current > 0 ? 'active' : undefined,
        });
        return;
      }

      updateEntry(listId, entryId, {
        progress: undefined,
      });
    },
    [updateEntry]
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

  const query = useMemo<ListsQueryValue>(() => {
    const activeLists = state.lists.filter((list) => !list.deletedAt);

    return {
      lists: state.lists,
      activeLists,
      deletedLists: state.deletedLists,
      pinnedLists: getPinnedLists(activeLists),
      recentLists: getRecentLists(activeLists.filter((list) => !list.archivedAt), state.recentListIds),
      archivedLists: getArchivedLists(activeLists),
      listTemplates: LIST_TEMPLATES,
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
      archiveList,
      restoreArchivedList,
      deleteList,
      restoreList,
      setListPreferences,
      markListOpened,
      recordRecentSearch,
      exportLists,
      importLists,
      resetAllLists,
    }),
    [
      archiveList,
      createListAction,
      createListFromTemplateAction,
      deleteList,
      exportLists,
      importLists,
      markListOpened,
      recordRecentSearch,
      resetAllLists,
      restoreArchivedList,
      restoreList,
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
      setEntryStatus,
      updateEntry,
    ]
  );

  const value = useMemo<ListsContextValue>(
    () => ({
      query,
      listActions,
      entryActions,
    }),
    [entryActions, listActions, query]
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
          .filter((entry) => entry.status === 'completed')
          .map((entry) => [entry.id, true])
      ),
    toggleEntryChecked: (listId: string, entryId: string) => {
      const entry = query.activeLists
        .find((list) => list.id === listId)
        ?.entries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }
      entryActions.setEntryStatus(
        listId,
        entryId,
        entry.status === 'completed' ? 'planned' : 'completed'
      );
    },
    deleteList: listActions.deleteList,
    deleteEntryFromList: entryActions.deleteEntryFromList,
  };
}
