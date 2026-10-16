import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';

const clerk = vi.hoisted(() => ({
  signIn: { create: vi.fn() },
  signUp: {
    create: vi.fn(),
    prepareEmailAddressVerification: vi.fn(),
    attemptEmailAddressVerification: vi.fn(),
  },
  active: vi.fn(),
  sso: vi.fn(),
}));
vi.mock('@clerk/expo', () => ({ useSSO: () => ({ startSSOFlow: clerk.sso }) }));
vi.mock('@clerk/expo/legacy', () => ({
  useSignIn: () => ({
    signIn: clerk.signIn,
    setActive: clerk.active,
    isLoaded: true,
  }),
  useSignUp: () => ({ signUp: clerk.signUp }),
}));
vi.mock('react-native', () => ({
  Button: 'Button',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TextInput: 'Input',
}));
vi.mock('expo-linking', () => ({ createURL: () => 'olistplayground2:///' }));
vi.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: vi.fn() }));
import SignIn from '../components/sign-in';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReactTestRenderer;
const press = async (title: string) => {
  await act(async () => {
    await root.root.findByProps({ title }).props.onPress();
  });
};
const input = async (label: string, value: string) => {
  await act(async () => {
    root.root
      .findByProps({ accessibilityLabel: label })
      .props.onChangeText(value);
  });
};
beforeEach(async () => {
  vi.clearAllMocks();
  clerk.signIn.create.mockResolvedValue({
    status: 'complete',
    createdSessionId: 'email-session',
  });
  clerk.signUp.attemptEmailAddressVerification.mockResolvedValue({
    status: 'complete',
    createdSessionId: 'registered-session',
  });
  await act(async () => {
    root = create(React.createElement(SignIn));
  });
});
it('activates the verified email/password session and can retry a failed sign-in', async () => {
  await input('Email', 'person@example.test');
  await input('Password', 'fixture-password');
  clerk.signIn.create.mockRejectedValueOnce({
    errors: [{ longMessage: 'Incorrect password' }],
  });
  await press('Sign in');
  expect(clerk.active).not.toHaveBeenCalled();
  expect(
    root.root.findByProps({ accessibilityRole: 'alert' }).props.children,
  ).toBe('Incorrect password');
  await press('Sign in');
  expect(clerk.active).toHaveBeenCalledWith({ session: 'email-session' });
  await act(async () => root.unmount());
});
it('registers with email and only activates after email-code verification completes', async () => {
  await press('Create an account');
  await input('Email', 'new@example.test');
  await input('Password', 'fixture-password');
  await press('Create account');
  expect(clerk.signUp.prepareEmailAddressVerification).toHaveBeenCalledWith({
    strategy: 'email_code',
  });
  expect(clerk.active).not.toHaveBeenCalled();
  await input('Email verification code', '123456');
  await press('Verify email');
  expect(clerk.signUp.attemptEmailAddressVerification).toHaveBeenCalledWith({
    code: '123456',
  });
  expect(clerk.active).toHaveBeenCalledWith({ session: 'registered-session' });
  await act(async () => root.unmount());
});
it('keeps cancellation recoverable and activates a successful Google session on retry', async () => {
  clerk.sso.mockResolvedValueOnce({ createdSessionId: null });
  await press('Continue with Google');
  expect(clerk.active).not.toHaveBeenCalled();
  expect(
    root.root.findByProps({ accessibilityRole: 'alert' }).props.children,
  ).toContain('cancelled');
  clerk.sso.mockResolvedValueOnce({
    createdSessionId: 'google-session',
    setActive: clerk.active,
  });
  await press('Continue with Google');
  expect(clerk.sso).toHaveBeenCalledWith({
    strategy: 'oauth_google',
    redirectUrl: 'olistplayground2:///',
  });
  expect(clerk.active).toHaveBeenCalledWith({ session: 'google-session' });
  await act(async () => root.unmount());
});
