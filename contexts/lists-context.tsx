'use client';

import React, { createContext, useCallback, useMemo, useState } from 'react';

import { MOCK_LISTS, MOCK_TIER_SUBLISTS } from '@/data/mock-lists';
import type { ListEntry, ListPreset, MockList } from '@/data/mock-lists';

function createEntryId(): string {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type AddedEntriesState = Record<string, ListEntry[]>;

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
}

const ListsContext = createContext<ListsContextValue | null>(null);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [addedByListId, setAddedByListId] = useState<AddedEntriesState>({});
  const [userLists, setUserLists] = useState<MockList[]>([]);

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

  const lists = useMemo(() => {
    const base = [...MOCK_LISTS, ...MOCK_TIER_SUBLISTS, ...userLists];
    return base.map((list) => ({
      ...list,
      entries: [...list.entries, ...(addedByListId[list.id] ?? [])],
    }));
  }, [addedByListId, userLists]);

  const mainLists = useMemo(
    () => lists.filter((l) => !TIER_SUBLIST_IDS.has(l.id)),
    [lists]
  );

  const value = useMemo<ListsContextValue>(
    () => ({ lists, mainLists, addEntryToList, createList }),
    [lists, mainLists, addEntryToList, createList]
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
