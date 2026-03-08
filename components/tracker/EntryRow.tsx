import { Pressable, StyleSheet, View } from 'react-native';

import { RatingStars } from '@/components/tracker/RatingStars';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import type { ItemUserData, ListEntry } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEffectiveEntryRating } from '@/lib/tracker-metadata';
import { formatProgressLabel } from '@/lib/tracker-selectors';

interface EntryRowProps {
  entry: ListEntry;
  subtitle?: string;
  selected?: boolean;
  selectionMode?: boolean;
  onPress?: () => void;
  onSelectToggle?: () => void;
  trailingLabel?: string;
  itemUserDataByKey?: Record<string, ItemUserData>;
}

export function EntryRow({
  entry,
  subtitle,
  selected = false,
  selectionMode = false,
  onPress,
  onSelectToggle,
  trailingLabel,
  itemUserDataByKey,
}: EntryRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const progressLabel = formatProgressLabel(entry, itemUserDataByKey);
  const rating = getEffectiveEntryRating(entry, itemUserDataByKey);

  return (
    <Pressable
      onPress={selectionMode ? onSelectToggle : onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: selected ? colors.tint : colors.icon + '25',
          backgroundColor: selected ? colors.tint + '14' : colors.background,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      {selectionMode ? (
        <View
          style={[
            styles.selectionBubble,
            {
              borderColor: colors.tint,
              backgroundColor: selected ? colors.tint : 'transparent',
            },
          ]}
        >
          {selected ? (
            <IconSymbol name="checkmark" size={14} color={colors.background} />
          ) : null}
        </View>
      ) : null}
      <ThumbnailImage imageUrl={entry.coverAssetUri ?? entry.imageUrl} style={styles.cover} />
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>
          {entry.title}
        </ThemedText>
        <View style={styles.metaRow}>
          <View style={[styles.statusChip, { backgroundColor: colors.tint + '18' }]}>
            <ThemedText style={[styles.statusText, { color: colors.tint }]}>
              {entry.status}
            </ThemedText>
          </View>
          {progressLabel ? (
            <ThemedText style={[styles.metaText, { color: colors.icon }]}>
              {progressLabel}
            </ThemedText>
          ) : null}
          {rating ? (
            <RatingStars value={rating} size={12} />
          ) : null}
        </View>
        {subtitle ? (
          <ThemedText style={[styles.subtitle, { color: colors.icon }]} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : entry.tags.length ? (
          <ThemedText style={[styles.subtitle, { color: colors.icon }]} numberOfLines={1}>
            {entry.tags.join(' | ')}
          </ThemedText>
        ) : null}
      </View>
      {trailingLabel ? (
        <ThemedText style={[styles.trailingLabel, { color: colors.icon }]}>
          {trailingLabel}
        </ThemedText>
      ) : (
        <IconSymbol name="chevron.right" size={18} color={colors.icon} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  selectionBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: 58,
    height: 82,
    borderRadius: 14,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  trailingLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
