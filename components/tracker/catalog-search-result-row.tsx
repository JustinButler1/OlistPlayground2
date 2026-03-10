import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CatalogSearchItem } from '@/services/catalog';

export const CATALOG_SEARCH_RESULT_ROW_GAP = 18;

interface CatalogSearchResultRowProps {
  item: CatalogSearchItem;
  href?: Href;
  onPress?: () => void;
  rightAccessory?: ReactNode;
  accessibilityLabel?: string;
}

export function CatalogSearchResultRow({
  item,
  href,
  onPress,
  rightAccessory,
  accessibilityLabel,
}: CatalogSearchResultRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const content = (
    <View style={styles.resultMain}>
      {href ? (
        <Link.AppleZoom>
          <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultImage} />
        </Link.AppleZoom>
      ) : (
        <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultImage} />
      )}
      <View style={styles.resultInfo}>
        <ThemedText style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        {item.author ? (
          <ThemedText style={[styles.resultMeta, { color: colors.text }]} numberOfLines={1}>
            {item.author}
          </ThemedText>
        ) : null}
        {item.location ? (
          <ThemedText style={[styles.resultMeta, { color: colors.icon }]} numberOfLines={1}>
            {item.location}
          </ThemedText>
        ) : null}
        {item.progressLabel ? (
          <ThemedText style={[styles.resultProgress, { color: colors.icon }]} numberOfLines={1}>
            {item.progressLabel}
          </ThemedText>
        ) : null}
        {!item.author && !item.location && item.subtitle ? (
          <ThemedText style={[styles.resultMeta, { color: colors.icon }]} numberOfLines={2}>
            {item.subtitle}
          </ThemedText>
        ) : null}
        {item.tags?.length ? (
          <View style={styles.tagsWrap}>
            {item.tags.map((tag) => (
              <View
                key={`${item.type}-${item.id}-${tag}`}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: colors.icon + '12',
                    borderColor: colors.icon + '20',
                  },
                ]}
              >
                <ThemedText style={[styles.tagText, { color: colors.text }]} numberOfLines={1}>
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );

  const primary = (
    <Pressable
      onPress={href ? undefined : onPress}
      disabled={!href && !onPress}
      style={({ pressed }) => [
        styles.resultMain,
        { opacity: pressed ? 0.82 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Open ${item.title}`}
    >
      {content}
    </Pressable>
  );

  return (
    <View style={styles.resultRow}>
      {href ? (
        <Link href={href} asChild>
          <Link.Trigger>{primary}</Link.Trigger>
        </Link>
      ) : (
        primary
      )}
      {rightAccessory}
    </View>
  );
}

const styles = StyleSheet.create({
  resultRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '90%',
    gap: 14,
  },
  resultImage: {
    width: 96,
    height: 141,
    borderRadius: 4,
    borderCurve: 'continuous',
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultMeta: {
    fontSize: 13,
  },
  resultProgress: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
    maxHeight: 52,
    overflow: 'hidden',
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
  },
});
