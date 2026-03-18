import SQLiteAsyncStorage from 'expo-sqlite/kv-store';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  createInitialMockTestAccountSeeds,
  TEST_ACCOUNT_DEFINITIONS,
  type MockTestAccountId,
  type MockTestAccountSeed,
  type TestAccountDefinition,
  type TestAccountId,
} from '@/data/test-accounts';
import { cloneListsState, type ListsState } from '@/lib/lists-storage';
import { cloneOnboardingState, type OnboardingState } from '@/lib/onboarding-storage';

const STORAGE_KEY = 'active-test-account-v1';

interface TestAccountsContextValue {
  accounts: TestAccountDefinition[];
  activeAccount: TestAccountDefinition;
  activeAccountId: TestAccountId;
  activeMockAccountSeed: MockTestAccountSeed | null;
  mockAccountSeeds: Record<MockTestAccountId, MockTestAccountSeed>;
  isHydrated: boolean;
  switchAccount: (accountId: TestAccountId) => Promise<void>;
  updateActiveMockOnboardingState: (
    updater: (state: OnboardingState) => OnboardingState
  ) => void;
  updateActiveMockListsState: (updater: (state: ListsState) => ListsState) => void;
  resetActiveMockListsState: () => void;
}

const TestAccountsContext = createContext<TestAccountsContextValue | null>(null);

function isMockAccountId(accountId: TestAccountId): accountId is MockTestAccountId {
  return accountId === 'creator-lab' || accountId === 'weekend-reset';
}

function isValidAccountId(value: string): value is TestAccountId {
  return TEST_ACCOUNT_DEFINITIONS.some((account) => account.id === value);
}

export function TestAccountsProvider({ children }: { children: ReactNode }) {
  const [activeAccountId, setActiveAccountId] = useState<TestAccountId>('live-current');
  const [mockSeeds, setMockSeeds] = useState<Record<MockTestAccountId, MockTestAccountSeed>>(
    () => createInitialMockTestAccountSeeds()
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const stored = await SQLiteAsyncStorage.getItem(STORAGE_KEY);
        if (isMounted && stored && isValidAccountId(stored)) {
          setActiveAccountId(stored);
        }
      } catch (error) {
        console.warn('Failed to load active test account', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeAccount =
    TEST_ACCOUNT_DEFINITIONS.find((account) => account.id === activeAccountId) ??
    TEST_ACCOUNT_DEFINITIONS[0]!;
  const activeMockAccountSeed = isMockAccountId(activeAccountId) ? mockSeeds[activeAccountId] : null;

  const value = useMemo<TestAccountsContextValue>(
    () => ({
      accounts: TEST_ACCOUNT_DEFINITIONS,
      activeAccount,
      activeAccountId,
      activeMockAccountSeed,
      mockAccountSeeds: mockSeeds,
      isHydrated,
      switchAccount: async (accountId) => {
        setActiveAccountId(accountId);

        try {
          await SQLiteAsyncStorage.setItem(STORAGE_KEY, accountId);
        } catch (error) {
          console.warn('Failed to persist active test account', error);
        }
      },
      updateActiveMockOnboardingState: (updater) => {
        if (!isMockAccountId(activeAccountId)) {
          return;
        }

        setMockSeeds((current) => {
          const currentSeed = current[activeAccountId];
          return {
            ...current,
            [activeAccountId]: {
              ...currentSeed,
              onboardingState: cloneOnboardingState(
                updater(cloneOnboardingState(currentSeed.onboardingState))
              ),
            },
          };
        });
      },
      updateActiveMockListsState: (updater) => {
        if (!isMockAccountId(activeAccountId)) {
          return;
        }

        setMockSeeds((current) => {
          const currentSeed = current[activeAccountId];
          return {
            ...current,
            [activeAccountId]: {
              ...currentSeed,
              listsState: cloneListsState(updater(cloneListsState(currentSeed.listsState))),
            },
          };
        });
      },
      resetActiveMockListsState: () => {
        if (!isMockAccountId(activeAccountId)) {
          return;
        }

        const freshSeeds = createInitialMockTestAccountSeeds();
        setMockSeeds((current) => ({
          ...current,
          [activeAccountId]: freshSeeds[activeAccountId],
        }));
      },
    }),
    [activeAccount, activeAccountId, activeMockAccountSeed, isHydrated, mockSeeds]
  );

  return <TestAccountsContext.Provider value={value}>{children}</TestAccountsContext.Provider>;
}

export function useTestAccounts() {
  const context = useContext(TestAccountsContext);
  if (!context) {
    throw new Error('useTestAccounts must be used within TestAccountsProvider');
  }

  return context;
}
