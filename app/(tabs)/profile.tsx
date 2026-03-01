import { useRouter } from "expo-router";
import { StyleSheet, Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Profile</ThemedText>
      <Pressable
        onPress={() => router.push("/product-import")}
        style={({ pressed }) => [
          styles.linkRow,
          { backgroundColor: colors.icon + "15", opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Import product from URL"
      >
        <IconSymbol name="link" size={24} color={colors.tint} />
        <ThemedText style={[styles.linkText, { color: colors.text }]}>
          Import Product from URL
        </ThemedText>
        <IconSymbol name="chevron.right" size={20} color={colors.icon} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 20,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
});
