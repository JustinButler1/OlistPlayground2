import { Stack } from 'expo-router/stack';

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Home', headerTransparent: true, headerShadowVisible: false }}
      />
    </Stack>
  );
}
