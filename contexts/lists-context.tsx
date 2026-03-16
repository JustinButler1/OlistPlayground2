'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import {
  applyAutomationBlocks,
  BUILT_IN_LIST_TEMPLATES,
  cloneEntry,
  createEmptyItemUserData,
  createListConfig,
  createListFromTemplate,
  DEFAULT_LIST_PREFERENCES,
  derivePresetFromConfig,
  hydrateListHierarchy,
  sanitizeListPreferencesForConfig,
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
import { applyMockThumbnailsToLists } from '@/data/power-user-mock-seed';
import { useTestAccounts } from '@/contexts/test-accounts-context';
import { useConvexWorkspaceBootstrap } from '@/lib/convex-bootstrap';
import { type UploadedStorageFile } from '@/lib/convex-upload';
import {
  cloneListsState,
  parseImportedListsState,
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
import { normalizeProgress, normalizeRating } from '@/lib/tracker-metadata';

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
  dataSource: 'convex' | 'mock';
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

function createClientId(prefix: 'entry' | 'list' | 'template'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function withHydratedMockListsState(state: ListsState): ListsState {
  return {
    ...state,
    lists: hydrateListHierarchy(state.lists.map((list) => ({ ...list }))),
    deletedLists: hydrateListHierarchy(state.deletedLists.map((list) => ({ ...list }))),
  };
}

function createMockEntryFromDraft(draft: EntryDraft, config?: ListConfig): ListEntry {
  const timestamp = Date.now();
  const canonicalUrl =
    draft.sourceRef?.canonicalUrl ??
    draft.productUrl ??
    (draft.type === 'link' ? draft.productUrl : undefined);
  const hasToggle = config?.addons.includes('toggle') ?? false;
  const hasStatus = config?.addons.includes('status') ?? false;

  return {
    id: createClientId('entry'),
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
    tags: normalizeTags(draft.tags),
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
        source: draft.type === 'game' || draft.type === 'list' ? 'custom' : draft.type,
        externalId: draft.detailPath?.split('/').pop(),
        detailPath: draft.detailPath,
        canonicalUrl,
      } satisfies EntrySourceRef),
    addedAt: timestamp,
    updatedAt: timestamp,
    reminderAt: draft.reminderAt,
    coverAssetUri: draft.uploadedCover?.url ?? draft.coverAssetUri,
    productUrl: draft.productUrl,
    price: draft.price,
    archivedAt: draft.archivedAt,
  };
}

function findListLocation(state: ListsState, listId: string) {
  const activeIndex = state.lists.findIndex((list) => list.id === listId);
  if (activeIndex >= 0) {
    return { key: 'lists' as const, index: activeIndex };
  }

  const deletedIndex = state.deletedLists.findIndex((list) => list.id === listId);
  if (deletedIndex >= 0) {
    return { key: 'deletedLists' as const, index: deletedIndex };
  }

  return null;
}

function findEntryLocation(state: ListsState, entryId: string) {
  for (const key of ['lists', 'deletedLists'] as const) {
    const listIndex = state[key].findIndex((list) => list.entries.some((entry) => entry.id === entryId));
    if (listIndex >= 0) {
      const entryIndex = state[key][listIndex]!.entries.findIndex((entry) => entry.id === entryId);
      return { key, listIndex, entryIndex };
    }
  }

  return null;
}

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const {
    activeAccount,
    activeMockAccountSeed,
    updateActiveMockListsState,
    resetActiveMockListsState,
  } = useTestAccounts();
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

  const isMockAccount = activeAccount.kind === 'mock' && !!activeMockAccountSeed;
  const state = isMockAccount ? activeMockAccountSeed.listsState : snapshot?.listsState;
  const lists = useMemo(
    () => hydrateListHierarchy(applyMockThumbnailsToLists(state?.lists ?? [])),
    [state?.lists]
  );
  const deletedLists = useMemo(
    () => hydrateListHierarchy(applyMockThumbnailsToLists(state?.deletedLists ?? [])),
    [state?.deletedLists]
  );
  const activeLists = lists;

  const runMockListsUpdate = async <T,>(updater: (current: ListsState) => { nextState: ListsState; result: T }) => {
    let result!: T;

    updateActiveMockListsState((current) => {
      const output = updater(cloneListsState(current));
      result = output.result;
      return withHydratedMockListsState(output.nextState);
    });

    return result;
  };

  useEffect(() => {
    if (isMockAccount || !snapshot) {
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
  }, [
    deletedLists,
    isMockAccount,
    lists,
    snapshot,
    state?.itemUserDataByKey,
    state?.recentListIds,
    state?.recentSearches,
    state?.savedTemplates,
  ]);

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
      isHydrated: isMockAccount ? true : snapshot !== undefined,
      isSyncing: isMockAccount ? false : isBootstrapping || pendingMutations > 0,
      lastSyncError: isMockAccount ? null : lastSyncError ?? lastBootstrapError,
      dataSource: isMockAccount ? 'mock' : 'convex',
    };
  }, [
    activeLists,
    deletedLists,
    isBootstrapping,
    isMockAccount,
    lastBootstrapError,
    lastSyncError,
    lists,
    pendingMutations,
    snapshot,
    state,
  ]);

  const listActions = useMemo<ListActionsValue>(
    () => {
      if (isMockAccount) {
        return {
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

            return await runMockListsUpdate((current) => {
              const timestamp = Date.now();
              const config = createListConfig(
                normalizedOptions.config ??
                  (normalizedOptions.preset === 'tracking'
                    ? {
                        addons: [
                          'status',
                          'progress',
                          'rating',
                          'tags',
                          'notes',
                          'reminders',
                          'cover',
                        ],
                        automationBlocks: [],
                        fieldDefinitions: [],
                        defaultEntryType: 'custom',
                      }
                    : undefined)
              );
              const listId = createClientId('list');
              const nextList: TrackerList = {
                id: listId,
                title: trimmedTitle,
                imageUrl: normalizedOptions.uploadedImage?.url ?? normalizedOptions.imageUrl,
                description: normalizedOptions.description?.trim() || undefined,
                tags: normalizeTags(normalizedOptions.tags),
                preset: normalizedOptions.preset ?? derivePresetFromConfig(config),
                config,
                entries: [],
                preferences: sanitizeListPreferencesForConfig(DEFAULT_LIST_PREFERENCES, config),
                pinned: normalizedOptions.pinned ?? false,
                createdAt: timestamp,
                updatedAt: timestamp,
                sortOrder: timestamp,
                templateId: normalizedOptions.templateId,
                showInMyLists:
                  normalizedOptions.showInMyLists ?? !normalizedOptions.parentListId,
                parentListId: normalizedOptions.parentListId,
                childListIds: [],
              };

              return {
                nextState: {
                  ...current,
                  lists: [...current.lists, nextList],
                  recentListIds: touchRecentListIds(current.recentListIds, listId),
                },
                result: listId,
              };
            });
          },
          createListFromTemplate: async (templateId, overrides) =>
            await runMockListsUpdate((current) => {
              const template =
                [...BUILT_IN_LIST_TEMPLATES, ...current.savedTemplates].find(
                  (item) => item.id === templateId
                ) ?? null;
              if (!template) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const baseList = createListFromTemplate(template);
              const nextList: TrackerList = {
                ...baseList,
                title: overrides?.title?.trim() || baseList.title,
                description: overrides?.description?.trim() || baseList.description,
                imageUrl: overrides?.uploadedImage?.url ?? overrides?.imageUrl ?? baseList.imageUrl,
                pinned: overrides?.pinned ?? baseList.pinned,
                tags: normalizeTags(overrides?.tags ?? baseList.tags),
                showInMyLists: overrides?.showInMyLists ?? !overrides?.parentListId,
                parentListId: overrides?.parentListId,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  lists: [...current.lists, nextList],
                  recentListIds: touchRecentListIds(current.recentListIds, nextList.id),
                },
                result: nextList.id,
              };
            }),
          updateList: async (listId, updates) => {
            await runMockListsUpdate((current) => {
              const location = findListLocation(current, listId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.index]!;
              const nextConfig = updates.config ? createListConfig(updates.config) : list.config;
              collection[location.index] = {
                ...list,
                title: typeof updates.title === 'string' ? updates.title : list.title,
                description:
                  'description' in updates ? updates.description?.trim() || undefined : list.description,
                imageUrl:
                  'imageUrl' in updates ? updates.imageUrl || undefined : list.imageUrl,
                pinned: typeof updates.pinned === 'boolean' ? updates.pinned : list.pinned,
                config: nextConfig,
                preset: derivePresetFromConfig(nextConfig),
                preferences: sanitizeListPreferencesForConfig(list.preferences, nextConfig),
                templateId:
                  'templateId' in updates ? updates.templateId || undefined : list.templateId,
                tags: 'tags' in updates ? normalizeTags(updates.tags) : list.tags,
                showInMyLists:
                  'showInMyLists' in updates
                    ? !!updates.showInMyLists
                    : (list.showInMyLists ?? !list.parentListId),
                parentListId:
                  'parentListId' in updates ? updates.parentListId || undefined : list.parentListId,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          saveListAsTemplate: async (listId, template) =>
            await runMockListsUpdate((current) => {
              const list = current.lists.find((item) => item.id === listId);
              if (!list) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const templateId = createClientId('template');
              const starterEntries = list.entries.map((entry) => {
                const { id, addedAt, updatedAt, ...rest } = cloneEntry(entry);
                void id;
                void addedAt;
                void updatedAt;
                return rest;
              });

              return {
                nextState: {
                  ...current,
                  savedTemplates: [
                    ...current.savedTemplates,
                    {
                      id: templateId,
                      title: template.title.trim(),
                      description: template.description.trim(),
                      source: 'user',
                      preset: list.preset,
                      config: createListConfig(list.config),
                      starterEntries,
                    },
                  ],
                },
                result: templateId,
              };
            }),
          deleteTemplate: async (templateId) => {
            await runMockListsUpdate((current) => ({
              nextState: {
                ...current,
                savedTemplates: current.savedTemplates.filter((template) => template.id !== templateId),
              },
              result: undefined,
            }));
          },
          archiveList: async (listId) => {
            await runMockListsUpdate((current) => {
              const location = findListLocation(current, listId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.index]!;
              collection[location.index] = {
                ...list,
                archivedAt: Date.now(),
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          restoreArchivedList: async (listId) => {
            await runMockListsUpdate((current) => {
              const location = findListLocation(current, listId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.index]!;
              collection[location.index] = {
                ...list,
                archivedAt: undefined,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          deleteList: async (listId) => {
            await runMockListsUpdate((current) => {
              const list = current.lists.find((item) => item.id === listId);
              if (!list) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              return {
                nextState: {
                  ...current,
                  lists: current.lists.filter((item) => item.id !== listId),
                  deletedLists: [
                    ...current.deletedLists,
                    {
                      ...list,
                      deletedAt: Date.now(),
                      updatedAt: Date.now(),
                    },
                  ],
                  recentListIds: current.recentListIds.filter((id) => id !== listId),
                },
                result: undefined,
              };
            });
          },
          restoreList: async (listId) => {
            await runMockListsUpdate((current) => {
              const list = current.deletedLists.find((item) => item.id === listId);
              if (!list) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              return {
                nextState: {
                  ...current,
                  deletedLists: current.deletedLists.filter((item) => item.id !== listId),
                  lists: [
                    ...current.lists,
                    {
                      ...list,
                      deletedAt: undefined,
                      updatedAt: Date.now(),
                    },
                  ],
                  recentListIds: touchRecentListIds(current.recentListIds, listId),
                },
                result: undefined,
              };
            });
          },
          reorderLists: async (orderedListIds) => {
            if (!orderedListIds.length) {
              return;
            }

            await runMockListsUpdate((current) => {
              const sortOrderById = new Map(
                orderedListIds.map((listId, index) => [listId, (index + 1) * 1_000])
              );

              return {
                nextState: {
                  ...current,
                  lists: current.lists.map((list) =>
                    sortOrderById.has(list.id)
                      ? {
                          ...list,
                          sortOrder: sortOrderById.get(list.id),
                        }
                      : list
                  ),
                },
                result: undefined,
              };
            });
          },
          setListPreferences: async (listId, updates) => {
            await runMockListsUpdate((current) => {
              const location = findListLocation(current, listId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.index]!;
              collection[location.index] = {
                ...list,
                preferences: sanitizeListPreferencesForConfig(
                  {
                    ...list.preferences,
                    ...updates,
                  },
                  list.config
                ),
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          markListOpened: async (listId) => {
            await runMockListsUpdate((current) => ({
              nextState: {
                ...current,
                recentListIds: touchRecentListIds(current.recentListIds, listId),
              },
              result: undefined,
            }));
          },
          recordRecentSearch: async (queryText) => {
            const trimmedQuery = queryText.trim();
            if (!trimmedQuery) {
              return;
            }

            await runMockListsUpdate((current) => ({
              nextState: {
                ...current,
                recentSearches: [
                  trimmedQuery,
                  ...current.recentSearches.filter((value) => value !== trimmedQuery),
                ].slice(0, 8),
              },
              result: undefined,
            }));
          },
          convertTagToSublist: async (listId, tag) =>
            await runMockListsUpdate((current) => {
              const normalizedTag = tag.trim();
              const parentIndex = current.lists.findIndex((list) => list.id === listId);
              if (!normalizedTag || parentIndex < 0) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const parentList = current.lists[parentIndex]!;
              const matchingEntries = parentList.entries.filter((entry) =>
                entry.tags.includes(normalizedTag)
              );
              if (!matchingEntries.length) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const timestamp = Date.now();
              const sublistId = createClientId('list');
              const matchingIds = new Set(matchingEntries.map((entry) => entry.id));
              const insertIndex = parentList.entries.findIndex((entry) => matchingIds.has(entry.id));
              const movedLinkedListIds = new Set(
                matchingEntries
                  .map((entry) => entry.linkedListId)
                  .filter((linkedListId): linkedListId is string => !!linkedListId)
              );
              const placeholderEntry = createMockEntryFromDraft(
                {
                  title: normalizedTag,
                  type: 'list',
                  detailPath: `list/${sublistId}`,
                  linkedListId: sublistId,
                  tags: [normalizedTag],
                  sourceRef: {
                    source: 'custom',
                    detailPath: `list/${sublistId}`,
                  },
                },
                parentList.config
              );
              const nextSublist: TrackerList = {
                id: sublistId,
                title: normalizedTag,
                imageUrl: undefined,
                description: undefined,
                tags: [normalizedTag],
                preset: derivePresetFromConfig(parentList.config),
                config: createListConfig(parentList.config),
                entries: matchingEntries.map((entry) => ({
                  ...entry,
                  tags: entry.tags.filter((value) => value !== normalizedTag),
                  updatedAt: timestamp,
                })),
                preferences: sanitizeListPreferencesForConfig(
                  DEFAULT_LIST_PREFERENCES,
                  createListConfig(parentList.config)
                ),
                pinned: false,
                createdAt: timestamp,
                updatedAt: timestamp,
                sortOrder: timestamp,
                showInMyLists: false,
                parentListId: listId,
                childListIds: [],
              };

              const nextLists = current.lists.map((list) => {
                if (list.id === listId) {
                  const remainingEntries = list.entries.filter((entry) => !matchingIds.has(entry.id));
                  const nextEntries = [...remainingEntries];
                  nextEntries.splice(insertIndex >= 0 ? insertIndex : 0, 0, placeholderEntry);

                  return {
                    ...list,
                    entries: nextEntries,
                    updatedAt: timestamp,
                  };
                }

                if (movedLinkedListIds.has(list.id)) {
                  return {
                    ...list,
                    parentListId: sublistId,
                    tags: normalizeTags([...list.tags, normalizedTag]),
                    updatedAt: timestamp,
                  };
                }

                return list;
              });

              return {
                nextState: {
                  ...current,
                  lists: [...nextLists, nextSublist],
                  recentListIds: touchRecentListIds(current.recentListIds, listId),
                },
                result: sublistId,
              };
            }),
          convertSublistToTag: async (sublistId) =>
            await runMockListsUpdate((current) => {
              const sublist = current.lists.find((list) => list.id === sublistId);
              if (!sublist?.parentListId) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const normalizedTag = sublist.title.trim();
              if (!normalizedTag) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const parentIndex = current.lists.findIndex((list) => list.id === sublist.parentListId);
              if (parentIndex < 0) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const timestamp = Date.now();
              const parentList = current.lists[parentIndex]!;
              const placeholderIndex = parentList.entries.findIndex(
                (entry) =>
                  entry.linkedListId === sublistId || entry.detailPath === `list/${sublistId}`
              );
              const movedLinkedListIds = new Set(
                sublist.entries
                  .map((entry) => entry.linkedListId)
                  .filter((linkedListId): linkedListId is string => !!linkedListId)
              );

              const nextLists = current.lists
                .filter((list) => list.id !== sublistId)
                .map((list) => {
                  if (list.id === parentList.id) {
                    const remainingEntries = list.entries.filter(
                      (entry) =>
                        entry.linkedListId !== sublistId && entry.detailPath !== `list/${sublistId}`
                    );
                    const nextEntries = [...remainingEntries];
                    nextEntries.splice(
                      placeholderIndex >= 0 ? placeholderIndex : remainingEntries.length,
                      0,
                      ...sublist.entries.map((entry) => ({
                        ...entry,
                        tags: normalizeTags([...entry.tags, normalizedTag]),
                        updatedAt: timestamp,
                      }))
                    );

                    return {
                      ...list,
                      entries: nextEntries,
                      updatedAt: timestamp,
                    };
                  }

                  if (movedLinkedListIds.has(list.id)) {
                    return {
                      ...list,
                      parentListId: parentList.id,
                      tags: normalizeTags([...list.tags, normalizedTag]),
                      updatedAt: timestamp,
                    };
                  }

                  return list;
                });

              return {
                nextState: {
                  ...current,
                  lists: nextLists,
                  recentListIds: touchRecentListIds(
                    current.recentListIds.filter((id) => id !== sublistId),
                    parentList.id
                  ),
                },
                result: normalizedTag,
              };
            }),
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
            const importedState = withHydratedMockListsState(parseImportedListsState(raw));
            updateActiveMockListsState(() => importedState);
          },
          loadMockData: async () => {
            resetActiveMockListsState();
          },
          resetAllLists: async () => {
            updateActiveMockListsState((current) => ({
              ...current,
              lists: [],
              deletedLists: [],
              savedTemplates: [],
              itemUserDataByKey: {},
              recentSearches: [],
              recentListIds: [],
              reminderNotificationIds: {},
            }));
          },
        };
      }

      return {
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
      };
    },
    [
      archiveListMutation,
      convertSublistToTagMutation,
      convertTagToSublistMutation,
      createListFromTemplateMutation,
      createListMutation,
      deleteListMutation,
      deleteTemplateMutation,
      deletedLists,
      importLegacyMutation,
      isMockAccount,
      lists,
      loadMockDataMutation,
      markListOpenedMutation,
      resetActiveMockListsState,
      recordRecentSearchMutation,
      reorderListsMutation,
      resetWorkspaceMutation,
      restoreArchivedListMutation,
      restoreListMutation,
      runMockListsUpdate,
      runMutation,
      saveListAsTemplateMutation,
      setListPreferencesMutation,
      state,
      updateListMutation,
      updateActiveMockListsState,
    ]
  );

  const entryActions = useMemo<EntryActionsValue>(
    () => {
      if (isMockAccount) {
        return {
          addEntryToList: async (listId, draft) =>
            await runMockListsUpdate((current) => {
              const listIndex = current.lists.findIndex((list) => list.id === listId);
              if (listIndex < 0) {
                return {
                  nextState: current,
                  result: null,
                };
              }

              const list = current.lists[listIndex]!;
              const entry = createMockEntryFromDraft(draft, list.config);
              const nextLists = [...current.lists];
              nextLists[listIndex] = {
                ...list,
                entries: [...list.entries, entry],
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  lists: nextLists,
                  recentListIds: touchRecentListIds(current.recentListIds, listId),
                },
                result: entry.id,
              };
            }),
          updateEntry: async (_listId, entryId, updates) => {
            await runMockListsUpdate((current) => {
              const location = findEntryLocation(current, entryId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.listIndex]!;
              const entry = list.entries[location.entryIndex]!;
              const nextSourceRef =
                updates.sourceRef !== undefined
                  ? { ...entry.sourceRef, ...updates.sourceRef }
                  : entry.sourceRef;
              const nextEntries = [...list.entries];
              nextEntries[location.entryIndex] = {
                ...entry,
                title: 'title' in updates ? updates.title ?? entry.title : entry.title,
                type: 'type' in updates ? updates.type ?? entry.type : entry.type,
                imageUrl: 'imageUrl' in updates ? updates.imageUrl : entry.imageUrl,
                detailPath: 'detailPath' in updates ? updates.detailPath : entry.detailPath,
                notes: 'notes' in updates ? updates.notes : entry.notes,
                customFields: 'customFields' in updates ? updates.customFields : entry.customFields,
                displayVariant:
                  'displayVariant' in updates ? updates.displayVariant : entry.displayVariant,
                totalEpisodes:
                  'totalEpisodes' in updates ? updates.totalEpisodes : entry.totalEpisodes,
                totalChapters:
                  'totalChapters' in updates ? updates.totalChapters : entry.totalChapters,
                totalVolumes:
                  'totalVolumes' in updates ? updates.totalVolumes : entry.totalVolumes,
                linkedEntryId:
                  'linkedEntryId' in updates ? updates.linkedEntryId : entry.linkedEntryId,
                linkedListId:
                  'linkedListId' in updates ? updates.linkedListId : entry.linkedListId,
                checked: 'checked' in updates ? updates.checked : entry.checked,
                status: 'status' in updates ? updates.status : entry.status,
                rating: 'rating' in updates ? normalizeRating(updates.rating) : entry.rating,
                tags: 'tags' in updates ? normalizeTags(updates.tags) : entry.tags,
                progress:
                  'progress' in updates ? normalizeProgress(updates.progress) : entry.progress,
                sourceRef: nextSourceRef,
                reminderAt: 'reminderAt' in updates ? updates.reminderAt : entry.reminderAt,
                coverAssetUri:
                  'coverAssetUri' in updates ? updates.coverAssetUri : entry.coverAssetUri,
                productUrl: 'productUrl' in updates ? updates.productUrl : entry.productUrl,
                price: 'price' in updates ? updates.price : entry.price,
                archivedAt: 'archivedAt' in updates ? updates.archivedAt : entry.archivedAt,
                updatedAt: Date.now(),
              };
              collection[location.listIndex] = {
                ...list,
                entries: nextEntries,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                  recentListIds: touchRecentListIds(current.recentListIds, list.id),
                },
                result: undefined,
              };
            });
          },
          deleteEntryFromList: async (_listId, entryId) => {
            await runMockListsUpdate((current) => {
              const location = findEntryLocation(current, entryId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.listIndex]!;
              collection[location.listIndex] = {
                ...list,
                entries: list.entries.filter((entry) => entry.id !== entryId),
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          moveEntry: async (sourceListId, targetListId, entryIds) => {
            await runMockListsUpdate((current) => {
              if (!entryIds.length || sourceListId === targetListId) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const sourceIndex = current.lists.findIndex((list) => list.id === sourceListId);
              const targetIndex = current.lists.findIndex((list) => list.id === targetListId);
              if (sourceIndex < 0 || targetIndex < 0) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const sourceList = current.lists[sourceIndex]!;
              const targetList = current.lists[targetIndex]!;
              const movingEntries = sourceList.entries.filter((entry) => entryIds.includes(entry.id));
              if (!movingEntries.length) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const nextLists = [...current.lists];
              nextLists[sourceIndex] = {
                ...sourceList,
                entries: sourceList.entries.filter((entry) => !entryIds.includes(entry.id)),
                updatedAt: Date.now(),
              };
              nextLists[targetIndex] = {
                ...targetList,
                entries: [...movingEntries, ...targetList.entries],
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  lists: nextLists,
                  recentListIds: touchRecentListIds(current.recentListIds, targetListId),
                },
                result: undefined,
              };
            });
          },
          reorderEntries: async (listId, orderedEntryIds) => {
            await runMockListsUpdate((current) => {
              const listIndex = current.lists.findIndex((list) => list.id === listId);
              if (listIndex < 0) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const list = current.lists[listIndex]!;
              const entriesById = new Map(list.entries.map((entry) => [entry.id, entry]));
              const orderedEntries = orderedEntryIds
                .map((entryId) => entriesById.get(entryId))
                .filter((entry): entry is ListEntry => !!entry);
              const remainingEntries = list.entries.filter((entry) => !orderedEntryIds.includes(entry.id));
              const nextLists = [...current.lists];
              nextLists[listIndex] = {
                ...list,
                entries: [...orderedEntries, ...remainingEntries],
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  lists: nextLists,
                },
                result: undefined,
              };
            });
          },
          setEntryProgress: async (_listId, entryId, progress) => {
            await runMockListsUpdate((current) => {
              const location = findEntryLocation(current, entryId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.listIndex]!;
              const entry = list.entries[location.entryIndex]!;
              const nextEntries = [...list.entries];
              nextEntries[location.entryIndex] = {
                ...entry,
                progress:
                  progress !== undefined
                    ? normalizeProgress({
                        ...progress,
                        updatedAt: progress.updatedAt ?? Date.now(),
                      })
                    : undefined,
                updatedAt: Date.now(),
              };
              collection[location.listIndex] = {
                ...list,
                entries: nextEntries,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          setEntryChecked: async (_listId, entryId, checked) => {
            await runMockListsUpdate((current) => {
              const location = findEntryLocation(current, entryId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.listIndex]!;
              const entry = list.entries[location.entryIndex]!;
              const nextEntries = [...list.entries];
              nextEntries[location.entryIndex] = {
                ...entry,
                checked,
                ...applyAutomationBlocks(list.config, {
                  addonId: 'toggle',
                  field: 'checked',
                  value: checked,
                }),
                updatedAt: Date.now(),
              };
              collection[location.listIndex] = {
                ...list,
                entries: nextEntries,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          setEntryStatus: async (_listId, entryId, status) => {
            await runMockListsUpdate((current) => {
              const location = findEntryLocation(current, entryId);
              if (!location) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const collection = [...current[location.key]];
              const list = collection[location.listIndex]!;
              const entry = list.entries[location.entryIndex]!;
              const nextEntries = [...list.entries];
              nextEntries[location.entryIndex] = {
                ...entry,
                status,
                updatedAt: Date.now(),
              };
              collection[location.listIndex] = {
                ...list,
                entries: nextEntries,
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  [location.key]: collection,
                },
                result: undefined,
              };
            });
          },
          duplicateEntries: async (listId, entryIds) => {
            await runMockListsUpdate((current) => {
              const listIndex = current.lists.findIndex((list) => list.id === listId);
              if (listIndex < 0 || !entryIds.length) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const list = current.lists[listIndex]!;
              const duplicates = list.entries
                .filter((entry) => entryIds.includes(entry.id))
                .map((entry) => ({
                  ...cloneEntry(entry),
                  id: createClientId('entry'),
                  title: `${entry.title} (Copy)`,
                  addedAt: Date.now(),
                  updatedAt: Date.now(),
                }));
              const nextLists = [...current.lists];
              nextLists[listIndex] = {
                ...list,
                entries: [...duplicates, ...list.entries],
                updatedAt: Date.now(),
              };

              return {
                nextState: {
                  ...current,
                  lists: nextLists,
                  recentListIds: touchRecentListIds(current.recentListIds, listId),
                },
                result: undefined,
              };
            });
          },
          archiveEntries: async (_listId, entryIds) => {
            await runMockListsUpdate((current) => {
              if (!entryIds.length) {
                return {
                  nextState: current,
                  result: undefined,
                };
              }

              const nextLists = current.lists.map((list) => ({
                ...list,
                entries: list.entries.map((entry) =>
                  entryIds.includes(entry.id)
                    ? {
                        ...entry,
                        archivedAt: Date.now(),
                        updatedAt: Date.now(),
                      }
                    : entry
                ),
              }));

              return {
                nextState: {
                  ...current,
                  lists: nextLists,
                },
                result: undefined,
              };
            });
          },
        };
      }

      return {
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
      };
    },
    [
      addEntryMutation,
      archiveEntriesMutation,
      deleteEntryMutation,
      duplicateEntriesMutation,
      isMockAccount,
      moveEntriesMutation,
      reorderEntriesMutation,
      runMockListsUpdate,
      runMutation,
      setEntryCheckedMutation,
      setEntryProgressMutation,
      setEntryStatusMutation,
      updateEntryMutation,
    ]
  );

  const itemUserDataActions = useMemo<ItemUserDataActionsValue>(
    () => {
      if (isMockAccount) {
        return {
          setItemUserData: async (itemKey, value) => {
            await runMockListsUpdate((current) => ({
              nextState: {
                ...current,
                itemUserDataByKey: {
                  ...current.itemUserDataByKey,
                  [itemKey]: {
                    ...value,
                    tags: normalizeTags(value.tags),
                    progress: normalizeProgress(value.progress),
                    customFields: value.customFields.map((field) => ({ ...field })),
                    updatedAt: value.updatedAt ?? Date.now(),
                  },
                },
              },
              result: undefined,
            }));
          },
        };
      }

      return {
        setItemUserData: async (itemKey, value) => {
          await runMutation(() => setItemUserDataMutation({ itemKey, value }));
        },
      };
    },
    [isMockAccount, runMockListsUpdate, runMutation, setItemUserDataMutation]
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
