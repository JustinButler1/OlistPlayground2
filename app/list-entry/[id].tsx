import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThumbnailImage } from "@/components/thumbnail-image";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useLists } from "@/contexts/lists-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ListEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists } = useLists();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const entry = useMemo(() => {
    if (!id) return null;
    for (const list of lists) {
      const found = list.entries.find((e) => e.id === id);
      if (found) return found;
    }
    return null;
  }, [id, lists]);

  const title = entry?.title ?? "Item";

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemedView
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        {!entry ? (
          <View style={styles.centered}>
            <ThemedText style={styles.placeholder}>
              This item could not be found.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {entry.type === "link" && entry.imageUrl ? (
              <ThumbnailImage
                imageUrl={entry.imageUrl}
                style={styles.productImage}
                contentFit="cover"
              />
            ) : null}
            <ThemedText type="title" style={styles.title}>
              {entry.title}
            </ThemedText>
            {entry.type === "link" && entry.price ? (
              <View style={styles.section}>
                <ThemedText style={styles.sectionLabel}>Price</ThemedText>
                <ThemedText style={[styles.priceText, { color: colors.tint }]}>
                  {entry.price}
                </ThemedText>
              </View>
            ) : null}
            {entry.type === "link" && entry.productUrl ? (
              <View style={styles.section}>
                <Pressable
                  onPress={() => Linking.openURL(entry.productUrl!)}
                  style={({ pressed }) => [
                    styles.productLinkButton,
                    {
                      backgroundColor: colors.tint + "20",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  accessibilityRole="link"
                  accessibilityLabel="Open product page"
                >
                  <IconSymbol name="link" size={20} color={colors.tint} />
                  <ThemedText style={[styles.productLinkText, { color: colors.tint }]}>
                    Open product page
                  </ThemedText>
                  <IconSymbol
                    name="arrow.up.right"
                    size={16}
                    color={colors.tint}
                  />
                </Pressable>
              </View>
            ) : null}
            {entry.notes ? (
              <View style={styles.section}>
                <ThemedText style={styles.sectionLabel}>Notes</ThemedText>
                <ThemedText style={styles.notesText}>{entry.notes}</ThemedText>
              </View>
            ) : null}
            {entry.customFields && entry.customFields.length > 0 ? (
              <View style={styles.section}>
                {entry.customFields.map((field, index) => (
                  <View key={index} style={styles.customFieldRow}>
                    <ThemedText style={styles.customFieldTitle}>
                      {field.title || "—"}
                    </ThemedText>
                    <ThemedText style={styles.customFieldValue}>
                      {field.value || "—"}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  placeholder: {
    opacity: 0.6,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 20,
  },
  customFieldRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 12,
  },
  customFieldTitle: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.8,
    minWidth: 80,
  },
  customFieldValue: {
    fontSize: 15,
    flex: 1,
  },
  productImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 16,
  },
  priceText: {
    fontSize: 18,
    fontWeight: "600",
  },
  productLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  productLinkText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
});

