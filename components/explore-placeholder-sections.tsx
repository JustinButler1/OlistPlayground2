import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExplorePublicListCard } from '@/components/explore-public-list-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useExplorePublicLists } from '@/hooks/use-explore-public-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ExplorePlaceholderSections() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { sections } = useExplorePublicLists();

  if (!sections.length) {
    return (
      <View style={styles.emptyState}>
        <ThemedText selectable style={styles.emptyText}>
          Public lists will appear here once the seeded accounts finish loading.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.sectionStack}>
      {sections.map((section) => {
        const previewItems = section.items.slice(0, 8);

        const sectionHeaderContent = (
          <View style={styles.sectionHeaderContent}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <IconSymbol
              name="chevron.right"
              size={18}
              color={isDark ? 'rgba(255,255,255,0.72)' : 'rgba(7,22,44,0.64)'}
            />
          </View>
        );

        return (
          <View key={section.slug} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Link
                href={{
                  pathname: '/explore/[sectionSlug]',
                  params: { sectionSlug: section.slug },
                }}
                asChild
              >
                <Pressable style={styles.sectionHeaderPressable}>{sectionHeaderContent}</Pressable>
              </Link>
            </View>
            <ScrollView
              horizontal
              style={styles.rowViewport}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowContent}
            >
              {previewItems.map((item) => (
                <ExplorePublicListCard key={item.id} item={item} />
              ))}
            </ScrollView>
          </View>
        );
      })}
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
  sectionHeaderContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sectionHeaderPressable: {
    alignSelf: 'flex-start',
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
  emptyState: {
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
