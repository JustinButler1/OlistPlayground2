'use client';

import React, { createContext, useCallback, useMemo, useState } from 'react';

import { MOCK_LISTS } from '@/data/mock-lists';
import type { ListEntry, MockList } from '@/data/mock-lists';

function createEntryId(): string {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type AddedEntriesState = Record<string, ListEntry[]>;

function createListId(): string {
  return `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface ListsContextValue {
  /** All lists with base entries plus any added-from-search entries. */
  lists: MockList[];
  addEntryToList: (listId: string, entry: Omit<ListEntry, 'id'>) => void;
  createList: (title: string) => void;
}

const ListsContext = createContext<ListsContextValue | null>(null);

export function ListsProvider({ children }: { children: React.ReactNode }) {
  const [addedByListId, setAddedByListId] = useState<AddedEntriesState>({});
  const [userLists, setUserLists] = useState<MockList[]>([]);

  const addEntryToList = useCallback((listId: string, entry: Omit<ListEntry, 'id'>) => {
    const newEntry: ListEntry = {
      ...entry,
      id: createEntryId(),
    };
    setAddedByListId((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] ?? []), newEntry],
    }));
  }, []);

  const createList = useCallback((title: string) => {
    setUserLists((prev) => [
      ...prev,
      { id: createListId(), title: title.trim(), entries: [] },
    ]);
  }, []);

  const lists = useMemo(() => {
    const base = [...MOCK_LISTS, ...userLists];
    return base.map((list) => ({
      ...list,
      entries: [...list.entries, ...(addedByListId[list.id] ?? [])],
    }));
  }, [addedByListId, userLists]);

  const value = useMemo<ListsContextValue>(
    () => ({ lists, addEntryToList, createList }),
    [lists, addEntryToList, createList]
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
