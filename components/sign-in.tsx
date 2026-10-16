import { useSSO } from '@clerk/expo';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Button, ScrollView, Text, TextInput } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (task: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await task();
    } catch (e: unknown) {
      const errors = (e as { errors?: { longMessage?: string }[] })?.errors;
      setError(errors?.[0]?.longMessage ?? 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const submit = () =>
    run(async () => {
      if (!isLoaded || !signUp) return;
      if (register) {
        if (!verify) {
          await signUp.create({ emailAddress: email.trim(), password });
          await signUp.prepareEmailAddressVerification({
            strategy: 'email_code',
          });
          setVerify(true);
        } else {
          const result = await signUp.attemptEmailAddressVerification({ code });
          if (result.status !== 'complete')
            throw new Error('Incomplete registration');
          await setActive({ session: result.createdSessionId });
        }
      } else {
        const result = await signIn.create({
          identifier: email.trim(),
          password,
        });
        if (result.status !== 'complete')
          throw new Error('Additional verification required');
        await setActive({ session: result.createdSessionId });
      }
    });
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        padding: 28,
        gap: 18,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 30, fontWeight: '700' }}>
        {register ? 'Create your account' : 'Sign in to Olist'}
      </Text>
      <Text>Your lists and activity belong to your account.</Text>
      {verify ? (
        <TextInput
          accessibilityLabel="Email verification code"
          placeholder="Email verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
        />
      ) : (
        <>
          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            accessibilityLabel="Password"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={register ? 'new-password' : 'current-password'}
          />
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: '#b42318' }}>
          {error}
        </Text>
      ) : null}
      <Button
        title={
          verify ? 'Verify email' : register ? 'Create account' : 'Sign in'
        }
        disabled={busy || !isLoaded}
        onPress={submit}
      />
      <Button
        title="Continue with Google"
        disabled={busy || !isLoaded}
        onPress={() =>
          run(async () => {
            const result = await startSSOFlow({
              strategy: 'oauth_google',
              redirectUrl: Linking.createURL('/', {
                scheme: 'olistplayground2',
              }),
            });
            if (result.createdSessionId)
              await result.setActive!({ session: result.createdSessionId });
            else
              setError(
                'Google sign-in was cancelled or incomplete. Please try again.',
              );
          })
        }
      />
      <Button
        title={register ? 'Back to sign in' : 'Create an account'}
        disabled={busy}
        onPress={() => {
          setRegister(!register);
          setVerify(false);
          setError('');
        }}
      />
    </ScrollView>
  );
}
