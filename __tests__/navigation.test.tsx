import { Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import Index from '@/app/index';
import TabLayout from '@/app/(tabs)/_layout.web';
import * as NativeTabLayout from '@/app/(tabs)/_layout';

let rendered: ReturnType<typeof renderRouter>;

// Replace only the OS tab view. The real native navigator resolves routes and selection.
jest.mock('expo-router/build/native-tabs/NativeTabsView', () => ({
  NativeTabsView: ({ tabs, focusedIndex, onTabChange }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return <View>
      {tabs[focusedIndex].contentRenderer()}
      {tabs.map((tab: any, index: number) => <Pressable
        key={tab.routeKey}
        accessibilityLabel={`${tab.options.title}, tab, ${index + 1}`}
        accessibilityState={{ selected: index === focusedIndex }}
        onPress={() => onTabChange(tab.routeKey)}
      ><Text>{tab.options.title}</Text></Pressable>)}
    </View>;
  },
}));

jest.mock('@/components/haptic-tab', () => ({
  HapticTab: (props: any) => {
    const { Pressable } = require('react-native');
    return <Pressable {...props} />;
  },
}));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));

const destinations = [
  ['home', 'Home'],
  ['my-lists', 'My Lists'],
  ['community', 'Community'],
  ['profile', 'Profile'],
  ['explore', 'Explore'],
] as const;

// Keep real router layouts and route discovery; isolate screen content from backend/native UI.
const routes = {
  _layout: () => <Stack />,
  index: Index,
  '(tabs)/_layout': TabLayout,
  ...Object.fromEntries(destinations.map(([path]) => [
    `(tabs)/${path}/_layout`, () => <Stack />,
  ])),
  ...Object.fromEntries(destinations.map(([path, label]) => [
    `(tabs)/${path}/index`, () => <Text>{label} screen</Text>,
  ])),
};

function expectDestination(path: string, label: string) {
  expect(rendered.getPathname()).toBe(`/${path}`);
  expect(screen.getByText(`${label} screen`)).toBeVisible();
  expect(screen.getByLabelText(new RegExp(`^${label}, tab,`))).toBeSelected();
}

describe.each([
  ['web', { default: TabLayout }],
  ['native', NativeTabLayout],
] as const)('%s tabs', (_platform, layout) => {
  const platformRoutes = { ...routes, '(tabs)/_layout': layout };

  test('ordinary root entry resolves to the My Lists screen and selected tab', () => {
    rendered = renderRouter(platformRoutes, { initialUrl: '/' });
    expectDestination('my-lists', 'My Lists');
  });

  test.each(destinations)('cold explicit /%s entry retains its destination', (path, label) => {
    rendered = renderRouter(platformRoutes, { initialUrl: `/${path}` });
    expectDestination(path, label);
  });

  test.each(destinations)('warm explicit /%s entry retains its destination', (path, label) => {
    rendered = renderRouter(platformRoutes, { initialUrl: '/' });
    act(() => router.navigate(`/${path}`));
    expectDestination(path, label);
  });

  test('Home remains selectable and My Lists can be revisited', () => {
    rendered = renderRouter(platformRoutes, { initialUrl: '/' });
    fireEvent.press(screen.getByLabelText(/^Home, tab,/));
    expectDestination('home', 'Home');
    fireEvent.press(screen.getByLabelText(/^My Lists, tab,/));
    expectDestination('my-lists', 'My Lists');
  });
});
