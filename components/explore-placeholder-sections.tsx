import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PLACEHOLDER_SECTIONS = [
  {
    title: 'Things You Might Like',
    items: ['Weekend Queue', 'Hidden Gems', 'Top Rated', 'Editor Picks', 'Fresh Finds'],
  },
  {
    title: 'Near You',
    items: ['Local Favorites', 'Popular Nearby', 'Friends Are Watching', 'Book Clubs', 'Game Nights'],
  },
  {
    title: 'More Anime',
    items: ['Shonen Picks', 'Late Night Anime', 'Fantasy Worlds', 'Underrated Series', 'Seasonal Buzz'],
  },
  {
    title: 'More Books',
    items: ['Page Turners', 'Award Winners', 'BookTok Picks', 'Cozy Reads', 'Longform Favorites'],
  },
  {
    title: 'More TV/Movies',
    items: ['Slow Burn', 'Emotional Picks', 'Award Winners', 'Sleeper Hits', 'Late Night'],
  },
] as const;

export function ExplorePlaceholderSections() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.sectionStack}>
      {PLACEHOLDER_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            <ThemedText
              style={[
                styles.sectionMeta,
                { color: isDark ? 'rgba(255,255,255,0.72)' : 'rgba(7,22,44,0.64)' },
              ]}
            >
              Placeholder
            </ThemedText>
          </View>
          <ScrollView
            horizontal
            style={styles.rowViewport}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rowContent}
          >
            {section.items.map((item) => (
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
                  <View style={styles.cardCopy}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {item}
                    </ThemedText>
                    <ThemedText
                      numberOfLines={1}
                      style={[
                        styles.cardMeta,
                        { color: isDark ? 'rgba(255,255,255,0.68)' : ThemePalette.secondaryAccent },
                      ]}
                    >
                      Placeholder row item
                    </ThemedText>
                  </View>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 22,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
    width: '100%',
    aspectRatio: 0.72,
  },
  cardCopy: {
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  cardMeta: {
    fontSize: 13,
  },
});
