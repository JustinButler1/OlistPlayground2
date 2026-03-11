import SQLiteAsyncStorage from 'expo-sqlite/kv-store';

import {
  ONBOARDING_INTEREST_IDS,
  type OnboardingInterestId,
} from '@/constants/onboarding';

const STORAGE_KEY = 'profile-onboarding-v1';

export interface OnboardingProfileState {
  displayName: string;
  birthDate: string | null;
  avatarUri: string | null;
  interests: OnboardingInterestId[];
}

export interface OnboardingState {
  version: 1;
  profile: OnboardingProfileState;
  completedAt: number | null;
}

function normalizeInterests(value: unknown): OnboardingInterestId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((item): item is OnboardingInterestId =>
        typeof item === 'string' &&
        (ONBOARDING_INTEREST_IDS as readonly string[]).includes(item)
      )
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOnboardingState(value: unknown): OnboardingState | null {
  if (!isRecord(value) || !isRecord(value.profile)) {
    return null;
  }

  return {
    version: 1,
    profile: {
      displayName: typeof value.profile.displayName === 'string' ? value.profile.displayName : '',
      birthDate:
        typeof value.profile.birthDate === 'string' ? value.profile.birthDate : null,
      avatarUri:
        typeof value.profile.avatarUri === 'string' ? value.profile.avatarUri : null,
      interests: normalizeInterests(value.profile.interests),
    },
    completedAt: typeof value.completedAt === 'number' ? value.completedAt : null,
  };
}

export function createInitialOnboardingState(): OnboardingState {
  return {
    version: 1,
    profile: {
      displayName: '',
      birthDate: null,
      avatarUri: null,
      interests: [],
    },
    completedAt: null,
  };
}

export function cloneOnboardingState(state: OnboardingState): OnboardingState {
  return {
    ...state,
    profile: {
      ...state.profile,
      interests: [...state.profile.interests],
    },
  };
}

export async function loadOnboardingState(): Promise<OnboardingState | null> {
  try {
    const raw = await SQLiteAsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return normalizeOnboardingState(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load onboarding state', error);
    return null;
  }
}

export async function saveOnboardingState(state: OnboardingState): Promise<void> {
  try {
    await SQLiteAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save onboarding state', error);
  }
}

export async function clearOnboardingState(): Promise<void> {
  try {
    await SQLiteAsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear onboarding state', error);
  }
}
