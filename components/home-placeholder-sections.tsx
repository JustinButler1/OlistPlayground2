import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HOME_SECTIONS = [
  {
    title: 'Quick Access',
    slug: 'quick-access',
    items: ['Watchlist', 'Reading queue', 'Wishlist', 'Import links'],
  },
  {
    title: 'Recent activity',
    slug: 'recent-activity',
    items: ['Dune: Part Two', 'Blue Lock Vol. 1', 'Cozy Games', 'Movie watchlist'],
  },
  {
    title: 'People you follow',
    slug: 'people-you-follow',
    items: ['Maya Chen', 'Jordan Park', 'Avery Brooks', 'Theo James'],
  },
  {
    title: 'Continue',
    slug: 'continue',
    items: ['Blue Eye Samurai', 'Project Hail Mary', 'Hades II', 'Frieren'],
  },
  {
    title: 'For you',
    slug: 'for-you',
    items: [
      'Weekend comfort picks',
      'Prestige sci-fi',
      'Low-commitment reads',
      'Late-night anime',
      'Cozy co-op games',
      'Award-season movies',
    ],
  },
] as const;

export function HomePlaceholderSections() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.sectionStack}>
      {HOME_SECTIONS.map((section) => (
        <View key={section.slug} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <ThemedText selectable type="subtitle" style={styles.sectionTitle}>
                {section.title}
              </ThemedText>
            </View>
          </View>
          <ScrollView
            horizontal
            style={styles.rowViewport}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowContent}
          >
            {section.items.slice(0, 6).map((item) => (
              <View key={item} style={styles.cardShell}>
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
                  <ThumbnailImage style={styles.thumbnail} />
                </ThemedView>
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
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
  cardShell: {
    borderRadius: 22,
    boxShadow: '0 12px 28px rgba(7, 22, 44, 0.12)',
    width: 148,
  },
  card: {
    borderCurve: 'continuous',
    borderRadius: 22,
    overflow: 'hidden',
  },
  thumbnail: {
    aspectRatio: 0.72,
    width: '100%',
  },
});
