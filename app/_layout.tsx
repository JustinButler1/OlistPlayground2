import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { ThemePalette } from "@/constants/theme";
import { ListsProvider } from "@/contexts/lists-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: ThemePalette.nebulaBlue,
    background: ThemePalette.starlightWhite,
    card: ThemePalette.starlightWhite,
    text: ThemePalette.deepSpaceBlack,
    border: ThemePalette.cosmicPurple,
  },
};

const DarkThemeCustom = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: ThemePalette.stellarTeal,
    background: ThemePalette.deepSpaceBlack,
    card: ThemePalette.deepSpaceBlack,
    text: ThemePalette.starlightWhite,
    border: ThemePalette.cosmicPurple,
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={colorScheme === "dark" ? DarkThemeCustom : LightTheme}
    >
      <ListsProvider>
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="list/[id]" options={{ headerShown: true }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="auto" />
      </ListsProvider>
    </ThemeProvider>
  );
}
