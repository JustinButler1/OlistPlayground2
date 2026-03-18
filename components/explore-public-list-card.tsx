import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarIcon } from '@/components/avatar-icon';
import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { Colors } from '@/constants/theme';
import { useTestAccounts } from '@/contexts/test-accounts-context';
import type { ExplorePublicListItem } from '@/lib/explore-public-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ExplorePublicListCard({
  item,
  width,
}: {
  item: ExplorePublicListItem;
  width?: number;
}) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeAccountId } = useTestAccounts();

  return (
    <Pressable
      onPress={() => {
        router.push({
          pathname: '/list/[id]',
          params: {
            id: item.list.id,
            ...(activeAccountId !== item.owner.accountId
              ? { ownerAccountId: item.owner.accountId }
              : {}),
          },
        });
      }}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : styles.defaultWidth,
        {
          backgroundColor:
            colorScheme === 'dark' ? 'rgba(7, 22, 44, 0.74)' : 'rgba(255, 255, 255, 0.84)',
          borderColor: colors.icon + '1f',
          opacity: pressed ? 0.86 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.list.title} by ${item.owner.displayName}`}
    >
      <View style={styles.imageWrap}>
        <ThumbnailImage imageUrl={item.list.imageUrl} style={styles.image} contentFit="cover" />
        <View style={styles.avatarBadge}>
          <AvatarIcon
            profileId={item.owner.profileId}
            displayName={item.owner.displayName}
            size={36}
          />
        </View>
      </View>
      <View style={styles.content}>
        <ThemedText numberOfLines={2} selectable style={[styles.title, { color: colors.text }]}>
          {item.list.title}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    boxShadow: '0 14px 30px rgba(7, 22, 44, 0.12)',
  },
  defaultWidth: {
    width: 148,
  },
  image: {
    width: '100%',
    aspectRatio: 0.72,
  },
  imageWrap: {
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
