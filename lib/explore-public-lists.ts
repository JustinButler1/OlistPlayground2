import {
  ONBOARDING_INTEREST_OPTIONS,
  type OnboardingInterestId,
} from '@/constants/onboarding';
import type { EntrySourceType, ListEntryType, TrackerList } from '@/data/mock-lists';
import type { TestAccountId } from '@/data/test-accounts';
import { getListStats } from '@/lib/tracker-selectors';

const MEDIA_SECTION_BY_ENTRY_TYPE: Partial<
  Record<ListEntryType | EntrySourceType, OnboardingInterestId>
> = {
  anime: 'anime',
  manga: 'manga',
  book: 'books',
  movie: 'tv-movies',
  tv: 'tv-movies',
} satisfies Partial<Record<TrackerList['entries'][number]['type'], OnboardingInterestId>>;

const RECIPE_KEYWORDS = [
  'bakery',
  'breakfast',
  'cafe',
  'coffee',
  'cook',
  'food',
  'kitchen',
  'meal',
  'pantry',
  'pastry',
  'prep',
  'recipe',
  'takeout',
];

const PROJECT_KEYWORDS = [
  'apartment',
  'brand',
  'checklist',
  'client',
  'creator',
  'desk',
  'edit',
  'gallery',
  'gear',
  'guest room',
  'holiday',
  'hosting',
  'launch',
  'office',
  'pitch',
  'project',
  'refresh',
  'reset',
  'shot',
  'spring',
  'studio',
  'wishlist',
  'work',
];

const SECTION_METADATA: Record<
  OnboardingInterestId,
  { slug: string; subtitle: string }
> = {
  anime: {
    slug: 'anime-lists',
    subtitle: 'Public anime lists from the seeded accounts.',
  },
  manga: {
    slug: 'manga-lists',
    subtitle: 'Public manga lists from the seeded accounts.',
  },
  'tv-movies': {
    slug: 'tv-movie-lists',
    subtitle: 'Public TV and movie lists from the seeded accounts.',
  },
  books: {
    slug: 'book-lists',
    subtitle: 'Public reading lists from the seeded accounts.',
  },
  projects: {
    slug: 'project-lists',
    subtitle: 'Planning, wishlist, and project lists that are publicly visible.',
  },
  recipes: {
    slug: 'food-lists',
    subtitle: 'Food, prep, and recipe-adjacent public lists.',
  },
  'tier-lists': {
    slug: 'tier-lists',
    subtitle: 'Ranked public lists built with tier layouts or linked sublists.',
  },
};

export interface ExplorePublicListOwner {
  accountId: TestAccountId;
  profileId: string;
  displayName: string;
  handle: string;
}

export interface ExplorePublicListItem {
  id: string;
  owner: ExplorePublicListOwner;
  list: TrackerList;
  sectionId: OnboardingInterestId;
}

export interface ExplorePublicListSection {
  id: OnboardingInterestId;
  slug: string;
  title: string;
  subtitle: string;
  items: ExplorePublicListItem[];
}

export interface ExploreAccountSnapshot {
  owner: ExplorePublicListOwner;
  lists: TrackerList[];
}

function getDominantMediaSection(list: TrackerList): OnboardingInterestId | null {
  const counts = new Map<OnboardingInterestId, number>();

  list.entries.forEach((entry) => {
    if (entry.archivedAt) {
      return;
    }

    const sectionId = MEDIA_SECTION_BY_ENTRY_TYPE[entry.type];
    if (!sectionId) {
      return;
    }

    counts.set(sectionId, (counts.get(sectionId) ?? 0) + 1);
  });

  const sortedCounts = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  if (sortedCounts[0]?.[1]) {
    return sortedCounts[0][0];
  }

  const fallbackType = MEDIA_SECTION_BY_ENTRY_TYPE[list.config.defaultEntryType];
  return fallbackType ?? null;
}

function includesKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function isPublicExploreList(list: TrackerList) {
  return list.privacy === 'public' && !!list.showInMyLists && !list.archivedAt && !list.deletedAt;
}

export function getPrimaryExploreSectionId(list: TrackerList): OnboardingInterestId {
  if (list.preferences.viewMode === 'tier' || list.config.addons.includes('tier')) {
    return 'tier-lists';
  }

  const mediaSection = getDominantMediaSection(list);
  if (mediaSection) {
    return mediaSection;
  }

  const normalizedText = [list.title, list.description, ...list.tags].join(' ').toLowerCase();

  if (includesKeyword(normalizedText, RECIPE_KEYWORDS)) {
    return 'recipes';
  }

  if (
    includesKeyword(normalizedText, PROJECT_KEYWORDS) ||
    list.config.addons.includes('custom-fields') ||
    list.config.addons.includes('reminders') ||
    list.config.addons.includes('sublists')
  ) {
    return 'projects';
  }

  return 'projects';
}

function compareExploreItems(left: ExplorePublicListItem, right: ExplorePublicListItem) {
  if (!!right.list.pinnedToProfile !== !!left.list.pinnedToProfile) {
    return Number(!!right.list.pinnedToProfile) - Number(!!left.list.pinnedToProfile);
  }

  const leftStats = getListStats(left.list);
  const rightStats = getListStats(right.list);
  if (rightStats.total !== leftStats.total) {
    return rightStats.total - leftStats.total;
  }

  return right.list.updatedAt - left.list.updatedAt;
}

export function buildExplorePublicListSections(
  accounts: ExploreAccountSnapshot[]
): ExplorePublicListSection[] {
  const itemsBySection = new Map<OnboardingInterestId, ExplorePublicListItem[]>();

  accounts.forEach(({ owner, lists }) => {
    lists.filter(isPublicExploreList).forEach((list) => {
      const sectionId = getPrimaryExploreSectionId(list);
      const nextItems = itemsBySection.get(sectionId) ?? [];
      nextItems.push({
        id: `${owner.accountId}:${list.id}`,
        owner,
        list,
        sectionId,
      });
      itemsBySection.set(sectionId, nextItems);
    });
  });

  const sections: ExplorePublicListSection[] = [];

  ONBOARDING_INTEREST_OPTIONS.forEach((option) => {
    const items = [...(itemsBySection.get(option.id) ?? [])].sort(compareExploreItems);
    if (!items.length) {
      return;
    }

    const metadata = SECTION_METADATA[option.id];
    sections.push({
      id: option.id,
      slug: metadata.slug,
      title: option.label,
      subtitle: metadata.subtitle,
      items,
    });
  });

  return sections;
}

export function getExploreSectionBySlug(
  sections: ExplorePublicListSection[],
  sectionSlug: string
) {
  return sections.find((section) => section.slug === sectionSlug);
}
