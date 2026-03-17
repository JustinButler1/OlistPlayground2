import { useSyncExternalStore } from 'react';

import type { CommunityFeedItem } from '@/data/mock-community-feed';

type Listener = () => void;

const listeners = new Set<Listener>();
let postsByAccountId: Record<string, CommunityFeedItem[]> = {};

function subscribe(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return postsByAccountId;
}

export function useCreatedCommunityPosts(accountId: string) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return snapshot[accountId] ?? [];
}

export function addCreatedCommunityPost(accountId: string, item: CommunityFeedItem) {
  postsByAccountId = {
    ...postsByAccountId,
    [accountId]: [item, ...(postsByAccountId[accountId] ?? [])],
  };
  emitChange();
}

export function buildCommunityAvatarGradient(seedText: string): [string, string] {
  const palette: [string, string][] = [
    ['#ffcc9f', '#cb6b4c'],
    ['#9ad8ff', '#2667a8'],
    ['#ffd86f', '#f38b2d'],
    ['#89d7ea', '#4e2899'],
    ['#f7d8b5', '#b57557'],
  ];
  const seed = seedText.trim().split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return palette[seed % palette.length] ?? palette[0];
}
