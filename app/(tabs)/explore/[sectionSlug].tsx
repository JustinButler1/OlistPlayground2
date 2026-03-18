import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ExplorePublicListCard } from '@/components/explore-public-list-card';
import { ThemedText } from '@/components/themed-text';
import { useExplorePublicLists } from '@/hooks/use-explore-public-lists';
import { getExploreSectionBySlug } from '@/lib/explore-public-lists';

const HORIZONTAL_PADDING = 20;
const GRID_GAP = 14;
const MAX_CARD_WIDTH = 148;
const MIN_COLUMNS = 3;

export default function ExploreSectionScreen() {
  const { sectionSlug } = useLocalSearchParams<{ sectionSlug: string }>();
  const { width } = useWindowDimensions();
  const { sections } = useExplorePublicLists();
  const normalizedSectionSlug = Array.isArray(sectionSlug) ? sectionSlug[0] : sectionSlug;
  const section = normalizedSectionSlug ? getExploreSectionBySlug(sections, normalizedSectionSlug) : undefined;

  const availableWidth = Math.max(width - HORIZONTAL_PADDING * 2, 0);
  const columns = Math.max(
    MIN_COLUMNS,
    Math.floor((availableWidth + GRID_GAP) / (MAX_CARD_WIDTH + GRID_GAP))
  );
  const minimumCardWidth =
    (availableWidth - GRID_GAP * (MIN_COLUMNS - 1)) / MIN_COLUMNS;
  const itemWidth = Math.min(
    MAX_CARD_WIDTH,
    Math.max(minimumCardWidth, (availableWidth - GRID_GAP * (columns - 1)) / columns)
  );

  if (!section) {
    return (
      <>
        <Stack.Screen options={{ title: 'Explore' }} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.missingContent}
        >
          <ThemedText selectable>Section not found.</ThemedText>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: section.title }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.gridArea}>
          <View style={styles.grid}>
            {section.items.map((item) => (
              <ExplorePublicListCard key={item.id} item={item} width={itemWidth} />
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 32,
  },
  missingContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 32,
  },
  gridArea: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    justifyContent: 'flex-start',
  },
});
