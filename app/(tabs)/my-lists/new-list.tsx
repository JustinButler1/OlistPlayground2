import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import { useEffect } from 'react';
import { Pressable } from 'react-native';

import { NewListFormScreen as AndroidNewListFormScreen } from '@/components/tracker/new-list-form-screen.android';
import { NewListFormScreen as IOSNewListFormScreen } from '@/components/tracker/new-list-form-screen.ios';
import type { NewListFormController } from '@/components/tracker/use-new-list-form';
import { NewListFormScreen as NewListFormFallbackScreen } from '@/components/tracker/new-list-form-screen.web';
import { useNewListForm } from '@/components/tracker/use-new-list-form';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NewListRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const form = useNewListForm();
  const ScreenComponent: ComponentType<{
    form: NewListFormController;
    openAddons?: () => void;
    openAutomation?: () => void;
    openCustomFields?: () => void;
  }> =
    process.env.EXPO_OS === 'ios'
      ? IOSNewListFormScreen
      : process.env.EXPO_OS === 'android'
        ? AndroidNewListFormScreen
        : NewListFormFallbackScreen;

  useEffect(() => {
    if (sessionId) {
      form.beginSession(sessionId);
    }
  }, [form, sessionId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New List',
          headerBackVisible: false,
          ...(process.env.EXPO_OS === 'ios'
            ? {}
            : {
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
              }),
        }}
      />
      <ScreenComponent
        form={form}
        openAddons={() =>
          router.push({
            pathname: '/my-lists/new-list-addons',
            params: { sessionId },
          })
        }
        openAutomation={() =>
          router.push({
            pathname: '/my-lists/new-list-automation',
            params: { sessionId },
          })
        }
        openCustomFields={() =>
          router.push({
            pathname: '/my-lists/new-list-custom-fields',
            params: { sessionId },
          })
        }
      />
    </>
  );
}
