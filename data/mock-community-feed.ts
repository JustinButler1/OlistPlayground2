export type CommunityFeedMedia = 'wellness-breakfast';

export interface CommunityFeedItem {
  id: string;
  author: string;
  handle: string;
  timeAgo: string;
  body: string;
  likesLabel: string;
  repliesLabel: string;
  avatarGradient: [string, string];
  media?: CommunityFeedMedia;
}

export const MOCK_COMMUNITY_FEED: CommunityFeedItem[] = [
  {
    id: 'edward-check-in',
    author: 'Edward Chen',
    handle: '@edwardc',
    timeAgo: '2m ago',
    body:
      "Three months smoke-free. Cravings still show up, but they don't own the whole day anymore. Finally feels like I can trust the progress.",
    likesLabel: '1.4K boosts',
    repliesLabel: '128 replies',
    avatarGradient: ['#f7d8b5', '#b57557'],
  },
  {
    id: 'sarah-breakfast',
    author: 'Sarah',
    handle: '@sarahwell',
    timeAgo: '14m ago',
    body:
      "One week done. Food already tastes better and breathing feels easier. Still rough after meals, but this breakfast actually felt like a reset.",
    likesLabel: '1.1K boosts',
    repliesLabel: '92 replies',
    avatarGradient: ['#ffbe98', '#cb6b4c'],
    media: 'wellness-breakfast',
  },
  {
    id: 'maya-night-routine',
    author: 'Maya Torres',
    handle: '@mtorres',
    timeAgo: '31m ago',
    body:
      'Swapped doomscrolling for a 20-minute walk and a chapter before bed. Not dramatic, but the whole next morning feels less scrambled.',
    likesLabel: '842 boosts',
    repliesLabel: '37 replies',
    avatarGradient: ['#89d7ea', '#4e2899'],
  },
];
