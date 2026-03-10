import { Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { NewListFormScreen as IOSNewListFormScreen } from '@/components/tracker/new-list-form-screen.ios';
import { NewListFormScreen as NewListFormFallbackScreen } from '@/components/tracker/new-list-form-screen.web';
import { useNewListForm } from '@/components/tracker/use-new-list-form';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewListRoute() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const form = useNewListForm();
  const ScreenComponent =
    process.env.EXPO_OS === 'ios' ? IOSNewListFormScreen : NewListFormFallbackScreen;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New List',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={form.cancel}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 4 }]}
            >
              <ThemedText style={{ color: colors.tint }}>Cancel</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityLabel="Create list"
              accessibilityRole="button"
              disabled={!form.canSubmit}
              onPress={form.submit}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  paddingHorizontal: 4,
                },
              ]}
            >
              <ThemedText style={{ color: form.canSubmit ? colors.tint : colors.icon }}>
                Create
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <ScreenComponent form={form} />
    </>
  );
}
