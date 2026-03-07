import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/tracker/EntryRow';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { continueTracking, recentlyUpdated, upcomingReminders, pinnedLists } = useListsQuery();
  const { createListFromTemplate } = useListActions();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 28,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <ThemedText type="title" style={styles.heroTitle}>
          Olist Personal Tracker
        </ThemedText>
        <ThemedText style={[styles.heroCopy, { color: colors.icon }]}>
          Keep momentum on active media, save quick captures locally, and treat
          social features as future work instead of release scope.
        </ThemedText>
      </View>

      <View
        style={[
          styles.quickAddCard,
          {
            backgroundColor: colors.tint,
          },
        ]}
      >
        <ThemedText style={[styles.quickAddEyebrow, { color: colors.background }]}>
          Quick Add
        </ThemedText>
        <View style={styles.quickAddRow}>
          <Pressable
            onPress={() => router.push('/search')}
            style={[styles.quickAddButton, { backgroundColor: colors.background + '20' }]}
          >
            <ThemedText style={[styles.quickAddButtonText, { color: colors.background }]}>
              Catalog search
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              const nextListId = createListFromTemplate('template-links');
              if (nextListId) {
                router.push(`/list/${nextListId}`);
              }
            }}
            style={[styles.quickAddButton, { backgroundColor: colors.background + '20' }]}
          >
            <ThemedText style={[styles.quickAddButtonText, { color: colors.background }]}>
              Link capture
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <Section title="Continue Tracking">
        {continueTracking.length ? (
          continueTracking.map(({ entry, list }) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              subtitle={list.title}
              onPress={() => router.push(`/list/${list.id}`)}
            />
          ))
        ) : (
          <EmptyState label="No active entries yet. Start from a starter template or add something manually." />
        )}
      </Section>

      <Section title="Recently Updated">
        {recentlyUpdated.slice(0, 4).map(({ entry, list }) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            subtitle={list.title}
            onPress={() => router.push(`/list/${list.id}`)}
          />
        ))}
      </Section>

      <Section title="Upcoming Reminders">
        {upcomingReminders.length ? (
          upcomingReminders.slice(0, 4).map(({ entry, list }) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              subtitle={new Date(entry.reminderAt ?? Date.now()).toLocaleString()}
              trailingLabel={list.title}
              onPress={() => router.push(`/list/${list.id}`)}
            />
          ))
        ) : (
          <EmptyState label="Set a reminder from any entry to surface it here." />
        )}
      </Section>

      <Section title="Pinned Lists">
        <View style={styles.pinnedGrid}>
          {pinnedLists.map((list) => (
            <Pressable
              key={list.id}
              onPress={() => router.push(`/list/${list.id}`)}
              style={[
                styles.pinnedCard,
                {
                  borderColor: colors.icon + '20',
                  backgroundColor: colors.background,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold">{list.title}</ThemedText>
              <ThemedText style={{ color: colors.icon }}>
                {list.entries.filter((entry) => !entry.archivedAt).length} tracked
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return <ThemedText style={styles.emptyText}>{label}</ThemedText>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  hero: {
    gap: 8,
  },
  heroTitle: {
    lineHeight: 38,
  },
  heroCopy: {
    fontSize: 15,
    lineHeight: 22,
  },
  quickAddCard: {
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  quickAddEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAddButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  quickAddButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionContent: {
    gap: 10,
  },
  pinnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pinnedCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  emptyText: {
    opacity: 0.7,
    lineHeight: 22,
  },
});
