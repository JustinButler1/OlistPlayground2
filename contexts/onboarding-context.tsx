import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useConvex, useMutation } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { ONBOARDING_INTEREST_IDS, type OnboardingInterestId } from '@/constants/onboarding';
import { useConvexWorkspaceBootstrap } from '@/lib/convex-bootstrap';
import { uploadImageToConvex } from '@/lib/convex-upload';
import {
  cloneOnboardingState,
  createInitialOnboardingState,
  type OnboardingState,
} from '@/lib/onboarding-storage';

interface OnboardingContextValue {
  state: OnboardingState;
  isHydrated: boolean;
  isComplete: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
  dataSource: 'convex';
  setDisplayName: (value: string) => Promise<void>;
  setBirthDate: (value: string | null) => Promise<void>;
  setAvatarUri: (value: string | null) => Promise<void>;
  toggleInterest: (value: OnboardingInterestId) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const { snapshot, isBootstrapping, lastBootstrapError } = useConvexWorkspaceBootstrap();
  const updateProfile = useMutation(api.onboarding.updateProfile);
  const complete = useMutation(api.onboarding.complete);
  const reset = useMutation(api.onboarding.reset);
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const attachAvatar = useMutation(api.media.attachAvatar);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const typedState = snapshot
    ? {
        ...snapshot.onboardingState,
        profile: {
          ...snapshot.onboardingState.profile,
          interests: snapshot.onboardingState.profile.interests.filter(
            (interest): interest is OnboardingInterestId =>
              (ONBOARDING_INTEREST_IDS as readonly string[]).includes(interest)
          ),
        },
      }
    : createInitialOnboardingState();

  const state = typedState;

  const runMutation = async (task: () => Promise<unknown>) => {
    setPendingMutations((current) => current + 1);
    setLastSyncError(null);
    try {
      await task();
    } catch (error) {
      setLastSyncError(error instanceof Error ? error.message : 'Sync failed.');
      throw error;
    } finally {
      setPendingMutations((current) => current - 1);
    }
  };

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      isHydrated: snapshot !== undefined,
      isComplete: !!state.completedAt,
      isSyncing: isBootstrapping || pendingMutations > 0,
      lastSyncError: lastSyncError ?? lastBootstrapError,
      dataSource: 'convex',
      setDisplayName: async (displayName) => {
        await runMutation(() => updateProfile({ displayName }));
      },
      setBirthDate: async (birthDate) => {
        await runMutation(() => updateProfile({ birthDate }));
      },
      setAvatarUri: async (avatarUri) => {
        await runMutation(async () => {
          if (!avatarUri) {
            await updateProfile({ clearAvatar: true });
            return;
          }

          const uploaded = await uploadImageToConvex({
            uri: avatarUri,
            generateUploadUrl: () => generateUploadUrl({}),
            resolveUrl: (storageId) => convex.query(api.media.getResolvedUrl, { storageId }),
          });
          await attachAvatar({
            storageId: uploaded.storageId,
            mimeType: uploaded.mimeType,
            fileName: uploaded.fileName,
          });
        });
      },
      toggleInterest: async (interestId) => {
        await runMutation(async () => {
          const hasInterest = state.profile.interests.includes(interestId);
          await updateProfile({
            interests: hasInterest
              ? state.profile.interests.filter((item) => item !== interestId)
              : [...state.profile.interests, interestId],
          });
        });
      },
      completeOnboarding: async () => {
        await runMutation(() => complete({}));
      },
      resetOnboarding: async () => {
        await runMutation(() => reset({}));
      },
    }),
    [
      attachAvatar,
      complete,
      convex,
      generateUploadUrl,
      isBootstrapping,
      lastBootstrapError,
      lastSyncError,
      pendingMutations,
      snapshot,
      state,
      updateProfile,
      reset,
    ]
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
