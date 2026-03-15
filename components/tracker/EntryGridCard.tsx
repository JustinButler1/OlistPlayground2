import { Pressable, StyleSheet, View } from 'react-native';

import { RatingStars } from '@/components/tracker/RatingStars';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { ItemUserData, ListEntry } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEffectiveEntryRating } from '@/lib/tracker-metadata';
import { formatProgressLabel } from '@/lib/tracker-selectors';

interface EntryGridCardProps {
  entry: ListEntry;
  selected?: boolean;
  onPress?: () => void;
  itemUserDataByKey?: Record<string, ItemUserData>;
}

export function EntryGridCard({
  entry,
  selected = false,
  onPress,
  itemUserDataByKey,
}: EntryGridCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const progressLabel = formatProgressLabel(entry, itemUserDataByKey);
  const rating = getEffectiveEntryRating(entry, itemUserDataByKey);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? colors.tint : colors.icon + '20',
          backgroundColor: colors.background,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <ThumbnailImage
        imageUrl={entry.coverAssetUri ?? entry.imageUrl}
        sourceRef={entry.sourceRef}
        detailPath={entry.detailPath}
        style={styles.cover}
      />
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.title}>
          {entry.title}
        </ThemedText>
        {progressLabel ?? entry.status ? (
          <ThemedText style={[styles.meta, { color: colors.icon }]} numberOfLines={1}>
            {progressLabel ?? entry.status}
          </ThemedText>
        ) : null}
        {rating ? <RatingStars value={rating} size={12} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
  },
});
