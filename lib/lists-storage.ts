import { Platform } from 'react-native';
import LegacyAsyncStorage from '@react-native-async-storage/async-storage';
import SQLiteAsyncStorage from 'expo-sqlite/kv-store';

import type { ListEntry, MockList } from '@/data/mock-lists';

export type ListViewMode = 'list' | 'grid' | 'compare' | 'tier';

export type ListMetadata = {
  viewMode?: ListViewMode;
  updatedAt?: number;
};

export type ChildChange = {
  checked?: boolean;
  updatedAt?: number;
};

export type ListsState = {
  userLists: MockList[];
  addedByListId: Record<string, ListEntry[]>;
  listMetadataById: Record<string, ListMetadata>;
  childChangesByListId: Record<string, Record<string, ChildChange>>;
  deletedListIds: Record<string, true>;
  deletedEntryIdsByListId: Record<string, Record<string, true>>;
};

const STORAGE_KEY = 'lists-state-v2';
const LEGACY_STORAGE_KEY = 'lists-state-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeListsState(value: unknown): ListsState | null {
  if (!isRecord(value)) return null;

  const userLists = Array.isArray(value.userLists) ? (value.userLists as MockList[]) : [];
  const addedByListId = isRecord(value.addedByListId)
    ? (value.addedByListId as Record<string, ListEntry[]>)
    : {};
  const listMetadataById = isRecord(value.listMetadataById)
    ? (value.listMetadataById as Record<string, ListMetadata>)
    : {};
  const childChangesByListId = isRecord(value.childChangesByListId)
    ? (value.childChangesByListId as Record<string, Record<string, ChildChange>>)
    : {};
  const deletedListIds = isRecord(value.deletedListIds)
    ? (value.deletedListIds as Record<string, true>)
    : {};
  const deletedEntryIdsByListId = isRecord(value.deletedEntryIdsByListId)
    ? (value.deletedEntryIdsByListId as Record<string, Record<string, true>>)
    : {};

  return {
    userLists,
    addedByListId,
    listMetadataById,
    childChangesByListId,
    deletedListIds,
    deletedEntryIdsByListId,
  };
}

async function loadLegacyRawState(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(LEGACY_STORAGE_KEY);
  }
  return LegacyAsyncStorage.getItem(LEGACY_STORAGE_KEY);
}

async function clearLegacyRawState(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }
  await LegacyAsyncStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function loadListsState(): Promise<ListsState | null> {
  try {
    const raw = await SQLiteAsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeListsState(JSON.parse(raw));
    }

    const legacyRaw = await loadLegacyRawState();
    if (!legacyRaw) return null;

    const legacyState = normalizeListsState(JSON.parse(legacyRaw));
    if (!legacyState) return null;

    await saveListsState(legacyState);
    await clearLegacyRawState();
    return legacyState;
  } catch (error) {
    console.warn('Failed to load lists state', error);
    return null;
  }
}

export async function saveListsState(state: ListsState): Promise<void> {
  try {
    await SQLiteAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save lists state', error);
  }
}

export async function clearListsState(): Promise<void> {
  try {
    await SQLiteAsyncStorage.removeItem(STORAGE_KEY);
    await clearLegacyRawState();
  } catch (error) {
    console.warn('Failed to clear lists state', error);
  }
}
