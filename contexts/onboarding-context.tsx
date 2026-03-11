import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { OnboardingInterestId } from '@/constants/onboarding';
import {
  clearOnboardingState,
  cloneOnboardingState,
  createInitialOnboardingState,
  loadOnboardingState,
  saveOnboardingState,
  type OnboardingState,
} from '@/lib/onboarding-storage';

interface OnboardingContextValue {
  state: OnboardingState;
  isHydrated: boolean;
  isComplete: boolean;
  setDisplayName: (value: string) => void;
  setBirthDate: (value: string | null) => void;
  setAvatarUri: (value: string | null) => void;
  toggleInterest: (value: OnboardingInterestId) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createInitialOnboardingState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const stored = await loadOnboardingState();
      if (stored && isMounted) {
        setState(stored);
      }

      if (isMounted) {
        setIsHydrated(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void saveOnboardingState(state);
  }, [isHydrated, state]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      isHydrated,
      isComplete: !!state.completedAt,
      setDisplayName: (displayName) => {
        setState((current) => ({
          ...current,
          profile: {
            ...current.profile,
            displayName,
          },
        }));
      },
      setBirthDate: (birthDate) => {
        setState((current) => ({
          ...current,
          profile: {
            ...current.profile,
            birthDate,
          },
        }));
      },
      setAvatarUri: (avatarUri) => {
        setState((current) => ({
          ...current,
          profile: {
            ...current.profile,
            avatarUri,
          },
        }));
      },
      toggleInterest: (interestId) => {
        setState((current) => {
          const hasInterest = current.profile.interests.includes(interestId);
          return {
            ...current,
            profile: {
              ...current.profile,
              interests: hasInterest
                ? current.profile.interests.filter((item) => item !== interestId)
                : [...current.profile.interests, interestId],
            },
          };
        });
      },
      completeOnboarding: () => {
        setState((current) => ({
          ...current,
          completedAt: Date.now(),
        }));
      },
      resetOnboarding: () => {
        const nextState = createInitialOnboardingState();
        setState(nextState);
        void clearOnboardingState();
      },
    }),
    [isHydrated, state]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

function useOnboardingContext(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }

  return context;
}

export function useOnboarding() {
  const context = useOnboardingContext();

  return {
    ...context,
    state: cloneOnboardingState(context.state),
  };
}
