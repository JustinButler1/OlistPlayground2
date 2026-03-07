import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { listTemplates } = useListsQuery();
  const { createListFromTemplate } = useListActions();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Explore Templates
        </ThemedText>
        <ThemedText style={[styles.copy, { color: colors.icon }]}>
          Starter lists are the new discovery surface. They seed a tracker flow
          without pretending the app already has social or sync features.
        </ThemedText>
      </View>

      {listTemplates.map((template) => (
        <View
          key={template.id}
          style={[
            styles.templateCard,
            {
              borderColor: colors.icon + '20',
              backgroundColor: colors.background,
            },
          ]}
        >
          <ThemedText type="subtitle">{template.title}</ThemedText>
          <ThemedText style={{ color: colors.icon }}>{template.description}</ThemedText>
          <View style={styles.tagRow}>
            {template.suggestedTags.map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: colors.tint + '14' }]}
              >
                <ThemedText style={{ color: colors.tint }}>{tag}</ThemedText>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => {
              const nextListId = createListFromTemplate(template.id);
              if (nextListId) {
                router.push(`/list/${nextListId}`);
              }
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
              Use template
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  title: {
    lineHeight: 38,
  },
  copy: {
    lineHeight: 22,
  },
  templateCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
