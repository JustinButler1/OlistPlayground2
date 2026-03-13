import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MOCK_EXPLORE_SECTIONS } from '@/data/mock-explore-sections';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ExplorePlaceholderSections() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.sectionStack}>
      {MOCK_EXPLORE_SECTIONS.map((section) => {
        const hasDetailPage = section.items.length > 6;
        const previewItems = section.items.slice(0, 6);

        const sectionHeaderContent = (
          <View style={styles.sectionHeaderContent}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>
            {hasDetailPage ? (
              <IconSymbol
                name="chevron.right"
                size={18}
                color={isDark ? 'rgba(255,255,255,0.72)' : 'rgba(7,22,44,0.64)'}
              />
            ) : null}
          </View>
        );

        return (
          <View key={section.slug} style={styles.section}>
            <View style={styles.sectionHeader}>
              {hasDetailPage ? (
                <Link
                  href={{
                    pathname: '/explore/[sectionSlug]',
                    params: { sectionSlug: section.slug },
                  }}
                  asChild
                >
                  <Pressable style={styles.sectionHeaderPressable}>
                    {sectionHeaderContent}
                  </Pressable>
                </Link>
              ) : (
                sectionHeaderContent
              )}
            </View>
            <ScrollView
              horizontal
              style={styles.rowViewport}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowContent}
            >
              {previewItems.map((item) => (
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
