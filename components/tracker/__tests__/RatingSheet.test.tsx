import React from 'react';
import { Stack, router } from 'expo-router';
import { Pressable, TextInput, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import RatingSheet from '@/app/rating-sheet';
import { RatingInput } from '@/components/tracker/RatingInput';

const mockSave = jest.fn();
jest.mock('@/contexts/lists-context', () => ({
  useItemUserData: () => ({ itemUserData: { rating: 2, updatedAt: 123 }, setItemUserData: mockSave }),
}));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ itemKey: 'test-item', entryId: 'test-entry' }),
}));

let tree: ReactTestRenderer;
const pressableType = (Pressable as unknown as { type: typeof Pressable }).type;
function options() {
  return tree.root.findByType(Stack.Screen).props.options;
}
function headerPress(side: 'headerLeft' | 'headerRight') {
  act(() => options()[side]().props.onPress());
}
function change(value: number | null) {
  act(() => tree.root.findByType(RatingInput).props.onChange(value));
}
beforeEach(() => {
  act(() => { tree = create(<RatingSheet />); });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.clearAllMocks();
});

test('confirms only changed drafts and persists cleared ratings as undefined', () => {
  expect(options().headerRight().props.disabled).toBe(true);
  headerPress('headerRight');
  expect(mockSave).not.toHaveBeenCalled();
  change(null);
  expect(options().headerRight().props.disabled).toBe(false);
  headerPress('headerRight');
  expect(mockSave).toHaveBeenCalledWith({ rating: undefined, updatedAt: expect.any(Number) });
  expect(router.back).toHaveBeenCalledTimes(1);
});

test('persists a changed numeric rating on confirmation', () => {
  change(3.75);
  headerPress('headerRight');
  expect(mockSave).toHaveBeenCalledWith({ rating: 3.75, updatedAt: expect.any(Number) });
  expect(router.back).toHaveBeenCalledTimes(1);
});

test('cancels without saving the draft', () => {
  change(4);
  headerPress('headerLeft');
  expect(mockSave).not.toHaveBeenCalled();
  expect(router.back).toHaveBeenCalledTimes(1);
});

test('reset restores the original value and exits the editing layout', () => {
  change(4);
  const input = tree.root.findByType(RatingInput);
  act(() => input.findAllByType(pressableType)[1].props.onPress());
  act(() => tree.root.findByType(TextInput).props.onChangeText('4.7'));
  expect(tree.root.findAllByType(View).some(node => node.props.style?.paddingTop === 96)).toBe(true);
  // The final sheet button is Reset; the iOS accessory is nested inside RatingInput.
  const reset = tree.root.findAllByType(pressableType).find(node => node.props.style instanceof Function && node.props.style({ pressed: false }).minHeight === 56)!;
  act(() => reset.props.onPress());
  expect(tree.root.findByType(RatingInput).props.value).toBe(2);
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(tree.root.findAllByType(View).some(node => node.props.style?.paddingTop === 0)).toBe(true);
  expect(options().headerRight().props.disabled).toBe(true);
  expect(mockSave).not.toHaveBeenCalled();
});
