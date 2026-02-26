import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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
            <ThemedText type="title" style={styles.title}>
              {entry.title}
            </ThemedText>
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
});

