import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { getFunctionName } from 'convex/server';

const spies = vi.hoisted(() => ({
  ensure: vi.fn(async () => ({})),
  importLegacy: vi.fn(async () => ({})),
  loadLists: vi.fn(async () => ({ lists: [{ title: 'legacy A data' }] })),
  loadProfile: vi.fn(async () => ({ profile: { displayName: 'legacy A' } })),
}));
vi.mock('convex/react', () => ({
  useQuery: () => ({ isEmpty: true }),
  useMutation: (reference: any) =>
    getFunctionName(reference) === 'bootstrap:ensureWorkspace'
      ? spies.ensure
      : spies.importLegacy,
}));
vi.mock('../lib/lists-storage', () => ({
  loadListsStateForImport: spies.loadLists,
  clearListsState: vi.fn(),
}));
vi.mock('../lib/onboarding-storage', () => ({
  loadOnboardingState: spies.loadProfile,
  clearOnboardingState: vi.fn(),
}));
import { useConvexWorkspaceBootstrap } from '../lib/convex-bootstrap';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

it('initializes each mounted session without reading or automatically importing an existing device backup', async () => {
  function Probe() {
    useConvexWorkspaceBootstrap();
    return null;
  }
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(React.createElement(Probe));
  });
  await act(async () => {
    root.unmount();
  });
  await act(async () => {
    root = create(React.createElement(Probe));
  });
  expect(spies.ensure).toHaveBeenCalledTimes(2);
  expect(spies.loadLists).not.toHaveBeenCalled();
  expect(spies.loadProfile).not.toHaveBeenCalled();
  expect(spies.importLegacy).not.toHaveBeenCalled();
  await act(async () => {
    root.unmount();
  });
});
