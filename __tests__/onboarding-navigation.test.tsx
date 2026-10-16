import { Text } from 'react-native';
import { Stack, Tabs, router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

let rendered: ReturnType<typeof renderRouter>;

const mockComplete = jest.fn();
jest.mock('@/contexts/onboarding-context', () => ({
  useOnboarding: () => ({
    completeOnboarding: mockComplete,
    isHydrated: true,
    isSyncing: false,
    setDisplayName: jest.fn(),
    state: { profile: { displayName: '', birthDate: null, avatarUri: null, interests: [] } },
  }),
}));
jest.mock('@/components/reacticx/vertical-pagination-carousel', () => ({
  VerticalPaginationCarousel: ({ data, activeIndex, renderItem }: any) =>
    renderItem({ item: data[activeIndex] }),
}));
jest.mock('@/components/onboarding/onboarding-page-shell', () => ({
  OnboardingPageShell: ({ title, children, footer }: any) => {
    const { Text, View } = require('react-native');
    return <View><Text>{title}</Text>{children}{footer}</View>;
  },
}));
jest.mock('@/components/onboarding/birthday-picker', () => ({ BirthdayPicker: () => null }));
jest.mock('@/components/onboarding/interests-circular-carousel', () => ({
  InterestsCircularCarousel: ({ footer }: any) => footer,
}));
jest.mock('@/components/tab-root-background', () => ({
  TabRootBackground: ({ children }: any) => children,
}));
jest.mock('@/components/thumbnail-image', () => ({ ThumbnailImage: () => null }));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));

const routes = {
  _layout: () => <Stack />,
  '(tabs)/_layout': () => <Tabs />,
  '(tabs)/profile/_layout': () => <Stack />,
  '(tabs)/my-lists/_layout': () => <Stack />,
  '(tabs)/profile/index': () => <Text>Profile screen</Text>,
  '(tabs)/my-lists/index': () => <Text>My Lists screen</Text>,
  'profile-onboarding': OnboardingFlow,
};

function openOnboarding() {
  rendered = renderRouter(routes, { initialUrl: '/profile' });
  act(() => router.push('/profile-onboarding'));
}

function reachFinish() {
  fireEvent.press(screen.getByText('Start'));
  for (let step = 0; step < 3; step++) {
    fireEvent.press(screen.getByText('Continue'));
  }
}

beforeEach(() => mockComplete.mockReset());

test('Finish waits for successful completion then shows and selects My Lists', async () => {
  let complete!: () => void;
  mockComplete.mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
  openOnboarding();
  reachFinish();
  expect(screen.getByText('Finish and open My Lists')).toBeVisible();
  fireEvent.press(screen.getByText('Finish'));
  expect(rendered.getPathname()).toBe('/profile-onboarding');
  await act(async () => complete());
  expect(rendered.getPathname()).toBe('/my-lists');
  expect(screen.getByText('My Lists screen')).toBeVisible();
  expect(screen.getByLabelText(/^my-lists, tab,/)).toBeSelected();
});

test('failed completion stays on onboarding and permits retry', async () => {
  mockComplete.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(undefined);
  openOnboarding();
  reachFinish();
  await act(async () => fireEvent.press(screen.getByText('Finish')));
  expect(rendered.getPathname()).toBe('/profile-onboarding');
  fireEvent.press(screen.getByText('Finish'));
  await waitFor(() => expect(rendered.getPathname()).toBe('/my-lists'));
});

test('closing onboarding returns to Profile without completing', () => {
  openOnboarding();
  fireEvent.press(screen.getByLabelText('Close onboarding'));
  expect(rendered.getPathname()).toBe('/profile');
  expect(screen.getByText('Profile screen')).toBeVisible();
  expect(mockComplete).not.toHaveBeenCalled();
});
