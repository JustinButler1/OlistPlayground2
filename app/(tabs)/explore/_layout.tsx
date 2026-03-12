import { Stack } from 'expo-router';

export default function ExploreLayout() {
  const isIos = process.env.EXPO_OS === 'ios';
  const sheetOptions = {
    presentation: isIos ? 'formSheet' : 'modal',
    ...(isIos
      ? {
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: 'transparent' },
        }
      : {}),
  } as const;

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Explore', headerTransparent: true, headerShadowVisible: false }}
      />
      <Stack.Screen
        name="filter-sheet"
        options={{
          ...sheetOptions,
          title: 'Filter',
          ...(isIos ? { sheetAllowedDetents: [0.55, 0.92] } : {}),
        }}
      />
      <Stack.Screen
        name="content-filter-info"
        options={{
          ...sheetOptions,
          title: 'Content Filter',
          ...(isIos ? { sheetAllowedDetents: [0.35, 0.62] } : {}),
        }}
      />
    </Stack>
  );
}
