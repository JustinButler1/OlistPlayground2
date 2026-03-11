import { Stack } from 'expo-router';

import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';

export default function ProfileOnboardingRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingFlow />
    </>
  );
}
