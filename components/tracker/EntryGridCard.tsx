import { Pressable, StyleSheet, View } from 'react-native';

import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { ListEntry } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatProgressLabel } from '@/lib/tracker-selectors';

interface EntryGridCardProps {
  entry: ListEntry;
  selected?: boolean;
  onPress?: () => void;
}

export function EntryGridCard({ entry, selected = false, onPress }: EntryGridCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const progressLabel = formatProgressLabel(entry);

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
        style={styles.cover}
      />
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.title}>
          {entry.title}
        </ThemedText>
        <ThemedText style={[styles.meta, { color: colors.icon }]} numberOfLines={1}>
          {progressLabel ?? entry.status}
        </ThemedText>
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
