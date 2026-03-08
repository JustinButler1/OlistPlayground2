import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RatingStars } from '@/components/tracker/RatingStars';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useListsQuery } from '@/contexts/lists-context';
import { getEffectiveEntryRating } from '@/lib/tracker-metadata';
import { formatProgressLabel } from '@/lib/tracker-selectors';

export default function ListEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { activeLists, itemUserDataByKey } = useListsQuery();

  const result = useMemo(() => {
    if (!id) {
      return null;
    }

    for (const list of activeLists) {
      const entry = list.entries.find((item) => item.id === id);
      if (entry) {
        return { entry, list };
      }
    }

    return null;
  }, [activeLists, id]);

  return (
    <>
      <Stack.Screen options={{ title: result?.entry.title ?? 'Entry' }} />
      <ThemedView style={styles.container}>
        {!result ? (
          <View style={styles.centered}>
            <ThemedText>This entry could not be found.</ThemedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ThumbnailImage
              imageUrl={result.entry.coverAssetUri ?? result.entry.imageUrl}
              style={styles.cover}
            />
            <ThemedText type="title">{result.entry.title}</ThemedText>
            <ThemedText style={styles.metaText}>{result.list.title}</ThemedText>
            <ThemedText style={styles.metaText}>Status: {result.entry.status}</ThemedText>
            {formatProgressLabel(result.entry, itemUserDataByKey) ? (
              <ThemedText style={styles.metaText}>
                Progress: {formatProgressLabel(result.entry, itemUserDataByKey)}
              </ThemedText>
            ) : null}
            {getEffectiveEntryRating(result.entry, itemUserDataByKey) ? (
              <View style={styles.ratingRow}>
                <ThemedText style={styles.metaText}>Rating:</ThemedText>
                <RatingStars
                  value={getEffectiveEntryRating(result.entry, itemUserDataByKey)}
                  showValue
                />
              </View>
            ) : null}
            {result.entry.tags.length ? (
              <ThemedText style={styles.metaText}>Tags: {result.entry.tags.join(', ')}</ThemedText>
            ) : null}
            {result.entry.notes ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">Notes</ThemedText>
                <ThemedText>{result.entry.notes}</ThemedText>
              </View>
            ) : null}
            {result.entry.productUrl ? (
              <Pressable onPress={() => Linking.openURL(result.entry.productUrl as string)}>
                <ThemedText type="link">Open source link</ThemedText>
              </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 20,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    opacity: 0.75,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
