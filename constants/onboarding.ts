export const ONBOARDING_INTEREST_OPTIONS = [
  {
    id: 'anime',
    label: 'Anime',
    description: 'Track series, seasons, and rewatches.',
  },
  {
    id: 'manga',
    label: 'Manga',
    description: 'Keep up with chapters, volumes, and reading lists.',
  },
  {
    id: 'tv-movies',
    label: 'TV & Movies',
    description: 'Organize watchlists, favorites, and marathons.',
  },
  {
    id: 'books',
    label: 'Books',
    description: 'Save TBR piles, finished reads, and genres.',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Track personal builds, plans, and recurring work.',
  },
  {
    id: 'recipes',
    label: 'Recipes',
    description: 'Collect dishes you want to try or repeat.',
  },
  {
    id: 'tier-lists',
    label: 'Tier Lists',
    description: 'Rank favorites, experiments, and opinions.',
  },
] as const;

export type OnboardingInterestId = (typeof ONBOARDING_INTEREST_OPTIONS)[number]['id'];

export const ONBOARDING_INTEREST_IDS = ONBOARDING_INTEREST_OPTIONS.map((item) => item.id);

export const ONBOARDING_STEP_LABELS = ['Intro', 'Profile', 'Birthday', 'Interests', 'Pro'] as const;
