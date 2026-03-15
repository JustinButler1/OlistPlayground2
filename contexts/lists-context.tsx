'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  BUILT_IN_LIST_TEMPLATES,
  createEmptyItemUserData,
  createListConfig,
  DEFAULT_LIST_PREFERENCES,
  derivePresetFromConfig,
  hydrateListHierarchy,
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
} from '@/data/mock-lists';
import { useConvexWorkspaceBootstrap } from '@/lib/convex-bootstrap';
import { type UploadedStorageFile } from '@/lib/convex-upload';
import {
  parseImportedListsState,
  serializeListsState,
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
import { normalizeProgress } from '@/lib/tracker-metadata';

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
  uploadedCover?: UploadedStorageFile | null;
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
  isSyncing: boolean;
  lastSyncError: string | null;
  dataSource: 'convex';
}

interface ListActionsValue {
  createList: (
    title: string,
    presetOrOptions?:
      | ListPreset
      | {
          config?: Partial<ListConfig>;
          description?: string;
          imageUrl?: string;
          pinned?: boolean;
          preset?: ListPreset;
          templateId?: string;
          tags?: string[];
          showInMyLists?: boolean;
          parentListId?: string;
          uploadedImage?: UploadedStorageFile | null;
        },
    options?: Partial<
      Pick<
        TrackerList,
        | 'description'
        | 'imageUrl'
        | 'pinned'
        | 'templateId'
        | 'tags'
        | 'showInMyLists'
        | 'parentListId'
      > & { uploadedImage?: UploadedStorageFile | null }
    >
  ) => Promise<string | null>;
  createListFromTemplate: (
    templateId: string,
    overrides?: Partial<
      Pick<
        TrackerList,
        'title' | 'description' | 'imageUrl' | 'pinned' | 'tags' | 'showInMyLists' | 'parentListId'
      > & { uploadedImage?: UploadedStorageFile | null }
    >
  ) => Promise<string | null>;
  updateList: (
    listId: string,
    updates: Partial<
      Pick<
        TrackerList,
        | 'title'
        | 'description'
        | 'imageUrl'
        | 'pinned'
        | 'config'
        | 'templateId'
        | 'tags'
        | 'showInMyLists'
        | 'parentListId'
      >
    >
  ) => Promise<void>;
  saveListAsTemplate: (
    listId: string,
    template: Pick<ListTemplate, 'title' | 'description'>
  ) => Promise<string | null>;
  deleteTemplate: (templateId: string) => Promise<void>;
  archiveList: (listId: string) => Promise<void>;
  restoreArchivedList: (listId: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  restoreList: (listId: string) => Promise<void>;
  reorderLists: (orderedListIds: string[]) => Promise<void>;
  setListPreferences: (listId: string, updates: Partial<ListPreferences>) => Promise<void>;
  markListOpened: (listId: string) => Promise<void>;
  recordRecentSearch: (query: string) => Promise<void>;
  convertTagToSublist: (listId: string, tag: string) => Promise<string | null>;
  convertSublistToTag: (sublistId: string) => Promise<string | null>;
  exportLists: () => string;
  importLists: (raw: string) => Promise<void>;
  loadMockData: () => Promise<void>;
  resetAllLists: () => Promise<void>;
}

interface EntryActionsValue {
  addEntryToList: (listId: string, draft: EntryDraft) => Promise<string | null>;
  updateEntry: (listId: string, entryId: string, updates: Partial<ListEntry>) => Promise<void>;
  deleteEntryFromList: (listId: string, entryId: string) => Promise<void>;
  moveEntry: (sourceListId: string, targetListId: string, entryIds: string[]) => Promise<void>;
  reorderEntries: (listId: string, orderedEntryIds: string[]) => Promise<void>;
  setEntryProgress: (listId: string, entryId: string, progress?: EntryProgress) => Promise<void>;
  setEntryChecked: (listId: string, entryId: string, checked: boolean) => Promise<void>;
  setEntryStatus: (listId: string, entryId: string, status: EntryStatus) => Promise<void>;
  duplicateEntries: (listId: string, entryIds: string[]) => Promise<void>;
  archiveEntries: (listId: string, entryIds: string[]) => Promise<void>;
}

interface ItemUserDataActionsValue {
  setItemUserData: (itemKey: string, value: ItemUserData) => Promise<void>;
}

interface ListsContextValue {
  query: ListsQueryValue;
  listActions: ListActionsValue;
  entryActions: EntryActionsValue;
  itemUserDataActions: ItemUserDataActionsValue;
}

const ListsContext = createContext<ListsContextValue | null>(null);

function touchRecentListIds(currentIds: string[], listId: string): string[] {
  return [listId, ...currentIds.filter((id) => id !== listId)].slice(0, 10);
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const { snapshot, isBootstrapping, lastBootstrapError } = useConvexWorkspaceBootstrap();
  const createListMutation = useMutation(api.lists.createList);
  const createListFromTemplateMutation = useMutation(api.lists.createListFromTemplate);
  const updateListMutation = useMutation(api.lists.updateList);
  const saveListAsTemplateMutation = useMutation(api.templates.saveListAsTemplate);
  const deleteTemplateMutation = useMutation(api.templates.deleteTemplate);
  const archiveListMutation = useMutation(api.lists.archiveList);
  const restoreArchivedListMutation = useMutation(api.lists.restoreArchivedList);
  const deleteListMutation = useMutation(api.lists.deleteList);
  const restoreListMutation = useMutation(api.lists.restoreList);
  const reorderListsMutation = useMutation(api.lists.reorderLists);
  const setListPreferencesMutation = useMutation(api.lists.setListPreferences);
  const markListOpenedMutation = useMutation(api.lists.markListOpened);
  const recordRecentSearchMutation = useMutation(api.lists.recordRecentSearch);
  const convertTagToSublistMutation = useMutation(api.lists.convertTagToSublist);
  const convertSublistToTagMutation = useMutation(api.lists.convertSublistToTag);
  const resetWorkspaceMutation = useMutation(api.lists.resetWorkspace);
  const loadMockDataMutation = useMutation(api.lists.loadMockData);
  const addEntryMutation = useMutation(api.lists.addEntry);
  const updateEntryMutation = useMutation(api.lists.updateEntry);
  const deleteEntryMutation = useMutation(api.lists.deleteEntry);
  const moveEntriesMutation = useMutation(api.lists.moveEntries);
  const reorderEntriesMutation = useMutation(api.lists.reorderEntries);
  const setEntryCheckedMutation = useMutation(api.lists.setEntryChecked);
  const setEntryStatusMutation = useMutation(api.lists.setEntryStatus);
  const setEntryProgressMutation = useMutation(api.lists.setEntryProgress);
  const duplicateEntriesMutation = useMutation(api.lists.duplicateEntries);
  const archiveEntriesMutation = useMutation(api.lists.archiveEntries);
  const setItemUserDataMutation = useMutation(api.itemUserData.setItemUserData);
  const importLegacyMutation = useMutation(api.bootstrap.importLegacyLocalState);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [reminderNotificationIds, setReminderNotificationIds] = useState<Record<string, string>>({});
  const reminderNotificationIdsRef = useRef(reminderNotificationIds);

  useEffect(() => {
    reminderNotificationIdsRef.current = reminderNotificationIds;
  }, [reminderNotificationIds]);

  const state = snapshot?.listsState;
  const lists = useMemo(() => hydrateListHierarchy(state?.lists ?? []), [state?.lists]);
  const deletedLists = useMemo(
    () => hydrateListHierarchy(state?.deletedLists ?? []),
    [state?.deletedLists]
  );
  const activeLists = lists;

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextReminderIds = await reconcileReminderNotifications({
        version: 5,
        lists,
        deletedLists,
        savedTemplates: state?.savedTemplates ?? [],
        itemUserDataByKey: state?.itemUserDataByKey ?? {},
        recentSearches: state?.recentSearches ?? [],
        recentListIds: state?.recentListIds ?? [],
        reminderNotificationIds: reminderNotificationIdsRef.current,
      });

      if (!cancelled) {
        setReminderNotificationIds(nextReminderIds);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deletedLists, lists, snapshot, state?.itemUserDataByKey, state?.recentListIds, state?.recentSearches, state?.savedTemplates]);

  const runMutation = async <T,>(task: () => Promise<T>): Promise<T> => {
    setPendingMutations((current) => current + 1);
    setLastSyncError(null);
    try {
      return await task();
    } catch (error) {
      setLastSyncError(error instanceof Error ? error.message : 'Sync failed.');
      throw error;
    } finally {
      setPendingMutations((current) => current - 1);
    }
  };

  const query = useMemo<ListsQueryValue>(() => {
    const recentListIds = state?.recentListIds ?? [];

    return {
      lists,
      activeLists,
      deletedLists,
      pinnedLists: getPinnedLists(activeLists),
      recentLists: getRecentLists(activeLists.filter((list) => !list.archivedAt), recentListIds),
      archivedLists: getArchivedLists(activeLists),
      listTemplates: [...BUILT_IN_LIST_TEMPLATES, ...(state?.savedTemplates ?? [])],
      itemUserDataByKey: state?.itemUserDataByKey ?? {},
      recentSearches: state?.recentSearches ?? [],
      recentListIds,
      continueTracking: getContinueTrackingEntries(activeLists),
      recentlyUpdated: getRecentlyUpdatedEntries(activeLists),
      upcomingReminders: getUpcomingReminderEntries(activeLists),
      addAgain: getAddAgainEntries(activeLists),
      isHydrated: snapshot !== undefined,
      isSyncing: isBootstrapping || pendingMutations > 0,
      lastSyncError: lastSyncError ?? lastBootstrapError,
      dataSource: 'convex',
    };
  }, [activeLists, deletedLists, isBootstrapping, lastBootstrapError, lastSyncError, lists, pendingMutations, snapshot, state]);

  const listActions = useMemo<ListActionsValue>(
    () => ({
      createList: async (title, presetOrOptions = 'tracking', options) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          return null;
        }

        const normalizedOptions =
          typeof presetOrOptions === 'string'
            ? {
                ...options,
                preset: presetOrOptions,
              }
            : presetOrOptions;

        return await runMutation(() =>
          createListMutation({
            title: trimmedTitle,
            options: {
              config: normalizedOptions.config,
              description: normalizedOptions.description,
              imageUrl: normalizedOptions.imageUrl,
              pinned: normalizedOptions.pinned,
              preset: normalizedOptions.preset,
              templateId: normalizedOptions.templateId,
              tags: normalizedOptions.tags,
              showInMyLists: normalizedOptions.showInMyLists,
              parentListId: normalizedOptions.parentListId,
              uploadedImage: normalizedOptions.uploadedImage ?? undefined,
            },
          })
        );
      },
      createListFromTemplate: async (templateId, overrides) =>
        await runMutation(() =>
          createListFromTemplateMutation({
            templateId,
            overrides: {
              ...overrides,
              uploadedImage: overrides?.uploadedImage ?? undefined,
            },
          })
        ),
      updateList: async (listId, updates) => {
        await runMutation(() => updateListMutation({ listId, updates }));
      },
      saveListAsTemplate: async (listId, template) =>
        await runMutation(() =>
          saveListAsTemplateMutation({
            listId,
            title: template.title,
            description: template.description,
          })
        ),
      deleteTemplate: async (templateId) => {
        await runMutation(() => deleteTemplateMutation({ templateId }));
      },
      archiveList: async (listId) => {
        await runMutation(() => archiveListMutation({ listId }));
      },
      restoreArchivedList: async (listId) => {
        await runMutation(() => restoreArchivedListMutation({ listId }));
      },
      deleteList: async (listId) => {
        await runMutation(() => deleteListMutation({ listId }));
      },
      restoreList: async (listId) => {
        await runMutation(() => restoreListMutation({ listId }));
      },
      reorderLists: async (orderedListIds) => {
        if (!orderedListIds.length) {
          return;
        }
        await runMutation(() => reorderListsMutation({ orderedListIds }));
      },
      setListPreferences: async (listId, updates) => {
        await runMutation(() => setListPreferencesMutation({ listId, updates }));
      },
      markListOpened: async (listId) => {
        await runMutation(() => markListOpenedMutation({ listId }));
      },
      recordRecentSearch: async (queryText) => {
        if (!queryText.trim()) {
          return;
        }
        await runMutation(() => recordRecentSearchMutation({ query: queryText }));
      },
      convertTagToSublist: async (listId, tag) =>
        await runMutation(() => convertTagToSublistMutation({ listId, tag })),
      convertSublistToTag: async (sublistId) =>
        await runMutation(() => convertSublistToTagMutation({ sublistId })),
      exportLists: () =>
        serializeListsState({
          version: 5,
          lists,
          deletedLists,
          savedTemplates: state?.savedTemplates ?? [],
          itemUserDataByKey: state?.itemUserDataByKey ?? {},
          recentSearches: state?.recentSearches ?? [],
          recentListIds: state?.recentListIds ?? [],
          reminderNotificationIds: {},
        }),
      importLists: async (raw) => {
        const importedState = parseImportedListsState(raw);
        await runMutation(() =>
          importLegacyMutation({
            listsState: importedState,
          })
        );
      },
      loadMockData: async () => {
        await runMutation(() => loadMockDataMutation({}));
      },
      resetAllLists: async () => {
        await runMutation(() => resetWorkspaceMutation({}));
      },
    }),
    [
      activeLists,
      archiveListMutation,
      convertSublistToTagMutation,
      convertTagToSublistMutation,
      createListFromTemplateMutation,
      createListMutation,
      deleteListMutation,
      deleteTemplateMutation,
      deletedLists,
      importLegacyMutation,
      lists,
      loadMockDataMutation,
      markListOpenedMutation,
      recordRecentSearchMutation,
      reorderListsMutation,
      resetWorkspaceMutation,
      restoreArchivedListMutation,
      restoreListMutation,
      runMutation,
      saveListAsTemplateMutation,
      setListPreferencesMutation,
      state,
      updateListMutation,
    ]
  );

  const entryActions = useMemo<EntryActionsValue>(
    () => ({
      addEntryToList: async (listId, draft) =>
        await runMutation(() =>
          addEntryMutation({
            listId,
            draft: {
              ...draft,
              uploadedCover: draft.uploadedCover ?? undefined,
            },
          })
        ),
      updateEntry: async (_listId, entryId, updates) => {
        await runMutation(() =>
          updateEntryMutation({
            entryId,
            updates,
          })
        );
      },
      deleteEntryFromList: async (_listId, entryId) => {
        await runMutation(() => deleteEntryMutation({ entryId }));
      },
      moveEntry: async (sourceListId, targetListId, entryIds) => {
        await runMutation(() =>
          moveEntriesMutation({
            sourceListId,
            targetListId,
            entryIds,
          })
        );
      },
      reorderEntries: async (listId, orderedEntryIds) => {
        await runMutation(() => reorderEntriesMutation({ listId, orderedEntryIds }));
      },
      setEntryProgress: async (_listId, entryId, progress) => {
        await runMutation(() =>
          setEntryProgressMutation({
            entryId,
            progress:
              progress !== undefined
                ? normalizeProgress({
                    ...progress,
                    updatedAt: progress.updatedAt ?? Date.now(),
                  })
                : undefined,
          })
        );
      },
      setEntryChecked: async (_listId, entryId, checked) => {
        await runMutation(() => setEntryCheckedMutation({ entryId, checked }));
      },
      setEntryStatus: async (_listId, entryId, status) => {
        await runMutation(() => setEntryStatusMutation({ entryId, status }));
      },
      duplicateEntries: async (listId, entryIds) => {
        await runMutation(() => duplicateEntriesMutation({ listId, entryIds }));
      },
      archiveEntries: async (_listId, entryIds) => {
        await runMutation(() => archiveEntriesMutation({ entryIds }));
      },
    }),
    [
      addEntryMutation,
      archiveEntriesMutation,
      deleteEntryMutation,
      duplicateEntriesMutation,
      moveEntriesMutation,
      reorderEntriesMutation,
      runMutation,
      setEntryCheckedMutation,
      setEntryProgressMutation,
      setEntryStatusMutation,
      updateEntryMutation,
    ]
  );

  const itemUserDataActions = useMemo<ItemUserDataActionsValue>(
    () => ({
      setItemUserData: async (itemKey, value) => {
        await runMutation(() => setItemUserDataMutation({ itemKey, value }));
      },
    }),
    [runMutation, setItemUserDataMutation]
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
    toggleEntryChecked: async (listId: string, entryId: string) => {
      const entry = query.activeLists
        .find((list) => list.id === listId)
        ?.entries.find((item) => item.id === entryId);
      if (!entry) {
        return;
      }
      await entryActions.setEntryChecked(listId, entryId, !entry.checked);
    },
    deleteList: listActions.deleteList,
    deleteEntryFromList: entryActions.deleteEntryFromList,
  };
}
