import { Stack } from 'expo-router/stack';

import { NewListFormProvider } from '@/components/tracker/use-new-list-form';

export default function MyListsLayout() {
  const isIos = process.env.EXPO_OS === 'ios';
  const sheetOptions = {
    title: 'New List',
    presentation: isIos ? 'formSheet' : 'modal',
    ...(isIos
      ? {
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.6, 1.0],
          contentStyle: { backgroundColor: 'transparent' },
        }
      : {}),
  } as const;

  return (
    <NewListFormProvider>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ title: 'My Lists' }} />
        <Stack.Screen name="new-list" options={sheetOptions} />
        <Stack.Screen name="new-list-addons" options={{ ...sheetOptions, title: 'Add-ons' }} />
        <Stack.Screen
          name="new-list-custom-fields"
          options={{ ...sheetOptions, title: 'Custom Fields' }}
        />
      </Stack>
    </NewListFormProvider>
  );
}
