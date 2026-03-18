import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarIcon } from '@/components/avatar-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ONBOARDING_INTEREST_OPTIONS } from '@/constants/onboarding';
import { Colors } from '@/constants/theme';
import { useTestAccounts } from '@/contexts/test-accounts-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountSnapshots } from '@/hooks/use-account-snapshots';
import { getListStats } from '@/lib/tracker-selectors';

export default function ProfileSheetScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const normalizedAccountId = Array.isArray(accountId) ? accountId[0] : accountId;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const snapshots = useAccountSnapshots();
  const { activeAccountId } = useTestAccounts();
  const snapshot = snapshots.find((item) => item.owner.accountId === normalizedAccountId) ?? null;

  if (!snapshot) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profile' }} />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText selectable>That profile could not be found.</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  const displayName = snapshot.owner.displayName;
  const handle = `@${snapshot.owner.handle.replace(/^@/, '')}`;
  const publicLists = [...snapshot.lists]
    .filter((list) => list.showInMyLists && !list.archivedAt && !list.deletedAt)
    .sort((left, right) => {
      if (!!right.pinnedToProfile !== !!left.pinnedToProfile) {
        return Number(!!right.pinnedToProfile) - Number(!!left.pinnedToProfile);
      }

      return right.updatedAt - left.updatedAt;
    });
  const listCount = publicLists.length;
  const totalEntries = publicLists.reduce((sum, list) => sum + getListStats(list).total, 0);
  const completedEntries = publicLists.reduce((sum, list) => sum + getListStats(list).completed, 0);
  const interestLabels =
    snapshot.onboardingState?.profile.interests
      .map((interestId) => ONBOARDING_INTEREST_OPTIONS.find((item) => item.id === interestId)?.label)
      .filter((value): value is string => !!value) ?? [];
  const statItems = [
    { label: 'Public Lists', value: listCount },
    { label: 'Entries', value: totalEntries },
    { label: 'Completed', value: completedEntries },
    { label: 'Interests', value: interestLabels.length },
  ];
  const surfaceColor = isDark ? 'rgba(5, 18, 35, 0.72)' : 'rgba(245, 248, 252, 0.88)';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : colors.icon + '20';

  return (
    <>
      <Stack.Screen options={{ title: displayName }} />
      <ThemedView style={styles.container}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + 28,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <AvatarIcon
              profileId={snapshot.owner.profileId}
              displayName={displayName}
              size={84}
            />
            <View style={styles.headerCopy}>
              <ThemedText selectable type="title" style={styles.title}>
                {displayName}
              </ThemedText>
              <ThemedText selectable style={[styles.handle, { color: colors.icon }]}>
                {handle}
              </ThemedText>
            </View>
          </View>

          <View style={styles.statsRow}>
            {statItems.map((item) => (
              <View
                key={item.label}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
              >
                <ThemedText selectable style={styles.statValue}>
                  {item.value}
                </ThemedText>
                <ThemedText selectable style={[styles.statLabel, { color: colors.icon }]}>
                  {item.label}
                </ThemedText>
              </View>
            ))}
          </View>

          {interestLabels.length ? (
            <View style={styles.section}>
              <ThemedText type="subtitle">Interests</ThemedText>
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
                    <ThemedText selectable style={{ color: colors.tint }}>
                      {label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <ThemedText type="subtitle">Public Lists</ThemedText>
            {publicLists.length ? (
              <View style={styles.listStack}>
                {publicLists.map((list) => {
                  const stats = getListStats(list);

                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => {
                        router.push({
                          pathname: '/list/[id]',
                          params: {
                            id: list.id,
                            ...(snapshot.owner.accountId !== activeAccountId
                              ? { ownerAccountId: snapshot.owner.accountId }
                              : {}),
                          },
                        });
                      }}
                      style={({ pressed }) => [
                        styles.listCard,
                        {
                          backgroundColor: surfaceColor,
                          borderColor,
                          opacity: pressed ? 0.84 : 1,
                        },
                      ]}
                    >
                      <View style={styles.listCopy}>
                        <View style={styles.listTitleRow}>
                          <ThemedText selectable numberOfLines={1} style={styles.listTitle}>
                            {list.title}
                          </ThemedText>
                          {list.pinnedToProfile ? (
                            <IconSymbol name="pin.fill" size={14} color={colors.tint} />
                          ) : null}
                        </View>
                        <ThemedText selectable style={[styles.listSubtitle, { color: colors.icon }]}>
                          {stats.total} items · {stats.completed} completed
                        </ThemedText>
                      </View>
                      <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
              >
                <ThemedText selectable style={{ color: colors.icon }}>
                  No public lists yet.
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
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
    gap: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    gap: 14,
  },
  headerCopy: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    textAlign: 'center',
  },
  handle: {
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '47%',
    gap: 6,
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  section: {
    gap: 14,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listStack: {
    gap: 10,
  },
  listCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  listTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  listSubtitle: {
    fontSize: 13,
  },
  emptyState: {
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});
