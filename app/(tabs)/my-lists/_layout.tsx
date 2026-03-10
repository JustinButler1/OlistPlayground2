import { Stack } from 'expo-router/stack';

export default function MyListsLayout() {
  const isIos = process.env.EXPO_OS === 'ios';

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'My Lists' }} />
      <Stack.Screen
        name="new-list"
        options={{
          title: 'New List',
          presentation: isIos ? 'formSheet' : 'modal',
          ...(isIos
            ? {
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.6, 1.0],
                contentStyle: { backgroundColor: 'transparent' },
              }
            : {}),
        }}
      />
    </Stack>
  );
}
