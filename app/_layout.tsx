import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentType, type PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemePalette } from '@/constants/theme';
import { ListsProvider } from '@/contexts/lists-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { TestAccountsProvider } from '@/contexts/test-accounts-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthSession } from '@/components/auth-session';

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: ThemePalette.primaryBrand,
    background: ThemePalette.paper,
    card: ThemePalette.paper,
    text: ThemePalette.ink,
    border: ThemePalette.secondaryAccent,
  },
};

const DarkThemeCustom = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: ThemePalette.primaryAccent,
    background: ThemePalette.baseBackground,
    card: ThemePalette.baseBackground,
    text: ThemePalette.white,
    border: ThemePalette.secondaryBrand,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

const RootGestureHandlerView =
  GestureHandlerRootView as unknown as ComponentType<
    PropsWithChildren<{ style?: { flex: number } }>
  >;

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <RootGestureHandlerView style={{ flex: 1 }}>
      <AuthSession>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkThemeCustom : LightTheme}
        >
          <TestAccountsProvider>
            <OnboardingProvider>
              <ListsProvider>
                <Stack
                  screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}
                >
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="anime/[id]" />
                  <Stack.Screen name="manga/[id]" />
                  <Stack.Screen name="books/[id]" />
                  <Stack.Screen name="tv-movie/[type]/[id]" />
                  <Stack.Screen name="list/[id]" />
                  <Stack.Screen
                    name="list-settings/[id]"
                    options={{ title: 'List Settings' }}
                  />
                  <Stack.Screen
                    name="list-existing-sheet"
                    options={{
                      ...sheetOptions,
                      title: 'Existing List',
                      ...(isIos ? { sheetAllowedDetents: [0.55, 0.92] } : {}),
                    }}
                  />
                  <Stack.Screen
                    name="move-to-sheet"
                    options={{
                      ...sheetOptions,
                      title: 'Move to',
                      ...(isIos ? { sheetAllowedDetents: [0.55, 0.92] } : {}),
                    }}
                  />
                  <Stack.Screen
                    name="profile-sheet"
                    options={{
                      ...sheetOptions,
                      title: 'Profile',
                      ...(isIos ? { sheetAllowedDetents: [0.6, 0.94] } : {}),
                    }}
                  />
                  <Stack.Screen name="list-entry/[id]" />
                  <Stack.Screen
                    name="progress-sheet"
                    options={{
                      ...sheetOptions,
                      title: '',
                      ...(isIos ? { sheetAllowedDetents: [0.35] } : {}),
                    }}
                  />
                  <Stack.Screen
                    name="rating-sheet"
                    options={{
                      ...sheetOptions,
                      title: '',
                      ...(isIos ? { sheetAllowedDetents: [0.35] } : {}),
                    }}
                  />
                  <Stack.Screen
                    name="status-sheet"
                    options={{
                      ...sheetOptions,
                      title: '',
                      ...(isIos ? { sheetAllowedDetents: [0.55] } : {}),
                    }}
                  />
                  <Stack.Screen name="games/[id]" />
                  <Stack.Screen
                    name="product-import"
                    options={{ title: 'Import Product' }}
                  />
                  <Stack.Screen
                    name="modal"
                    options={{ presentation: 'modal', title: 'Modal' }}
                  />
                </Stack>
                <StatusBar style="auto" />
              </ListsProvider>
            </OnboardingProvider>
          </TestAccountsProvider>
        </ThemeProvider>
      </AuthSession>
    </RootGestureHandlerView>
  );
}
