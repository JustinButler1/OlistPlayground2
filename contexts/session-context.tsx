import { createContext, useCallback, useContext } from 'react';
import { useMutation } from 'convex/react';
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from 'convex/server';
import { SessionScope } from '@/lib/session-scope';

export const SessionContext = createContext<SessionScope | null>(null);
export function useSessionScope() {
  const scope = useContext(SessionContext);
  if (!scope) throw new Error('Session required');
  return scope;
}
export function useSessionMutation<M extends FunctionReference<'mutation'>>(
  reference: M,
) {
  const mutation = useMutation(reference);
  const scope = useSessionScope();
  return useCallback(
    (args: FunctionArgs<M>): Promise<FunctionReturnType<M>> =>
      scope.run(() => mutation(args)),
    [mutation, scope],
  );
}
