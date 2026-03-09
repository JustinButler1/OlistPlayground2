import { Stack } from 'expo-router/stack';

export default function MyListsLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'My Lists' }} />
    </Stack>
  );
}
