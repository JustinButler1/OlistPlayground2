export interface ExploreSection {
  title: string;
  slug: string;
  items: string[];
}

function createItems(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => `${prefix} ${String(index + 1).padStart(2, '0')}`);
}

export const MOCK_EXPLORE_SECTIONS: ExploreSection[] = [
  {
    title: 'Things You Might Like',
    slug: 'things-you-might-like',
    items: createItems('Weekend Queue', 4),
  },
  {
    title: 'Near You',
    slug: 'near-you',
    items: createItems('Local Favorite', 6),
  },
  {
    title: 'More Anime',
    slug: 'more-anime',
    items: createItems('Anime Pick', 8),
  },
  {
    title: 'More Books',
    slug: 'more-books',
    items: createItems('Book Pick', 12),
  },
  {
    title: 'More TV/Movies',
    slug: 'more-tv-movies',
    items: createItems('Screen Pick', 18),
  },
];

export function getExploreSectionBySlug(sectionSlug: string) {
  return MOCK_EXPLORE_SECTIONS.find((section) => section.slug === sectionSlug);
}
