import { SignIn, SignUp } from '@clerk/expo/web';
import { useState } from 'react';
import { Button, ScrollView } from 'react-native';

export default function SignInScreen() {
  const [register, setRegister] = useState(false);
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}
    >
      {register ? (
        <SignUp routing="hash" forceRedirectUrl="/" />
      ) : (
        <SignIn routing="hash" forceRedirectUrl="/" />
      )}
      <Button
        title={register ? 'Back to sign in' : 'Create an account'}
        onPress={() => setRegister(!register)}
      />
    </ScrollView>
  );
}
