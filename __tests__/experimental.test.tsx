import { fireEvent, screen, within } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { Colors } from '@/constants/theme';
import { AI_PILLARS } from '@/data/ai-pillars';
import { useColorScheme } from '@/hooks/use-color-scheme';

import TabLayout from '../app/(tabs)/_layout.web';
import ExperimentalLayout from '../app/(tabs)/experimental/_layout';
import ExperimentalScreen from '../app/(tabs)/experimental/index';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

afterEach(() => {
  jest.mocked(useColorScheme).mockReturnValue('light');
});

jest.mock('@/components/tab-root-background', () => ({
  TabRootBackground: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

const headings = ['Machine Learning', 'Natural Language Processing', 'Computer Vision', 'Robotics'];

function openTabs() {
  return renderRouter(
    {
      '(tabs)/_layout': TabLayout,
      '(tabs)/(home)/_layout': () => <Slot />,
      '(tabs)/(home)/index': () => <Text>Home destination</Text>,
      '(tabs)/my-lists/_layout': () => <Slot />,
      '(tabs)/my-lists/index': () => <Text>My Lists destination</Text>,
      '(tabs)/community/_layout': () => <Slot />,
      '(tabs)/community/index': () => <Text>Community destination</Text>,
      '(tabs)/profile/_layout': () => <Slot />,
      '(tabs)/profile/index': () => <Text>Profile destination</Text>,
      '(tabs)/explore/_layout': () => <Slot />,
      '(tabs)/explore/index': () => <Text>Explore destination</Text>,
      '(tabs)/experimental/_layout': ExperimentalLayout,
      '(tabs)/experimental/index': ExperimentalScreen,
    },
    { initialUrl: '/' },
  );
}

test('selecting Experimental opens four readable introductory blocks within the word limit', async () => {
  const router = openTabs();
  fireEvent.press(screen.getByLabelText(/^Experimental, tab/));
  await screen.findByText('Machine Learning');
  expect(router.getPathname()).toBe('/experimental');
  const blocks = screen.getAllByTestId('ai-pillar');
  expect(blocks).toHaveLength(4);
  blocks.forEach((block, index) => {
    expect(within(block).getByRole('header', { name: headings[index] })).toBeTruthy();
    const text = within(block).getAllByText(/\S/).map((node) => node.props.children).join(' ');
    expect(text.trim().split(/\s+/).length).toBeLessThanOrEqual(150);
    expect(text.trim().split(/\s+/).length).toBeGreaterThan(30);
  });
});

test('each existing destination remains reachable and Experimental can be reopened', async () => {
  const router = openTabs();
  for (const name of ['Home', 'My Lists', 'Community', 'Profile', 'Explore']) {
    fireEvent.press(screen.getByLabelText(new RegExp(`^${name}, tab`)));
    await screen.findByText(`${name} destination`);
    fireEvent.press(screen.getByLabelText(/^Experimental, tab/));
    await screen.findByText('Robotics');
    expect(router.getPathname()).toBe('/experimental');
  }
});

test.each(['light', 'dark'] as const)('Experimental copy follows the %s theme', async (theme) => {
  jest.mocked(useColorScheme).mockReturnValue(theme);
  openTabs();
  fireEvent.press(screen.getByLabelText(/^Experimental, tab/));
  await screen.findByText('Machine Learning');

  expect(screen.getByText(/^Explore four pillars of AI:/)).toHaveStyle({ color: Colors[theme].text });
  for (const pillar of AI_PILLARS) {
    expect(screen.getByText(pillar.title)).toHaveStyle({ color: Colors[theme].text });
    expect(screen.getByText(pillar.description)).toHaveStyle({ color: Colors[theme].text });
  }
});
