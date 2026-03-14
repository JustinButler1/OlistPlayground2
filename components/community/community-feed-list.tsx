import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, ThemePalette } from '@/constants/theme';
import {
  MOCK_COMMUNITY_FEED,
  type CommunityFeedItem,
  type CommunityFeedMedia,
} from '@/data/mock-community-feed';
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
  const supportsLiquidGlass = process.env.EXPO_OS === 'ios' && isGlassEffectAPIAvailable();
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
        <CommunityFeedCard
          key={item.id}
          colors={colors}
          isDark={isDark}
          item={item}
          supportsLiquidGlass={supportsLiquidGlass}
          width={cardWidth}
        />
      ))}
    </View>
  );
}

function CommunityFeedCard({
  colors,
  isDark,
  item,
  supportsLiquidGlass,
  width,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  isDark: boolean;
  item: CommunityFeedItem;
  supportsLiquidGlass: boolean;
  width: number;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          width,
          boxShadow: isDark
            ? '0 24px 44px rgba(1, 8, 17, 0.24)'
            : '0 22px 44px rgba(7, 22, 44, 0.10)',
        },
      ]}
    >
      {supportsLiquidGlass ? (
        <GlassView glassEffectStyle="regular" style={styles.cardSurfaceFill} />
      ) : (
        <BlurView
          intensity={90}
          tint="systemMaterial"
          style={[
            styles.cardSurfaceFill,
            {
              backgroundColor: isDark ? 'rgba(5, 18, 35, 0.58)' : 'rgba(245, 248, 252, 0.68)',
            },
          ]}
        />
      )}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(78, 40, 153, 0.32)', 'rgba(19, 158, 193, 0.16)']
            : ['rgba(78, 40, 153, 0.12)', 'rgba(19, 158, 193, 0.10)']
        }
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.cardTint}
      />
      <View
        pointerEvents="none"
        style={[
          styles.cardBorder,
          {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(7, 22, 44, 0.08)',
          },
        ]}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.identityGroup}>
            <LinearGradient colors={item.avatarGradient} style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {buildInitials(item.author)}
              </ThemedText>
            </LinearGradient>
            <View style={styles.identityCopy}>
              <ThemedText style={styles.authorName}>{item.author}</ThemedText>
              <ThemedText style={[styles.metaText, { color: colors.icon }]}>
                {item.handle} · {item.timeAgo}
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.moreButton,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(7, 22, 44, 0.06)',
              },
            ]}
          >
            <IconSymbol name="ellipsis" size={18} color={colors.icon} />
          </View>
        </View>

        <ThemedText style={styles.bodyText}>{item.body}</ThemedText>

        {item.media ? <FeedMedia colors={colors} isDark={isDark} media={item.media} /> : null}

        <View style={styles.cardFooter}>
          <StatPill colors={colors} isDark={isDark} label={item.likesLabel} />
          <StatPill colors={colors} isDark={isDark} label={item.repliesLabel} />
        </View>
      </View>
    </View>
  );
}

function FeedMedia({
  colors,
  isDark,
  media,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  isDark: boolean;
  media: CommunityFeedMedia;
}) {
  if (media !== 'wellness-breakfast') {
    return null;
  }

  return <WellnessBreakfastIllustration colors={colors} isDark={isDark} />;
}

function WellnessBreakfastIllustration({
  colors,
  isDark,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  isDark: boolean;
}) {
  const chipShadow = isDark ? 'rgba(5, 18, 35, 0.28)' : 'rgba(7, 22, 44, 0.12)';

  return (
    <View style={styles.mediaFrame}>
      <LinearGradient
        colors={isDark ? ['#10304d', '#1f224d', '#0e2534'] : ['#eff6fb', '#dfeaf7', '#edf4ff']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.mediaBackground}
      />
      <LinearGradient
        colors={['rgba(19, 158, 193, 0.18)', 'rgba(78, 40, 153, 0.18)']}
        end={{ x: 1, y: 0.2 }}
        start={{ x: 0, y: 1 }}
        style={styles.mediaColorWash}
      />
      <View
        style={[
          styles.mediaSurfaceBorder,
          { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(7, 22, 44, 0.07)' },
        ]}
      />
      <View style={[styles.plateShadow, { backgroundColor: chipShadow }]} />
      <View style={styles.plate}>
        <View style={[styles.bowl, { backgroundColor: isDark ? '#24354f' : '#31486e' }]}>
          <View style={[styles.bowlInner, { backgroundColor: isDark ? '#0d1a29' : '#15263d' }]} />
          <View style={[styles.fruitLarge, styles.orangeSlice, { left: 22, top: 26 }]} />
          <View style={[styles.fruitLarge, styles.orangeSlice, { left: 54, top: 80 }]} />
          <View style={[styles.fruitLarge, styles.orangeSlice, { left: 86, top: 38 }]} />
          <View style={[styles.fruitLarge, styles.orangeSlice, { left: 120, top: 86 }]} />
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={`banana-${index}`}
              style={[
                styles.bananaSlice,
                {
                  left: 84 + index * 18,
                  top: 46 + (index % 2) * 24,
                },
              ]}
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={`berry-${index}`}
              style={[
                styles.berry,
                {
                  left: 64 + (index % 3) * 16,
                  top: 116 + Math.floor(index / 3) * 16,
                },
              ]}
            />
          ))}
          {[0, 1, 2, 3, 4].map((index) => (
            <View
              key={`seed-${index}`}
              style={[
                styles.seed,
                {
                  left: 34 + index * 11,
                  top: 118 + (index % 2) * 12,
                  backgroundColor: index % 2 === 0 ? '#5b4123' : '#836337',
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.avocadoHalf, { left: 18, top: 30, transform: [{ rotate: '-18deg' }] }]}>
        <View style={styles.avocadoPit} />
      </View>
      <View style={[styles.avocadoHalf, { left: 40, top: 92, transform: [{ rotate: '20deg' }] }]}>
        <View style={[styles.avocadoPit, { left: 15, top: 11 }]} />
      </View>

      <View style={[styles.orangeOrb, { right: 18, bottom: 22 }]} />
      <View style={[styles.orangeOrb, { right: 62, top: 18, width: 34, height: 34 }]} />
      <View style={[styles.kiwiOrb, { right: 36, top: 62 }]} />
      <View style={[styles.kiwiOrb, { right: 18, top: 94, width: 22, height: 22 }]} />
      <View style={[styles.flaxPile, { left: 12, bottom: 18 }]} />

      <View
        style={[
          styles.mediaCaption,
          {
            backgroundColor: isDark ? 'rgba(5, 18, 35, 0.62)' : 'rgba(245, 248, 252, 0.74)',
            borderColor: colors.icon + '20',
          },
        ]}
      >
        <ThemedText style={[styles.mediaCaptionLabel, { color: colors.icon }]}>
          Placeholder visual
        </ThemedText>
        <ThemedText style={styles.mediaCaptionTitle}>Tinted breakfast post</ThemedText>
      </View>
    </View>
  );
}

function StatPill({
  colors,
  isDark,
  label,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  isDark: boolean;
  label: string;
}) {
  return (
    <View
      style={[
        styles.statPill,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(7, 22, 44, 0.05)',
          borderColor: colors.icon + '18',
        },
      ]}
    >
      <View style={[styles.statDot, { backgroundColor: ThemePalette.primaryAccent }]} />
      <ThemedText style={[styles.statLabel, { color: colors.icon }]}>{label}</ThemedText>
    </View>
  );
}

function buildInitials(author: string) {
  return author
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
  card: {
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    borderCurve: 'continuous',
  },
  cardSurfaceFill: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTint: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardContent: {
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  identityGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  identityCopy: {
    flex: 1,
    gap: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  moreButton: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    paddingRight: 6,
  },
  mediaFrame: {
    aspectRatio: 1.33,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaColorWash: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaSurfaceBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
  },
  plateShadow: {
    borderRadius: 120,
    bottom: 42,
    height: 168,
    left: '50%',
    marginLeft: -84,
    opacity: 0.18,
    position: 'absolute',
    width: 168,
  },
  plate: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 120,
    height: 176,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -88,
    marginTop: -88,
    position: 'absolute',
    top: '50%',
    width: 176,
  },
  bowl: {
    alignItems: 'center',
    borderRadius: 68,
    height: 136,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 136,
  },
  bowlInner: {
    borderRadius: 56,
    height: 112,
    position: 'absolute',
    width: 112,
  },
  fruitLarge: {
    borderRadius: 12,
    height: 22,
    position: 'absolute',
    width: 22,
  },
  orangeSlice: {
    backgroundColor: '#f58246',
    borderWidth: 2,
    borderColor: '#ffd5b5',
  },
  bananaSlice: {
    backgroundColor: '#f5e0a7',
    borderColor: '#d7bf78',
    borderRadius: 12,
    borderWidth: 1.5,
    height: 16,
    position: 'absolute',
    width: 16,
  },
  berry: {
    backgroundColor: '#3b254e',
    borderRadius: 8,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  seed: {
    borderRadius: 4,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  avocadoHalf: {
    backgroundColor: '#74b66f',
    borderRadius: 22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: 40,
    position: 'absolute',
    width: 28,
  },
  avocadoPit: {
    backgroundColor: '#7e4c28',
    borderRadius: 7,
    height: 14,
    left: 8,
    position: 'absolute',
    top: 12,
    width: 14,
  },
  orangeOrb: {
    backgroundColor: '#f1873f',
    borderRadius: 24,
    height: 42,
    position: 'absolute',
    width: 42,
  },
  kiwiOrb: {
    backgroundColor: '#8fd15c',
    borderRadius: 12,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  flaxPile: {
    backgroundColor: '#6c5335',
    borderRadius: 18,
    height: 24,
    opacity: 0.9,
    position: 'absolute',
    width: 46,
  },
  mediaCaption: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 14,
    gap: 2,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
  },
  mediaCaptionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mediaCaptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
