import { render, screen, within } from '@testing-library/react-native';

import TabLayout from '../app/(tabs)/_layout';

jest.mock('expo-router/unstable-native-tabs', () => {
  const { Text, View } = require('react-native');
  const Trigger = Object.assign(
    ({ name, children }: { name: string; children: React.ReactNode }) => (
      <View testID={name}>{children}</View>
    ),
    {
      Icon: ({ sf }: { sf: string | { default: string; selected: string } }) => (
        <Text>{typeof sf === 'string' ? sf : `${sf.default} ${sf.selected}`}</Text>
      ),
      Label: Text,
    },
  );
  return { NativeTabs: Object.assign(View, { Trigger }) };
});

test('iOS registers all six destinations and both flask icon states', () => {
  render(<TabLayout />);
  for (const route of ['(home)', 'my-lists', 'community', 'profile', 'explore', 'experimental']) {
    expect(screen.getByTestId(route)).toBeTruthy();
  }
  const experimental = within(screen.getByTestId('experimental'));
  expect(experimental.getByText('Experimental')).toBeTruthy();
  expect(experimental.getByText('flask flask.fill')).toBeTruthy();
});
