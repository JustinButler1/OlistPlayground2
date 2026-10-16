import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionScope } from '../lib/session-scope';

const state = vi.hoisted(() => ({
  auth: {
    isLoaded: true,
    isSignedIn: false,
    userId: null as string | null,
    sessionId: null as string | null,
  },
  verified: true,
  cleanup: vi.fn(async () => {}),
  clearPosts: vi.fn(),
  close: vi.fn(),
  signOut: vi.fn(),
  legacyRead: vi.fn(),
}));
vi.mock('@clerk/expo', () => ({
  ClerkProvider: ({ children }: any) => children,
  useAuth: () => state.auth,
  useClerk: () => ({ signOut: state.signOut }),
}));
vi.mock('@clerk/expo/token-cache', () => ({ tokenCache: {} }));
vi.mock('react-native', () => ({
  ActivityIndicator: 'Loading',
  Button: 'Button',
  Text: 'Text',
  View: 'View',
}));
vi.mock('convex/react', () => ({
  ConvexReactClient: class {
    close = state.close;
  },
  useConvexAuth: () => ({ isAuthenticated: state.verified, isLoading: false }),
}));
vi.mock('convex/react-clerk', () => ({
  ConvexProviderWithClerk: ({ children }: any) => children,
}));
vi.mock('../components/sign-in', () => ({
  default: () => React.createElement('SignIn'),
}));
vi.mock('../lib/reminders', () => ({ clearDeviceReminders: state.cleanup }));
vi.mock('../lib/community-posts-store', () => ({
  clearCreatedCommunityPosts: state.clearPosts,
}));
vi.mock('expo-sqlite/kv-store', () => ({
  default: { getItem: state.legacyRead, setItem: vi.fn() },
}));
import { AuthSession } from '../components/auth-session';
import { useSessionScope } from '../contexts/session-context';
import {
  TestAccountsProvider,
  useTestAccounts,
} from '../contexts/test-accounts-context';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('session isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_fixture';
    process.env.EXPO_PUBLIC_CONVEX_URL = 'https://fixture.convex.cloud';
    state.auth = {
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
    };
    state.verified = true;
    state.cleanup.mockResolvedValue(undefined);
  });

  it('gates protected children, clears A state on sign-out, and mounts fresh caches/state for B', async () => {
    const captures: {
      user: string | null;
      scope: SessionScope;
      queries: QueryClient;
      draft: string;
    }[] = [];
    function PrivateScreen() {
      const scope = useSessionScope();
      const queries = useQueryClient();
      const [draft] = useState(() => `draft-${state.auth.userId}`);
      captures.push({ user: state.auth.userId, scope, queries, draft });
      return React.createElement('Private', { draft });
    }
    const tree = () =>
      React.createElement(
        AuthSession,
        null,
        React.createElement(PrivateScreen),
      );
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(tree());
    });
    expect(captures).toHaveLength(0);
    expect(root.root.findAllByType('SignIn' as any)).toHaveLength(1);
    state.auth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'A',
      sessionId: 'session-A',
    };
    await act(async () => {
      root.update(tree());
    });
    const A = captures.at(-1)!;
    A.queries.setQueryData(['private'], 'A secret');
    let resolve!: (value: string) => void;
    const late = A.scope.run(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    const rejected = expect(late).rejects.toThrow('Session ended');
    state.auth = {
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
    };
    await act(async () => {
      root.update(tree());
    });
    expect(A.scope.signal.aborted).toBe(true);
    expect(A.queries.getQueryData(['private'])).toBeUndefined();
    expect(state.close).toHaveBeenCalledTimes(1);
    expect(state.clearPosts).toHaveBeenCalledTimes(1);
    expect(root.root.findAllByType('Private' as any)).toHaveLength(0);
    resolve('late A response');
    await rejected;
    const pendingWrite = vi.fn(async () => 'write');
    await expect(A.scope.run(pendingWrite)).rejects.toThrow('Session ended');
    expect(pendingWrite).not.toHaveBeenCalled();
    state.auth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'B',
      sessionId: 'session-B',
    };
    await act(async () => {
      root.update(tree());
    });
    const B = captures.at(-1)!;
    expect(B.scope).not.toBe(A.scope);
    expect(B.queries).not.toBe(A.queries);
    expect(B.queries.getQueryData(['private'])).toBeUndefined();
    expect(B.draft).toBe('draft-B');
    expect(state.cleanup).toHaveBeenCalled();
    expect(state.legacyRead).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it('isolates direct A-to-B account changes and waits for reminder cleanup before showing private data', async () => {
    let release!: () => void;
    state.cleanup.mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    state.auth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'A',
      sessionId: 'A',
    };
    const mounts: SessionScope[] = [];
    function Probe() {
      mounts.push(useSessionScope());
      return React.createElement('Private');
    }
    const tree = () =>
      React.createElement(AuthSession, null, React.createElement(Probe));
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(tree());
    });
    expect(mounts).toHaveLength(0);
    await act(async () => {
      release();
    });
    const A = mounts.at(-1)!;
    state.auth = { ...state.auth, userId: 'B', sessionId: 'B' };
    await act(async () => {
      root.update(tree());
    });
    expect(A.signal.aborted).toBe(true);
    expect(mounts.at(-1)).not.toBe(A);
    await act(async () => {
      root.unmount();
    });
  });

  it('never mounts protected data for an unverified Convex identity or failed reminder cleanup', async () => {
    state.auth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'A',
      sessionId: 'A',
    };
    state.verified = false;
    let root!: ReactTestRenderer;
    const tree = () =>
      React.createElement(AuthSession, null, React.createElement('Private'));
    await act(async () => {
      root = create(tree());
    });
    expect(root.root.findAllByType('Private' as any)).toHaveLength(0);
    await act(async () => {
      root.unmount();
    });
    state.verified = true;
    state.cleanup.mockRejectedValueOnce(new Error('device failure'));
    await act(async () => {
      root = create(tree());
    });
    expect(root.root.findAllByType('Private' as any)).toHaveLength(0);
    await act(async () => {
      root.root.findByProps({ title: 'Retry' }).props.onPress();
    });
    expect(root.root.findAllByType('Private' as any)).toHaveLength(1);
    await act(async () => {
      root.unmount();
    });
  });

  it('ignores persisted mock selections and cannot switch away from the Clerk-backed account', async () => {
    state.auth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'A',
      sessionId: 'A',
    };
    let account!: ReturnType<typeof useTestAccounts>;
    function Probe() {
      account = useTestAccounts();
      return null;
    }
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(
        React.createElement(
          TestAccountsProvider,
          null,
          React.createElement(Probe),
        ),
      );
    });
    expect(account.accounts).toHaveLength(1);
    expect(account.activeAccount.profileId).toBe('A');
    expect(account.activeMockAccountSeed).toBeNull();
    await expect(account.switchAccount('creator-lab')).rejects.toThrow(
      'disabled',
    );
    expect(state.legacyRead).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it('creates usable replacement resources during Strict Mode effect replay', async () => {
    state.auth = {
      isLoaded: true,
      isSignedIn: true,
      userId: 'A',
      sessionId: 'A',
    };
    let scope!: SessionScope;
    function Probe() {
      scope = useSessionScope();
      return React.createElement('Private');
    }
    let root!: ReactTestRenderer;
    await act(async () => {
      root = create(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(AuthSession, null, React.createElement(Probe)),
        ),
      );
    });
    expect(root.root.findAllByType('Private' as any)).toHaveLength(1);
    expect(scope.signal.aborted).toBe(false);
    await expect(scope.run(async () => 'active')).resolves.toBe('active');
    await act(async () => {
      root.unmount();
    });
  });
});
