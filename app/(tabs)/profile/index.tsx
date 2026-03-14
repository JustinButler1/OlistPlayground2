import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarIcon } from '@/components/avatar-icon';
import { TopTabs } from '@/components/reacticx/base/tabs';
import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { ONBOARDING_INTEREST_OPTIONS } from '@/constants/onboarding';
import { Colors } from '@/constants/theme';
import { useListsQuery } from '@/contexts/lists-context';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getListStats } from '@/lib/tracker-selectors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { state, isComplete, isHydrated, isSyncing, lastSyncError } = useOnboarding();
  const { activeLists, deletedLists } = useListsQuery();
  const displayName = state.profile.displayName.trim() || 'Shared Workspace';
  const workspaceId = 'shared-workspace-profile';
  const trackedItems = activeLists.reduce((sum, list) => sum + getListStats(list).total, 0);
  const completedItems = activeLists.reduce((sum, list) => sum + getListStats(list).completed, 0);
  const featuredLists = [...activeLists].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  const interestLabels = state.profile.interests
    .map((interestId) => ONBOARDING_INTEREST_OPTIONS.find((item) => item.id === interestId)?.label)
    .filter(Boolean) as string[];
  const profileStats = [
    { label: 'Following', value: interestLabels.length },
    { label: 'Followers', value: completedItems },
    { label: 'Lists', value: activeLists.length },
    { label: 'Entries', value: trackedItems },
  ];
  const surfaceColor = isDark ? 'rgba(5, 18, 35, 0.64)' : 'rgba(245, 248, 252, 0.78)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : colors.icon + '20';
  const shadowColor = isDark
    ? '0 26px 48px rgba(1, 8, 17, 0.26)'
    : '0 20px 40px rgba(7, 22, 44, 0.12)';
  const listPlaceholders = buildPlaceholderRows('Queue sample', 6, 1);
  const interestPlaceholders = buildPlaceholderRows('Interest thread', 12, 2);
  const statusPlaceholders = buildPlaceholderRows('Status checkpoint', 18, 3);
  const deletedPlaceholders = buildPlaceholderRows('Archive marker', 24, 4);
  const tabs = [
    {
      id: 'lists',
      title: `Public Lists`,
      contentComponent: (
        <ProfileTabPanel>
          <ThemedText style={styles.tabHeading}>Public Lists</ThemedText>
          {featuredLists.length > 0 ? (
            <View style={styles.stack}>
              {featuredLists.map((list) => {
                const stats = getListStats(list);

                return (
                  <View
                    key={list.id}
                    style={[
                      styles.rowCard,
                      {
                        backgroundColor: surfaceColor,
                        borderColor,
                      },
                    ]}
                  >
                    <View style={styles.rowCopy}>
                      <ThemedText numberOfLines={1} selectable style={styles.rowTitle}>
                        {list.title}
                      </ThemedText>
                      <ThemedText
                        selectable
                        style={[styles.rowSubtitle, { color: colors.icon }]}
                      >
                        {stats.total} items - {stats.completed} completed
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <ProfileEmptyState
              accentColor={colors.icon}
              message="No lists yet. Create one from My Lists and it will show up here."
            />
          )}
          <PlaceholderSection
            title="Scroll test dataset"
            subtitle="1x volume with compact list cards."
            items={listPlaceholders}
            colors={colors}
            surfaceColor={surfaceColor}
            borderColor={borderColor}
          />
        </ProfileTabPanel>
      ),
    },
    {
      id: 'posts',
      title: `Posts`,
      contentComponent: (
        <ProfileTabPanel>
          <ThemedText style={styles.tabHeading}>Selected Posts</ThemedText>
          {interestLabels.length > 0 ? (
            <View style={styles.chipWrap}>
              {interestLabels.map((label) => (
                <View
                  key={label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.tint + '14',
                      borderColor: colors.tint + '24',
                    },
                  ]}
                >
                  <ThemedText selectable style={[styles.chipText, { color: colors.tint }]}>
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ProfileEmptyState
              accentColor={colors.icon}
              message="No posts selected yet."
            />
          )}
          <PlaceholderSection
            title="Scroll test dataset"
            subtitle="2x volume with twice as many placeholder rows."
            items={interestPlaceholders}
            colors={colors}
            surfaceColor={surfaceColor}
            borderColor={borderColor}
          />
        </ProfileTabPanel>
      ),
    },
    {
      id: 'communities',
      title: `Communities`,
      contentComponent: (
        <ProfileTabPanel>
          <ThemedText style={styles.tabHeading}>Communities</ThemedText>
          <View
            style={[
              styles.detailCard,
              {
                backgroundColor: surfaceColor,
                borderColor,
              },
            ]}
          >
            <DetailRow
              label="Profile"
              value={isHydrated ? (isComplete ? 'Complete' : 'In progress') : 'Loading'}
            />
            <DetailRow label="Sync" value={isSyncing ? 'Syncing' : 'Up to date'} />
            <DetailRow
              label="Birthday"
              value={state.profile.birthDate ? state.profile.birthDate : 'Not set'}
            />
            <DetailRow
              label="Error"
              value={lastSyncError ? lastSyncError : 'No sync errors'}
              valueColor={lastSyncError ? '#cc3f3f' : colors.icon}
            />
          </View>
          <PlaceholderSection
            title="Scroll test dataset"
            subtitle="3x volume so this tab should run much longer than Lists."
            items={statusPlaceholders}
            colors={colors}
            surfaceColor={surfaceColor}
            borderColor={borderColor}
          />
        </ProfileTabPanel>
      ),
    },
    {
      id: 'likes',
      title: `Likes`,
      contentComponent: (
        <ProfileTabPanel>
          <ThemedText style={styles.tabHeading}>Likes</ThemedText>
          {deletedLists.length > 0 ? (
            <View style={styles.stack}>
              {deletedLists.slice(0, 3).map((list) => (
                <View
                  key={list.id}
                  style={[
                    styles.rowCard,
                    {
                      backgroundColor: surfaceColor,
                      borderColor,
                    },
                  ]}
                >
                  <View style={styles.rowCopy}>
                    <ThemedText numberOfLines={1} selectable style={styles.rowTitle}>
                      {list.title}
                    </ThemedText>
                    <ThemedText
                      selectable
                      style={[styles.rowSubtitle, { color: colors.icon }]}
                    >
                      Removed from the shared workspace
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ProfileEmptyState
              accentColor={colors.icon}
              message="Nothing has been deleted from this shared workspace."
            />
          )}
          <PlaceholderSection
            title="Scroll test dataset"
            subtitle="4x volume for the longest scroll case."
            items={deletedPlaceholders}
            colors={colors}
            surfaceColor={surfaceColor}
            borderColor={borderColor}
          />
        </ProfileTabPanel>
      ),
    },
  ];

  return (
    <TabRootBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: surfaceColor,
              borderColor,
              boxShadow: shadowColor,
            },
          ]}
        >
          <AvatarIcon profileId={workspaceId} size={88} iconSize={42} />
          <View style={styles.identity}>
            <ThemedText selectable style={styles.name}>
              {displayName}
            </ThemedText>
            <ThemedText selectable style={[styles.uid, { color: colors.icon }]}>
              @{workspaceId}
            </ThemedText>
          </View>
          <View style={styles.metricRow}>
            {profileStats.map((metric) => (
              <View key={metric.label} style={styles.metricItem}>
                <ThemedText numberOfLines={1} selectable style={styles.metricValue}>
                  {metric.value}
                </ThemedText>
                <ThemedText
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  selectable
                  style={[styles.metricLabel, { color: colors.icon }]}
                >
                  {metric.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.tabsSection,
            {
              borderTopColor: borderColor,
            },
          ]}
        >
          <TopTabs
            tabs={tabs}
            activeColor={colors.text}
            inactiveColor={colors.icon}
            underlineColor={colors.tint}
            underlineHeight={3}
          />
        </View>
      </ScrollView>
    </TabRootBackground>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <ThemedText selectable style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText
        selectable
        numberOfLines={2}
        style={[styles.detailValue, valueColor ? { color: valueColor } : null]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function ProfileEmptyState({
  accentColor,
  message,
}: {
  accentColor: string;
  message: string;
}) {
  return (
    <View style={styles.emptyState}>
      <ThemedText selectable style={[styles.emptyText, { color: accentColor }]}>
        {message}
      </ThemedText>
    </View>
  );
}

function ProfileTabPanel({ children }: { children: React.ReactNode }) {
  return <View style={styles.tabContent}>{children}</View>;
}

function PlaceholderSection({
  title,
  subtitle,
  items,
  colors,
  surfaceColor,
  borderColor,
}: {
  title: string;
  subtitle: string;
  items: PlaceholderRow[];
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  surfaceColor: string;
  borderColor: string;
}) {
  return (
    <View style={styles.placeholderSection}>
      <View style={styles.placeholderHeader}>
        <ThemedText style={styles.tabHeading}>{title}</ThemedText>
        <ThemedText selectable style={[styles.placeholderSubtitle, { color: colors.icon }]}>
          {subtitle}
        </ThemedText>
      </View>
      <View style={styles.stack}>
        {items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.rowCard,
              {
                backgroundColor: surfaceColor,
                borderColor,
              },
            ]}
          >
            <View style={styles.rowCopy}>
              <ThemedText selectable style={styles.rowTitle}>
                {item.title}
              </ThemedText>
              <ThemedText selectable style={[styles.rowSubtitle, { color: colors.icon }]}>
                {item.subtitle}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

type PlaceholderRow = {
  id: string;
  title: string;
  subtitle: string;
};

function buildPlaceholderRows(prefix: string, count: number, scale: number): PlaceholderRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${scale}-${index + 1}`,
    title: `${prefix} ${index + 1}`,
    subtitle: `Scale ${scale}x placeholder content block ${index + 1} of ${count}.`,
  }));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 20,
  },
  heroCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 18,
  },
  identity: {
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  uid: {
    fontSize: 14,
    lineHeight: 18,
  },
  blurb: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 2,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '500',
    opacity: 0.95,
    textAlign: 'center',
  },
  tabsSection: {
    marginHorizontal: -20,
    marginTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabContent: {
    gap: 14,
  },
  placeholderSection: {
    gap: 12,
  },
  placeholderHeader: {
    gap: 4,
  },
  placeholderSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  tabHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  stack: {
    gap: 10,
  },
  rowCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowCopy: {
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  detailCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
