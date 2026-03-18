import { useMemo } from 'react';

import { useTestAccounts } from '@/contexts/test-accounts-context';
import type { TrackerList } from '@/data/mock-lists';
import type { MockTestAccountId, TestAccountDefinition } from '@/data/test-accounts';
import type { ExplorePublicListOwner } from '@/lib/explore-public-lists';
import type { OnboardingState } from '@/lib/onboarding-storage';
import { useConvexWorkspaceBootstrap } from '@/lib/convex-bootstrap';

export interface AccountSnapshot {
  account: TestAccountDefinition;
  owner: ExplorePublicListOwner;
  lists: TrackerList[];
  onboardingState: OnboardingState | null;
}

export function useAccountSnapshots() {
  const { accounts, mockAccountSeeds } = useTestAccounts();
  const { snapshot } = useConvexWorkspaceBootstrap();

  return useMemo(
    () =>
      accounts.flatMap((account) => {
        if (account.kind === 'mock') {
          const seed = mockAccountSeeds[account.id as MockTestAccountId];
          if (!seed) {
            return [];
          }

          const displayName =
            seed.onboardingState.profile.displayName.trim() || account.defaultDisplayName;

          return [
            {
              account,
              owner: {
                accountId: account.id,
                profileId: account.profileId,
                displayName,
                handle: account.handle,
              },
              lists: seed.listsState.lists,
              onboardingState: seed.onboardingState,
            } satisfies AccountSnapshot,
          ];
        }

        if (!snapshot) {
          return [];
        }

        const displayName =
          snapshot.onboardingState.profile.displayName.trim() || account.defaultDisplayName;

        return [
          {
            account,
            owner: {
              accountId: account.id,
              profileId: account.profileId,
              displayName,
              handle: account.handle,
            },
            lists: snapshot.listsState.lists,
            onboardingState: snapshot.onboardingState,
          } satisfies AccountSnapshot,
        ];
      }),
    [accounts, mockAccountSeeds, snapshot]
  );
}
