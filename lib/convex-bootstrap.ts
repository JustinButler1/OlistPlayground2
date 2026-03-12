import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { clearListsState, loadListsStateForImport } from '@/lib/lists-storage';
import {
  clearOnboardingState,
  loadOnboardingState,
} from '@/lib/onboarding-storage';

let ensureWorkspacePromise: Promise<unknown> | null = null;
let legacyImportPromise: Promise<unknown> | null = null;
let legacyImportAttempted = false;

export function useConvexWorkspaceBootstrap() {
  const snapshot = useQuery(api.workspace.getSnapshot, {});
  const ensureWorkspace = useMutation(api.bootstrap.ensureWorkspace);
  const importLegacyLocalState = useMutation(api.bootstrap.importLegacyLocalState);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [lastBootstrapError, setLastBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!ensureWorkspacePromise) {
      setIsBootstrapping(true);
      ensureWorkspacePromise = ensureWorkspace({})
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Failed to initialize Convex.';
          if (isMounted) {
            setLastBootstrapError(message);
          }
          throw error;
        })
        .finally(() => {
          if (isMounted) {
            setIsBootstrapping(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [ensureWorkspace]);

  useEffect(() => {
    let isMounted = true;

    if (!snapshot || !snapshot.isEmpty || legacyImportAttempted || legacyImportPromise) {
      return () => {
        isMounted = false;
      };
    }

    legacyImportAttempted = true;
    setIsBootstrapping(true);
    legacyImportPromise = (async () => {
      const [listsState, onboardingState] = await Promise.all([
        loadListsStateForImport(),
        loadOnboardingState(),
      ]);
      const hasLegacyState =
        !!listsState ||
        (!!onboardingState &&
          (!!onboardingState.profile.displayName.trim() ||
            !!onboardingState.profile.birthDate ||
            !!onboardingState.profile.avatarUri ||
            onboardingState.profile.interests.length > 0 ||
            !!onboardingState.completedAt));

      if (!hasLegacyState) {
        return;
      }

      const result = await importLegacyLocalState({
        listsState: listsState ?? undefined,
        onboardingState: onboardingState ?? undefined,
      });

      if (result.migrationNotes?.length) {
        console.warn('Legacy import notes', result.migrationNotes);
      }

      await Promise.all([clearListsState(), clearOnboardingState()]);
    })()
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Failed to import legacy data.';
        if (isMounted) {
          setLastBootstrapError(message);
        }
      })
      .finally(() => {
        legacyImportPromise = null;
        if (isMounted) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [importLegacyLocalState, snapshot]);

  return {
    snapshot,
    isBootstrapping,
    lastBootstrapError,
  };
}
