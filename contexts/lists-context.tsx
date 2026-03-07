'use client';

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_LISTS, MOCK_TIER_SUBLISTS } from '@/data/mock-lists';
import type { ListEntry, ListPreset, MockList } from '@/data/mock-lists';
import type { ChildChange, ListMetadata, ListViewMode } from '@/lib/lists-storage';
import { loadListsState, saveListsState } from '@/lib/lists-storage';

function createEntryId(): string {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type AddedEntriesState = Record<string, ListEntry[]>;
type ListMetadataState = Record<string, ListMetadata>;
type ChildChangesState = Record<string, Record<string, ChildChange>>;
type DeletedListIdsState = Record<string, true>;
type DeletedEntryIdsByListIdState = Record<string, Record<string, true>>;

const DEFAULT_LIST_VIEW_MODE: ListViewMode = 'list';

function createListId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const TIER_SUBLIST_IDS = new Set(MOCK_TIER_SUBLISTS.map((l) => l.id));

interface ListsContextValue {
  /** All lists with base entries plus any added-from-search entries (includes tier sublists for drill-down). */
  lists: MockList[];
  /** Lists to show on the main My Lists page (excludes tier sublists S/A/B/C/D/E/F). */
  mainLists: MockList[];
  addEntryToList: (listId: string, entry: Omit<ListEntry, 'id'>) => void;
  createList: (title: string, preset?: ListPreset) => void;
  getListViewMode: (listId: string) => ListViewMode;
  setListViewMode: (listId: string, viewMode: ListViewMode) => void;
  getCheckedByListId: (listId: string) => Record<string, boolean>;
  toggleEntryChecked: (listId: string, entryId: string) => void;
  deleteList: (listId: string) => void;
  deleteEntryFromList: (listId: string, entryId: string) => void;
}

const ListsContext = createContext<ListsContextValue | null>(null);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [addedByListId, setAddedByListId] = useState<AddedEntriesState>({});
  const [userLists, setUserLists] = useState<MockList[]>([]);
  const [listMetadataById, setListMetadataById] = useState<ListMetadataState>({});
  const [childChangesByListId, setChildChangesByListId] = useState<ChildChangesState>({});
  const [deletedListIds, setDeletedListIds] = useState<DeletedListIdsState>({});
  const [deletedEntryIdsByListId, setDeletedEntryIdsByListId] =
    useState<DeletedEntryIdsByListIdState>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await loadListsState();
        if (stored && isMounted) {
          setUserLists(stored.userLists ?? []);
          setAddedByListId(stored.addedByListId ?? {});
          setListMetadataById(stored.listMetadataById ?? {});
          setChildChangesByListId(stored.childChangesByListId ?? {});
          setDeletedListIds(stored.deletedListIds ?? {});
          setDeletedEntryIdsByListId(stored.deletedEntryIdsByListId ?? {});
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

  const addEntryToList = useCallback((listId: string, entry: Omit<ListEntry, 'id'>) => {
    const id = createEntryId();
    const wantsDetails =
      entry.displayVariant === 'details' || entry.displayVariant === 'checkbox-details';

    const newEntry: ListEntry = {
      ...entry,
      id,
      // If caller didn't provide a detailPath but wants a details page, route to custom list-entry screen
      detailPath: entry.detailPath ?? (wantsDetails ? `list-entry/${id}` : undefined),
    };

    setAddedByListId((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] ?? []), newEntry],
    }));
  }, []);

  const createList = useCallback((title: string, preset: ListPreset = 'blank') => {
    setUserLists((prev) => [
      ...prev,
      { id: createListId(), title: title.trim(), preset, entries: [] },
    ]);
  }, []);

  const getListViewMode = useCallback(
    (listId: string): ListViewMode =>
      listMetadataById[listId]?.viewMode ?? DEFAULT_LIST_VIEW_MODE,
    [listMetadataById]
  );

  const setListViewMode = useCallback((listId: string, viewMode: ListViewMode) => {
    setListMetadataById((prev) => {
      if (prev[listId]?.viewMode === viewMode) return prev;
      return {
        ...prev,
        [listId]: {
          ...prev[listId],
          viewMode,
          updatedAt: Date.now(),
        },
      };
    });
  }, []);

  const getCheckedByListId = useCallback(
    (listId: string): Record<string, boolean> => {
      const listChanges = childChangesByListId[listId];
      if (!listChanges) return {};

      const checkedById: Record<string, boolean> = {};
      for (const [entryId, change] of Object.entries(listChanges)) {
        if (change?.checked) {
          checkedById[entryId] = true;
        }
      }
      return checkedById;
    },
    [childChangesByListId]
  );

  const toggleEntryChecked = useCallback((listId: string, entryId: string) => {
    setChildChangesByListId((prev) => {
      const listChanges = prev[listId] ?? {};
      const current = listChanges[entryId]?.checked ?? false;

      return {
        ...prev,
        [listId]: {
          ...listChanges,
          [entryId]: {
            checked: !current,
            updatedAt: Date.now(),
          },
        },
      };
    });
  }, []);

  const deleteList = useCallback((listId: string) => {
    setUserLists((prev) => prev.filter((list) => list.id !== listId));
    setAddedByListId((prev) => {
      if (!(listId in prev)) return prev;
      const next = { ...prev };
      delete next[listId];
      return next;
    });
    setListMetadataById((prev) => {
      if (!(listId in prev)) return prev;
      const next = { ...prev };
      delete next[listId];
      return next;
    });
    setChildChangesByListId((prev) => {
      if (!(listId in prev)) return prev;
      const next = { ...prev };
      delete next[listId];
      return next;
    });
    setDeletedEntryIdsByListId((prev) => {
      if (!(listId in prev)) return prev;
      const next = { ...prev };
      delete next[listId];
      return next;
    });
    setDeletedListIds((prev) => ({
      ...prev,
      [listId]: true,
    }));
  }, []);

  const deleteEntryFromList = useCallback((listId: string, entryId: string) => {
    setAddedByListId((prev) => {
      const current = prev[listId];
      if (!current?.length) return prev;
      const nextEntries = current.filter((entry) => entry.id !== entryId);
      if (nextEntries.length === current.length) return prev;
      return {
        ...prev,
        [listId]: nextEntries,
      };
    });

    setChildChangesByListId((prev) => {
      const current = prev[listId];
      if (!current || !(entryId in current)) return prev;
      const nextListChanges = { ...current };
      delete nextListChanges[entryId];
      return {
        ...prev,
        [listId]: nextListChanges,
      };
    });

    setDeletedEntryIdsByListId((prev) => ({
      ...prev,
      [listId]: {
        ...(prev[listId] ?? {}),
        [entryId]: true,
      },
    }));
  }, []);

  const lists = useMemo(() => {
    const base = [...MOCK_LISTS, ...MOCK_TIER_SUBLISTS, ...userLists].filter(
      (list) => !deletedListIds[list.id]
    );
    return base.map((list) => ({
      ...list,
      entries: [
        ...list.entries.filter((entry) => !deletedEntryIdsByListId[list.id]?.[entry.id]),
        ...(addedByListId[list.id] ?? []).filter(
          (entry) => !deletedEntryIdsByListId[list.id]?.[entry.id]
        ),
      ],
    }));
  }, [addedByListId, deletedEntryIdsByListId, deletedListIds, userLists]);

  useEffect(() => {
    if (!isHydrated) return;

    (async () => {
      try {
        await saveListsState({
          userLists,
          addedByListId,
          listMetadataById,
          childChangesByListId,
          deletedListIds,
          deletedEntryIdsByListId,
        });
      } catch (error) {
        console.warn('ListsProvider: failed to persist lists state', error);
      }
    })();
  }, [
    userLists,
    addedByListId,
    listMetadataById,
    childChangesByListId,
    deletedListIds,
    deletedEntryIdsByListId,
    isHydrated,
  ]);

  const mainLists = useMemo(
    () => lists.filter((l) => !TIER_SUBLIST_IDS.has(l.id)),
    [lists]
  );

  const value = useMemo<ListsContextValue>(
    () => ({
      lists,
      mainLists,
      addEntryToList,
      createList,
      getListViewMode,
      setListViewMode,
      getCheckedByListId,
      toggleEntryChecked,
      deleteList,
      deleteEntryFromList,
    }),
    [
      lists,
      mainLists,
      addEntryToList,
      createList,
      getListViewMode,
      setListViewMode,
      getCheckedByListId,
      toggleEntryChecked,
      deleteList,
      deleteEntryFromList,
    ]
  );

  return (
    <ListsContext.Provider value={value}>
      {children}
    </ListsContext.Provider>
  );
}

export function useLists(): ListsContextValue {
  const ctx = React.useContext(ListsContext);
  if (!ctx) throw new Error('useLists must be used within ListsProvider');
  return ctx;
}
