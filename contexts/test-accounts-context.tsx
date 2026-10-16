import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@clerk/expo';
import type {
  MockTestAccountId,
  MockTestAccountSeed,
  TestAccountDefinition,
  TestAccountId,
} from '@/data/test-accounts';
import type { ListsState } from '@/lib/lists-storage';
import type { OnboardingState } from '@/lib/onboarding-storage';

// Presentation compatibility only; no persisted test identity or mock switching.
interface AccountContextValue {
  accounts: TestAccountDefinition[];
  activeAccount: TestAccountDefinition;
  activeAccountId: TestAccountId;
  activeMockAccountSeed: MockTestAccountSeed | null;
  mockAccountSeeds: Record<MockTestAccountId, MockTestAccountSeed>;
  isHydrated: boolean;
  switchAccount: (id: TestAccountId) => Promise<void>;
  updateActiveMockOnboardingState: (
    update: (state: OnboardingState) => OnboardingState,
  ) => void;
  updateActiveMockListsState: (
    update: (state: ListsState) => ListsState,
  ) => void;
  resetActiveMockListsState: () => void;
}
const Context = createContext<AccountContextValue | null>(null);
const disabled = () => {
  throw new Error('Mock accounts are disabled');
};
export function TestAccountsProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const account: TestAccountDefinition = {
    id: 'live-current',
    kind: 'live',
    profileId: userId!,
    handle: '',
    defaultDisplayName: 'My account',
    pickerLabel: 'My account',
    pickerDescription: 'Signed in with Clerk',
  };
  return (
    <Context.Provider
      value={{
        accounts: [account],
        activeAccount: account,
        activeAccountId: account.id,
        activeMockAccountSeed: null,
        mockAccountSeeds: {} as Record<MockTestAccountId, MockTestAccountSeed>,
        isHydrated: true,
        switchAccount: async () => disabled(),
        updateActiveMockOnboardingState: disabled,
        updateActiveMockListsState: disabled,
        resetActiveMockListsState: disabled,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTestAccounts() {
  const context = useContext(Context);
  if (!context) throw new Error('Account provider required');
  return context;
}
