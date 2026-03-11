import { Stack } from 'expo-router/stack';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Profile', headerTransparent: true, headerShadowVisible: false }}
      />
    </Stack>
  );
}
