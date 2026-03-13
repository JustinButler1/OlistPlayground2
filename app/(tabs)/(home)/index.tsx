import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const QUICK_ACCESS = [
  {
    title: 'Watchlist',
    body: '12 titles waiting',
    badge: 'Pinned',
  },
  {
    title: 'Reading queue',
    body: '3 books in progress',
    badge: 'Resume',
  },
  {
    title: 'Wishlist',
    body: '8 saves from this week',
    badge: 'Fresh',
  },
  {
    title: 'Import links',
    body: '2 drafts ready',
    badge: 'Action',
  },
];

const RECENT_ACTIVITY = [
  {
    title: 'Added Dune: Part Two',
    detail: 'Moved into Movies watchlist',
    time: '18m ago',
  },
  {
    title: 'Finished Blue Lock Vol. 1',
    detail: 'Rated 4.5 and added notes',
    time: '2h ago',
  },
  {
    title: 'Shared your Cozy Games list',
    detail: '4 people opened it today',
    time: 'Yesterday',
  },
];

const PEOPLE_YOU_FOLLOW = [
  {
    name: 'Maya Chen',
    detail: 'Started Solo Leveling and saved two anime recs.',
    status: 'Active now',
  },
  {
    name: 'Jordan Park',
    detail: 'Updated a sci-fi movie stack with three new picks.',
    status: '3 new items',
  },
  {
    name: 'Avery Brooks',
    detail: 'Reviewed The Bear and followed your TV tracker.',
    status: 'Following back',
  },
];

const CONTINUE_TRACKING = [
  {
    title: 'Blue Eye Samurai',
    detail: 'Episode 5 is next in your queue.',
    progress: '4 of 8 logged',
  },
  {
    title: 'Project Hail Mary',
    detail: 'Resume at chapter 11 from your notes.',
    progress: '42% complete',
  },
];

const FOR_YOU = [
  {
    title: 'Weekend comfort picks',
    detail: 'Light TV, cozy games, and short reads based on your recent activity.',
  },
  {
    title: 'Friends are into prestige sci-fi',
    detail: 'Five people you follow added the same franchise this week.',
  },
];

type SectionIconName =
  | 'pin.fill'
  | 'list.bullet'
  | 'person.3.fill'
  | 'play.circle.fill'
  | 'square.grid.2x2';

function SectionHeader({
  icon,
  title,
  subtitle,
  iconColor,
  isDark,
}: {
  icon: SectionIconName;
  title: string;
  subtitle: string;
  iconColor: string;
  isDark: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIconWrap,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.58)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(42, 27, 96, 0.08)',
          },
        ]}
      >
        <IconSymbol name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.sectionHeaderText}>
        <ThemedText selectable type="subtitle" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        <ThemedText
          selectable
          style={[
            styles.sectionSubtitle,
            { color: isDark ? 'rgba(255, 255, 255, 0.68)' : 'rgba(7, 22, 44, 0.68)' },
          ]}
        >
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isDark = colorScheme === 'dark';
  const isWide = width >= 900;
  const textColor = isDark ? ThemePalette.white : ThemePalette.ink;
  const mutedTextColor = isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(7, 22, 44, 0.72)';
  const softTextColor = isDark ? 'rgba(255, 255, 255, 0.62)' : 'rgba(7, 22, 44, 0.62)';
  const surfaceColor = isDark ? 'rgba(5, 18, 35, 0.78)' : 'rgba(245, 248, 252, 0.82)';
  const elevatedSurfaceColor = isDark ? 'rgba(7, 24, 45, 0.88)' : 'rgba(255, 255, 255, 0.88)';
  const borderColor = isDark ? 'rgba(19, 158, 193, 0.16)' : 'rgba(42, 27, 96, 0.08)';
  const accentColor = isDark ? '#73d3f0' : ThemePalette.primaryBrand;
  const accentSurface = isDark ? 'rgba(19, 158, 193, 0.12)' : 'rgba(78, 40, 153, 0.08)';

  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Home',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: elevatedSurfaceColor,
              borderColor,
            },
          ]}
        >
          <ThemedText
            selectable
            style={[
              styles.heroEyebrow,
              { color: mutedTextColor },
            ]}
          >
            Home overview
          </ThemedText>
          <ThemedText
            selectable
            type="title"
            style={[styles.heroTitle, { color: textColor }]}
          >
            Your lists, activity, and people in one place
          </ThemedText>
          <ThemedText
            selectable
            style={[styles.heroBody, { color: mutedTextColor }]}
          >
            Start from pinned spaces, catch up on recent changes, and see what the people you
            follow are doing without leaving the home tab.
          </ThemedText>
          <View style={styles.heroMetrics}>
            <View style={[styles.metricPill, { backgroundColor: accentSurface }]}>
              <ThemedText selectable style={[styles.metricValue, { color: accentColor }]}>
                6
              </ThemedText>
              <ThemedText selectable style={[styles.metricLabel, { color: mutedTextColor }]}>
                active lists
              </ThemedText>
            </View>
            <View style={[styles.metricPill, { backgroundColor: accentSurface }]}>
              <ThemedText selectable style={[styles.metricValue, { color: accentColor }]}>
                14
              </ThemedText>
              <ThemedText selectable style={[styles.metricLabel, { color: mutedTextColor }]}>
                friend updates
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
          <SectionHeader
            icon="pin.fill"
            title="Quick Access"
            subtitle="Pinned shortcuts for the spaces you open most."
            iconColor={accentColor}
            isDark={isDark}
          />
          <View style={styles.quickAccessGrid}>
            {QUICK_ACCESS.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.quickAccessTile,
                  { backgroundColor: elevatedSurfaceColor, borderColor },
                ]}
              >
                <ThemedText selectable type="defaultSemiBold" style={[styles.tileTitle, { color: textColor }]}>
                  {item.title}
                </ThemedText>
                <ThemedText selectable style={[styles.tileBody, { color: mutedTextColor }]}>
                  {item.body}
                </ThemedText>
                <View style={[styles.badge, { backgroundColor: accentSurface }]}>
                  <ThemedText selectable style={[styles.badgeText, { color: accentColor }]}>
                    {item.badge}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
          <SectionHeader
            icon="list.bullet"
            title="Recent activity"
            subtitle="The latest actions across your lists."
            iconColor={accentColor}
            isDark={isDark}
          />
          <View style={styles.feedList}>
            {RECENT_ACTIVITY.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.feedRow,
                  {
                    borderBottomWidth: index === RECENT_ACTIVITY.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderColor,
                  },
                ]}
              >
                <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
                <View style={styles.feedRowContent}>
                  <ThemedText selectable type="defaultSemiBold" style={{ color: textColor }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText selectable style={[styles.feedBody, { color: mutedTextColor }]}>
                    {item.detail}
                  </ThemedText>
                </View>
                <ThemedText selectable style={[styles.feedTime, { color: softTextColor }]}>
                  {item.time}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: surfaceColor, borderColor }]}>
          <SectionHeader
            icon="person.3.fill"
            title="People you follow"
            subtitle="Recent signals from the community around you."
            iconColor={accentColor}
            isDark={isDark}
          />
          <View style={styles.peopleList}>
            {PEOPLE_YOU_FOLLOW.map((person) => (
              <View
                key={person.name}
                style={[styles.personCard, { backgroundColor: elevatedSurfaceColor, borderColor }]}
              >
                <View style={styles.personTopRow}>
                  <View style={[styles.avatar, { backgroundColor: accentSurface }]}>
                    <ThemedText selectable style={[styles.avatarText, { color: accentColor }]}>
                      {person.name.slice(0, 1)}
                    </ThemedText>
                  </View>
                  <View style={styles.personText}>
                    <ThemedText selectable type="defaultSemiBold" style={{ color: textColor }}>
                      {person.name}
                    </ThemedText>
                    <ThemedText selectable style={[styles.feedBody, { color: mutedTextColor }]}>
                      {person.detail}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.statusChip, { backgroundColor: accentSurface }]}>
                  <ThemedText selectable style={[styles.statusText, { color: accentColor }]}>
                    {person.status}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.dualSectionRow, isWide && styles.dualSectionRowWide]}>
          <View
            style={[
              styles.halfSectionCard,
              isWide && styles.halfSectionCardWide,
              { backgroundColor: surfaceColor, borderColor },
            ]}
          >
            <SectionHeader
              icon="play.circle.fill"
              title="Continue"
              subtitle="Pick up where you paused."
              iconColor={accentColor}
              isDark={isDark}
            />
            <View style={styles.compactList}>
              {CONTINUE_TRACKING.map((item) => (
                <View key={item.title} style={[styles.compactCard, { backgroundColor: elevatedSurfaceColor, borderColor }]}>
                  <ThemedText selectable type="defaultSemiBold" style={{ color: textColor }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText selectable style={[styles.feedBody, { color: mutedTextColor }]}>
                    {item.detail}
                  </ThemedText>
                  <ThemedText selectable style={[styles.compactMeta, { color: accentColor }]}>
                    {item.progress}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.halfSectionCard,
              isWide && styles.halfSectionCardWide,
              { backgroundColor: surfaceColor, borderColor },
            ]}
          >
            <SectionHeader
              icon="square.grid.2x2"
              title="For you"
              subtitle="Collections that fit your taste."
              iconColor={accentColor}
              isDark={isDark}
            />
            <View style={styles.compactList}>
              {FOR_YOU.map((item) => (
                <View key={item.title} style={[styles.compactCard, { backgroundColor: elevatedSurfaceColor, borderColor }]}>
                  <ThemedText selectable type="defaultSemiBold" style={{ color: textColor }}>
                    {item.title}
                  </ThemedText>
                  <ThemedText selectable style={[styles.feedBody, { color: mutedTextColor }]}>
                    {item.detail}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </TabRootBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    gap: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroOffset: {
    height: 168,
  },
  heroCard: {
    borderCurve: 'continuous',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 24,
    boxShadow: '0 18px 48px rgba(4, 12, 24, 0.14)',
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 420,
  },
  heroMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  metricPill: {
    borderCurve: 'continuous',
    borderRadius: 18,
    gap: 2,
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricValue: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 24,
  },
  metricLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 20,
    boxShadow: '0 10px 32px rgba(4, 12, 24, 0.1)',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  sectionIconWrap: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAccessTile: {
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 10,
    minHeight: 128,
    padding: 16,
  },
  tileTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  tileBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    borderCurve: 'continuous',
    borderRadius: 999,
    marginTop: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  feedList: {
    gap: 2,
  },
  feedRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  timelineDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 7,
    width: 10,
  },
  feedRowContent: {
    flex: 1,
    gap: 2,
  },
  feedBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  feedTime: {
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 1,
  },
  peopleList: {
    gap: 12,
  },
  personCard: {
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  personTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  personText: {
    flex: 1,
    gap: 2,
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderCurve: 'continuous',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dualSectionRow: {
    gap: 18,
  },
  dualSectionRowWide: {
    flexDirection: 'row',
  },
  halfSectionCard: {
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    padding: 20,
    boxShadow: '0 10px 32px rgba(4, 12, 24, 0.1)',
  },
  halfSectionCardWide: {
    flex: 1,
  },
  compactList: {
    gap: 12,
  },
  compactCard: {
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  compactMeta: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
