import { Stack } from 'expo-router/stack';

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Community', headerTransparent: true, headerShadowVisible: false }}
      />
    </Stack>
  );
}
