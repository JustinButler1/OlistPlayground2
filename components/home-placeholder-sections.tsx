import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { useListsQuery } from '@/contexts/lists-context';
import type { TrackerList } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getListStats } from '@/lib/tracker-selectors';

const SECTION_HORIZONTAL_PADDING = 20;
const CARD_GAP = 14;
const QUICK_ACCESS_PEEK = 48;

type QuickAccessItem = {
  key: string;
  title: string;
  imageUrl?: string;
  listId: string;
};

function chunkItems<T>(items: readonly T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push([...items.slice(index, index + size)]);
  }

  return chunks;
}

function formatListActivityLabel(list: TrackerList): string {
  const stats = getListStats(list);

  if (stats.active > 0) {
    return `${stats.active} active`;
  }
  if (stats.planned > 0) {
    return `${stats.planned} planned`;
  }
  if (stats.completed > 0) {
    return `${stats.completed} completed`;
  }

  return `${stats.total} items`;
}

function formatContinueLabel(entry: {
  status?: string;
  notes?: string;
  progress?: { current?: number; total?: number; unit: string };
}) {
  if (entry.progress?.current !== undefined && entry.progress.total !== undefined) {
    return `${entry.progress.current}/${entry.progress.total}`;
  }
  if (entry.progress?.current !== undefined) {
    return `${entry.progress.current}`;
  }
  if (entry.status) {
    return entry.status;
  }
  if (entry.notes?.trim()) {
    return 'Notes updated';
  }

  return 'Continue entry';
}

export function HomePlaceholderSections() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const { pinnedLists, recentActivity, continueEntries } = useListsQuery();
  const quickAccessCardSize = Math.max(
    72,
    Math.floor(
      (windowWidth - SECTION_HORIZONTAL_PADDING - CARD_GAP * 3 - QUICK_ACCESS_PEEK) / 3
    )
  );
  const quickAccessItems = useMemo<QuickAccessItem[]>(
    () =>
      pinnedLists.map((list) => ({
        key: `list-${list.id}`,
        title: list.title,
        imageUrl: list.imageUrl,
        listId: list.id,
      })),
    [pinnedLists]
  );
  const quickAccessColumns = chunkItems(quickAccessItems, 2);

  return (
    <View style={styles.sectionStack}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText selectable type="subtitle" style={styles.sectionTitle}>
            Quick Access
          </ThemedText>
        </View>
        {quickAccessColumns.length > 0 ? (
          <ScrollView
            horizontal
            style={styles.rowViewport}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessContent}
          >
            {quickAccessColumns.map((columnItems, columnIndex) => (
              <View
                key={`quick-access-column-${columnIndex}`}
                style={[styles.quickAccessColumn, { width: quickAccessCardSize }]}
              >
                {columnItems.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityLabel={`Open ${item.title} from Quick Access`}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/list/[id]',
                        params: { id: item.listId, title: item.title },
                      })
                    }
                    style={({ pressed }) => [
                      styles.quickAccessCardShell,
                      { opacity: pressed ? 0.84 : 1 },
                    ]}
                  >
                    <View style={[styles.quickAccessItem, { width: quickAccessCardSize }]}>
                      <ThemedView
                        style={[
                          styles.quickAccessCard,
                          {
                            backgroundColor: isDark
                              ? 'rgba(7, 22, 44, 0.78)'
                              : 'rgba(255, 255, 255, 0.78)',
                          },
                        ]}
                      >
                        <ThumbnailImage
                          imageUrl={item.imageUrl}
                          style={[styles.quickAccessThumbnail, { width: quickAccessCardSize }]}
                        />
                      </ThemedView>
                      <ThemedText
                        selectable
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        lightColor="rgba(26, 94, 133, 0.82)"
                        darkColor="rgba(159, 180, 202, 0.9)"
                        style={styles.quickAccessTitle}
                      >
                        {item.title}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        ) : (
          <ThemedView
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? 'rgba(7, 22, 44, 0.72)' : 'rgba(255, 255, 255, 0.72)',
              },
            ]}
          >
            <ThemedText selectable style={styles.emptyCopy}>
              Pin a list to keep it here.
            </ThemedText>
          </ThemedView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText selectable type="subtitle" style={styles.sectionTitle}>
            Recent Activity
          </ThemedText>
        </View>
        {recentActivity.length > 0 ? (
          <ScrollView
            horizontal
            style={styles.rowViewport}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowContent}
          >
            {recentActivity.map((list) => (
              <Pressable
                key={list.id}
                accessibilityLabel={`Open ${list.title} from Recent Activity`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/list/[id]',
                    params: { id: list.id, title: list.title },
                  })
                }
                style={({ pressed }) => [styles.cardShell, { opacity: pressed ? 0.84 : 1 }]}
              >
                <ThemedView
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark
                        ? 'rgba(7, 22, 44, 0.72)'
                        : 'rgba(255, 255, 255, 0.72)',
                    },
                  ]}
                >
                  <ThumbnailImage imageUrl={list.imageUrl} style={styles.thumbnail} />
                  <View style={styles.cardCopy}>
                    <ThemedText selectable numberOfLines={2} type="defaultSemiBold">
                      {list.title}
                    </ThemedText>
                    <ThemedText selectable style={styles.metaText}>
                      {formatListActivityLabel(list)}
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <ThemedView
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? 'rgba(7, 22, 44, 0.72)' : 'rgba(255, 255, 255, 0.72)',
              },
            ]}
          >
            <ThemedText selectable style={styles.emptyCopy}>
              Edit a list and it will appear here.
            </ThemedText>
          </ThemedView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText selectable type="subtitle" style={styles.sectionTitle}>
            Continue
          </ThemedText>
        </View>
        {continueEntries.length > 0 ? (
          <ScrollView
            horizontal
            style={styles.rowViewport}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowContent}
          >
            {continueEntries.map(({ entry, list }) => (
              <Pressable
                key={entry.id}
                accessibilityLabel={`Continue ${entry.title}`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/list-entry/[id]',
                    params: { id: entry.id },
                  })
                }
                style={({ pressed }) => [styles.cardShell, { opacity: pressed ? 0.84 : 1 }]}
              >
                <ThemedView
                  style={[
                    styles.card,
                    {
                      backgroundColor: isDark
                        ? 'rgba(7, 22, 44, 0.72)'
                        : 'rgba(255, 255, 255, 0.72)',
                    },
                  ]}
                >
                  <ThumbnailImage imageUrl={entry.imageUrl} style={styles.thumbnail} />
                  <View style={styles.cardCopy}>
                    <ThemedText selectable numberOfLines={2} type="defaultSemiBold">
                      {entry.title}
                    </ThemedText>
                    <ThemedText selectable numberOfLines={1} style={styles.metaText}>
                      {list.title}
                    </ThemedText>
                    <ThemedText selectable numberOfLines={1} style={styles.metaText}>
                      {formatContinueLabel(entry)}
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <ThemedView
            style={[
              styles.emptyCard,
              {
                backgroundColor: isDark ? 'rgba(7, 22, 44, 0.72)' : 'rgba(255, 255, 255, 0.72)',
              },
            ]}
          >
            <ThemedText selectable style={styles.emptyCopy}>
              Update entry notes, progress, or status to keep working from here.
            </ThemedText>
          </ThemedView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    gap: 28,
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 22,
  },
  rowViewport: {
    marginHorizontal: -20,
    overflow: 'visible',
  },
  rowContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 4,
    overflow: 'visible',
  },
  quickAccessContent: {
    alignItems: 'flex-start',
    gap: CARD_GAP,
    paddingHorizontal: SECTION_HORIZONTAL_PADDING,
    paddingVertical: 4,
  },
  quickAccessColumn: {
    gap: CARD_GAP,
  },
  quickAccessItem: {
    gap: 8,
  },
  quickAccessCardShell: {
    borderRadius: 22,
    boxShadow: '0 12px 28px rgba(7, 22, 44, 0.12)',
  },
  quickAccessCard: {
    borderCurve: 'continuous',
    borderRadius: 22,
    overflow: 'hidden',
  },
  quickAccessThumbnail: {
    aspectRatio: 1,
  },
  quickAccessTitle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  cardShell: {
    borderRadius: 22,
    boxShadow: '0 12px 28px rgba(7, 22, 44, 0.12)',
    width: 168,
  },
  card: {
    borderCurve: 'continuous',
    borderRadius: 22,
    overflow: 'hidden',
  },
  thumbnail: {
    aspectRatio: 0.78,
    width: '100%',
  },
  cardCopy: {
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.68,
  },
  emptyCard: {
    borderCurve: 'continuous',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emptyCopy: {
    opacity: 0.72,
  },
});
