import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { CommunityPostCard } from '@/components/community/community-post-card';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { MOCK_COMMUNITY_FEED, type CommunityFeedItem } from '@/data/mock-community-feed';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function CommunityFeedList({
  badgeLabel = 'Placeholder feed preview',
  description,
  items = MOCK_COMMUNITY_FEED,
}: {
  badgeLabel?: string;
  description?: string;
  items?: CommunityFeedItem[];
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 720);

  return (
    <View style={styles.feed}>
      <View
        style={[
          styles.headerBadge,
          {
            backgroundColor: isDark ? 'rgba(245, 248, 252, 0.08)' : 'rgba(7, 22, 44, 0.05)',
            borderColor: colors.icon + '1E',
          },
        ]}
      >
        <ThemedText style={[styles.headerBadgeText, { color: colors.icon }]}>
          {badgeLabel}
        </ThemedText>
      </View>
      {description ? (
        <ThemedText selectable style={[styles.descriptionText, { color: colors.icon }]}>
          {description}
        </ThemedText>
      ) : null}
      {items.map((item) => (
        <CommunityPostCard key={item.id} colors={colors} isDark={isDark} item={item} width={cardWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: {
    alignItems: 'center',
    gap: 18,
  },
  headerBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 720,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
