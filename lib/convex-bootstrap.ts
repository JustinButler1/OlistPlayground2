import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useConvexWorkspaceBootstrap() {
  const snapshot = useQuery(api.workspace.getSnapshot, {});
  const ensureWorkspace = useMutation(api.bootstrap.ensureWorkspace);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [lastBootstrapError, setLastBootstrapError] = useState<string | null>(
    null,
  );
  useEffect(() => {
    let mounted = true;
    void ensureWorkspace({})
      .catch((error: unknown) => {
        if (mounted)
          setLastBootstrapError(
            error instanceof Error ? error.message : 'Initialization failed.',
          );
      })
      .finally(() => {
        if (mounted) setIsBootstrapping(false);
      });
    return () => {
      mounted = false;
    };
  }, [ensureWorkspace]);
  // Device legacy data is intentionally neither read nor imported.
  return { snapshot, isBootstrapping, lastBootstrapError };
}
