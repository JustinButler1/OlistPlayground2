import { Stack } from 'expo-router/stack';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Explore', headerTransparent: true, headerShadowVisible: false }}
      />
    </Stack>
  );
}
