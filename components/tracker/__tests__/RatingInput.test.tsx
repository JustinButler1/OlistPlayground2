import React from 'react';
import { Keyboard, Pressable, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ThemedText } from '@/components/themed-text';
import { RatingInput } from '@/components/tracker/RatingInput';

jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));

let tree: ReactTestRenderer;
const onChange = jest.fn();
const onEditingChange = jest.fn();

function render(value: number | null, resetKey = 0) {
  const element = <RatingInput value={value} onChange={onChange} onEditingChange={onEditingChange} resetKey={resetKey} />;
  act(() => {
    if (tree) tree.update(element);
    else tree = create(element);
  });
}
// Pressable is memoized; react-test-renderer exposes its inner component.
const pressableType = (Pressable as unknown as { type: typeof Pressable }).type;

function press(index: number) {
  act(() => tree.root.findAllByType(pressableType)[index].props.onPress());
}
function type(text: string) {
  act(() => tree.root.findByType(TextInput).props.onChangeText(text));
}
function display() {
  return tree.root.findByType(ThemedText).props.children;
}

afterEach(() => {
  act(() => tree?.unmount());
  tree = undefined as unknown as ReactTestRenderer;
  jest.clearAllMocks();
});

test.each([
  [null, 2, 0.25], [0.25, 0, null], [null, 0, null], [5, 2, 5], [3.5, 0, 3.25],
] as const)('steps %s via button %s to %s', (value, button, expected) => {
  render(value);
  press(button);
  expect(onChange).toHaveBeenLastCalledWith(expected);
});

test('displays controlled values and waits for the parent to accept changes', () => {
  render(null);
  expect(display()).toBe('-');
  press(2);
  expect(display()).toBe('-');
  render(0.25);
  expect(display()).toBe('0.25');
  render(3.5);
  expect(display()).toBe('3.5');
  render(5);
  expect(display()).toBe('5');
});

test.each(['onBlur', 'onSubmitEditing'])('%s normalizes typed input', (commit) => {
  for (const [text, expected] of [['3.62', 3.5], ['6', 5], ['-2', null], ['0', null], ['', null], ['  ', null]] as const) {
    render(2);
    press(1);
    type(text);
    act(() => tree.root.findByType(TextInput).props[commit]());
    expect(onChange).toHaveBeenLastCalledWith(expected);
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
    render(expected);
    expect(display()).toBe(expected === null ? '-' : String(expected));
  }
});

test.each(['invalid', 'Infinity', 'NaN'])('invalid input %s restores the controlled display', (text) => {
  render(3.25);
  press(1);
  type(text);
  act(() => tree.root.findByType(TextInput).props.onBlur());
  expect(onChange).not.toHaveBeenCalled();
  expect(display()).toBe('3.25');
  press(1);
  expect(tree.root.findByType(TextInput).props.value).toBe('3.25');
});

test('controlled changes synchronize text and reset discards editing even for the same value', () => {
  render(2);
  press(1);
  expect(onEditingChange).toHaveBeenLastCalledWith(true);
  type('4.7');
  render(3);
  expect(tree.root.findByType(TextInput).props.value).toBe('3');
  type('4.7');
  render(3, 1);
  expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
  expect(display()).toBe('3');
  expect(onEditingChange).toHaveBeenLastCalledWith(false);
  press(1);
  expect(tree.root.findByType(TextInput).props.value).toBe('3');
});

test('iOS Done commits and dismisses the keyboard', () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  render(2);
  press(1);
  type('3.62');
  press(3);
  expect(onChange).toHaveBeenLastCalledWith(3.5);
  expect(dismiss).toHaveBeenCalled();
  dismiss.mockRestore();
});
