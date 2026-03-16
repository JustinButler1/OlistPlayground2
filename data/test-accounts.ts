import {
  cloneList,
  cloneTemplate,
  createListPreferences,
  createPowerUserMockSeed,
  hydrateListHierarchy,
  type ItemUserData,
} from '@/data/mock-lists';
import type { CommunityFeedItem } from '@/data/mock-community-feed';
import type { OnboardingState } from '@/lib/onboarding-storage';
import type { ListsState } from '@/lib/lists-storage';

export type MockTestAccountId = 'creator-lab' | 'weekend-reset';
export type TestAccountId = 'live-current' | MockTestAccountId;

export interface TestAccountDefinition {
  id: TestAccountId;
  kind: 'live' | 'mock';
  profileId: string;
  handle: string;
  defaultDisplayName: string;
  pickerLabel: string;
  pickerDescription: string;
}

export interface MockTestAccountSeed {
  onboardingState: OnboardingState;
  listsState: ListsState;
  communityFeed: CommunityFeedItem[];
}

const BASE_COMPLETED_AT = new Date('2026-02-28T15:00:00.000Z').getTime();

export const TEST_ACCOUNT_DEFINITIONS: TestAccountDefinition[] = [
  {
    id: 'live-current',
    kind: 'live',
    profileId: 'shared-workspace-profile',
    handle: 'shared-workspace-profile',
    defaultDisplayName: 'Shared Workspace',
    pickerLabel: 'Current account',
    pickerDescription: 'Uses the existing live app data.',
  },
  {
    id: 'creator-lab',
    kind: 'mock',
    profileId: 'test-account-creator-lab',
    handle: 'averystone.lab',
    defaultDisplayName: 'Avery Stone',
    pickerLabel: 'Avery Stone',
    pickerDescription: 'Creator-focused mock account with launch planning data.',
  },
  {
    id: 'weekend-reset',
    kind: 'mock',
    profileId: 'test-account-weekend-reset',
    handle: 'minapark.home',
    defaultDisplayName: 'Mina Park',
    pickerLabel: 'Mina Park',
    pickerDescription: 'Home-and-routines mock account with reset lists.',
  },
];

function cloneItemUserData(item: ItemUserData): ItemUserData {
  return {
    ...item,
    tags: [...item.tags],
    progress: item.progress ? { ...item.progress } : undefined,
    customFields: item.customFields.map((field) => ({ ...field })),
  };
}

function createBaseListsState(): ListsState {
  const seed = createPowerUserMockSeed();

  return {
    version: 5,
    lists: hydrateListHierarchy(seed.lists.map(cloneList)),
    deletedLists: hydrateListHierarchy(seed.deletedLists.map(cloneList)),
    savedTemplates: seed.savedTemplates.map(cloneTemplate),
    itemUserDataByKey: Object.fromEntries(
      Object.entries(seed.itemUserDataByKey).map(([key, item]) => [key, cloneItemUserData(item)])
    ),
    recentSearches: [...seed.recentSearches],
    recentListIds: [...seed.recentListIds],
    reminderNotificationIds: {},
  };
}

function updateListTitles(
  state: ListsState,
  titlesById: Record<string, { title: string; description?: string }>
) {
  const applyUpdates = (list: ListsState['lists'][number]) => {
    const updates = titlesById[list.id];
    if (!updates) {
      return list;
    }

    return {
      ...list,
      title: updates.title,
      description: updates.description ?? list.description,
      updatedAt: Date.now(),
    };
  };

  state.lists = hydrateListHierarchy(state.lists.map(applyUpdates));
  state.deletedLists = hydrateListHierarchy(state.deletedLists.map(applyUpdates));
}

function updateListPreferences(
  state: ListsState,
  preferencesById: Record<string, ReturnType<typeof createListPreferences>>
) {
  state.lists = hydrateListHierarchy(
    state.lists.map((list) =>
      preferencesById[list.id]
        ? {
            ...list,
            preferences: { ...preferencesById[list.id] },
          }
        : list
    )
  );
}

function createCreatorLabSeed(): MockTestAccountSeed {
  const listsState = createBaseListsState();

  updateListTitles(listsState, {
    'list-mock-watch-queue': {
      title: 'Festival Watchlist',
      description: 'Cuts to screen before the next round of content planning.',
    },
    'list-mock-reading-stack': {
      title: 'Story Research Shelf',
      description: 'Books and manga references feeding the next video script cycle.',
    },
    'list-mock-wishlist': {
      title: 'Studio Gear Wishlist',
      description: 'Capture cards, desk audio, and other setup upgrades worth pricing out.',
    },
    'list-mock-home-projects': {
      title: 'Creator Pipeline',
      description: 'Launch prep, upload operations, and short-run production work.',
    },
    'list-mock-pantry-reset': {
      title: 'Upload Checklist',
      description: 'The repeatable publish flow for each launch window.',
    },
    'list-mock-gallery-wall': {
      title: 'Trailer Shot List',
      description: 'Visual ideas and pickup shots for the next teaser edit.',
    },
    'list-mock-takeout-tier': {
      title: 'Coffee Run Tier List',
      description: 'Fast rankings for cafes that survive long edit days.',
    },
    'list-mock-reading-challenge-2025': {
      title: '2025 Client Launches',
      description: 'Archived planning board from the last batch of sponsored drops.',
    },
    'list-mock-gift-ideas-2025': {
      title: 'Brand Pitch Ideas',
      description: 'Deleted after the sponsor shortlist was finalized.',
    },
  });

  updateListPreferences(listsState, {
    'list-mock-home-projects': createListPreferences({
      groupMode: 'status',
      sortMode: 'updated-desc',
    }),
    'list-mock-takeout-tier': createListPreferences({
      viewMode: 'tier',
    }),
  });

  listsState.recentSearches = ['sony fx30', 'wireless lav mic', 'festival shorts', 'storyboarding'];
  listsState.recentListIds = [
    'list-mock-home-projects',
    'list-mock-watch-queue',
    'list-mock-wishlist',
    'list-mock-reading-stack',
    'list-mock-takeout-tier',
  ];

  return {
    onboardingState: {
      version: 1,
      profile: {
        displayName: 'Avery Stone',
        birthDate: '1994-08-19',
        avatarUri: null,
        interests: ['tv-movies', 'anime', 'books', 'projects'],
      },
      completedAt: BASE_COMPLETED_AT,
    },
    listsState,
    communityFeed: [
      {
        id: 'avery-launch-day',
        author: 'Avery Stone',
        handle: '@averystone.lab',
        timeAgo: '4m ago',
        body:
          'Locked the final cut after six export passes. Leaving the rough edges in was the right call.',
        likesLabel: '824 boosts',
        repliesLabel: '41 replies',
        avatarGradient: ['#ffcc9f', '#cb6b4c'],
      },
      {
        id: 'noa-bts-rig',
        author: 'Noa Kim',
        handle: '@noaedits',
        timeAgo: '18m ago',
        body:
          'Swapped the desk mic arm and my whole edit setup suddenly feels one year newer.',
        likesLabel: '512 boosts',
        repliesLabel: '19 replies',
        avatarGradient: ['#9ad8ff', '#2667a8'],
      },
      {
        id: 'rory-shoot-list',
        author: 'Rory Lane',
        handle: '@storyrory',
        timeAgo: '42m ago',
        body:
          'Shot list trick: if the pickup feels optional, schedule it anyway. Future-you always wants it.',
        likesLabel: '1.2K boosts',
        repliesLabel: '88 replies',
        avatarGradient: ['#ffd86f', '#f38b2d'],
      },
    ],
  };
}

function createWeekendResetSeed(): MockTestAccountSeed {
  const listsState = createBaseListsState();

  updateListTitles(listsState, {
    'list-mock-watch-queue': {
      title: 'Meal Rotation',
      description: 'Weeknight favorites that stay easy enough to repeat.',
    },
    'list-mock-reading-stack': {
      title: 'Weekend Reads',
      description: 'A softer reading stack for slow mornings and transit time.',
    },
    'list-mock-wishlist': {
      title: 'Apartment Wishlist',
      description: 'Furniture, kitchen tools, and little upgrades worth saving for.',
    },
    'list-mock-home-projects': {
      title: 'Spring Reset',
      description: 'Apartment chores and small projects grouped into one running plan.',
    },
    'list-mock-pantry-reset': {
      title: 'Sunday Prep',
      description: 'Prep steps that make Monday feel easier before it starts.',
    },
    'list-mock-gallery-wall': {
      title: 'Guest Room Refresh',
      description: 'Low-lift refresh list before family visits next month.',
    },
    'list-mock-takeout-tier': {
      title: 'Neighborhood Bakery Tier List',
      description: 'A running argument about pastry stops within walking distance.',
    },
    'list-mock-reading-challenge-2025': {
      title: '2025 Seasonal Goals',
      description: 'Archived after the winter reset wrapped.',
    },
    'list-mock-gift-ideas-2025': {
      title: 'Holiday Hosting Ideas',
      description: 'Deleted once the guest list and menu were final.',
    },
  });

  updateListPreferences(listsState, {
    'list-mock-home-projects': createListPreferences({
      groupMode: 'status',
      filterMode: 'all',
    }),
    'list-mock-reading-stack': createListPreferences({
      sortMode: 'updated-desc',
    }),
  });

  listsState.recentSearches = ['sheet pan dinners', 'entryway bench', 'spring cleaning', 'matcha'];
  listsState.recentListIds = [
    'list-mock-home-projects',
    'list-mock-watch-queue',
    'list-mock-reading-stack',
    'list-mock-wishlist',
    'list-mock-pantry-reset',
  ];

  return {
    onboardingState: {
      version: 1,
      profile: {
        displayName: 'Mina Park',
        birthDate: '1991-03-02',
        avatarUri: null,
        interests: ['recipes', 'books', 'projects', 'tier-lists'],
      },
      completedAt: BASE_COMPLETED_AT + 3_600_000,
    },
    listsState,
    communityFeed: [
      {
        id: 'mina-sunday-prep',
        author: 'Mina Park',
        handle: '@minapark.home',
        timeAgo: '7m ago',
        body:
          'Chopped everything for tomorrow tonight, and that already feels like cheating in the best way.',
        likesLabel: '684 boosts',
        repliesLabel: '32 replies',
        avatarGradient: ['#f8d3a8', '#c97948'],
      },
      {
        id: 'lea-window-clean',
        author: 'Lea Flores',
        handle: '@leaflows',
        timeAgo: '21m ago',
        body:
          'Opened every window for twenty minutes, reset the whole apartment, and instantly wanted to keep going.',
        likesLabel: '933 boosts',
        repliesLabel: '57 replies',
        avatarGradient: ['#c6f0c0', '#5f9e5f'],
      },
      {
        id: 'omar-bakery-tier',
        author: 'Omar Cho',
        handle: '@omarwalks',
        timeAgo: '1h ago',
        body:
          'Controversial take: the place with the best coffee still has the third-best croissant.',
        likesLabel: '1.5K boosts',
        repliesLabel: '146 replies',
        avatarGradient: ['#ffd59e', '#b96a35'],
      },
    ],
  };
}

export function createInitialMockTestAccountSeeds(): Record<MockTestAccountId, MockTestAccountSeed> {
  return {
    'creator-lab': createCreatorLabSeed(),
    'weekend-reset': createWeekendResetSeed(),
  };
}
