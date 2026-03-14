import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AvatarIcon } from '@/components/avatar-icon';
import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists, deletedLists } = useListsQuery();
  const { loadMockData } = useListActions();
  const { isComplete, isHydrated, isSyncing, state } = useOnboarding();
  const hasStarted =
    !!state.profile.displayName.trim() ||
    !!state.profile.birthDate ||
    !!state.profile.avatarUri ||
    state.profile.interests.length > 0;

  const confirmLoadMockData = () => {
    const runLoad = () => {
      void loadMockData();
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (
        window.confirm(
          'Replace the shared Convex workspace with the power-user mock workspace? This overwrites the current shared lists and templates.'
        )
      ) {
        runLoad();
      }
      return;
    }

    Alert.alert(
      'Load mock data?',
      'Replace the shared Convex workspace with a seeded power-user workspace. This overwrites the current shared lists and templates.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load', style: 'destructive', onPress: runLoad },
      ]
    );
  };

  return (
    <TabRootBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            {
              borderColor: colors.icon + '20',
              backgroundColor: colors.background,
            },
          ]}
        >
          <ThemedText type="subtitle">Data</ThemedText>
          <ThemedText style={[styles.supportingText, { color: colors.icon }]}>
            This app now uses one shared Convex workspace. Images and tracker data persist from Convex, and reminder schedules are regenerated per device from Convex reminder times.
          </ThemedText>
          <ThemedText style={styles.metricsText}>
            {activeLists.length} active lists, {deletedLists.length} deleted lists
          </ThemedText>
          <Pressable
            onPress={confirmLoadMockData}
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor: colors.tint,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <IconSymbol name="plus" size={18} color={colors.background} />
            <ThemedText style={[styles.primaryActionText, { color: colors.background }]}>
              Load Power-User Mock Data
            </ThemedText>
          </Pressable>
          <ThemedText style={[styles.caption, { color: colors.icon }]}>
            Imports a seeded workspace with common list types, realistic custom items, linked
            sublists, tier data, archived history, deleted lists, templates, and API-backed entries.
          </ThemedText>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.icon + '20',
            },
          ]}
        >
          <ThemedText type="subtitle">Tools</ThemedText>
          <Pressable
            onPress={() => router.push('/product-import')}
            style={({ pressed }) => [
              styles.linkRow,
              { backgroundColor: colors.icon + '15', opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <IconSymbol name="link" size={24} color={colors.tint} />
            <ThemedText style={[styles.linkText, { color: colors.text }]}>
              Import Product from URL
            </ThemedText>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.icon + '20',
            },
          ]}
        >
          <ThemedText type="subtitle">Onboarding</ThemedText>
          <View style={styles.avatarRow}>
            <AvatarIcon profileId="shared-workspace-profile" />
            <View style={styles.avatarCopy}>
              <ThemedText style={styles.avatarTitle}>Shared profile avatar</ThemedText>
              <ThemedText style={[styles.caption, { color: colors.icon }]}>
                Profile photos are not implemented yet, so this currently shows the generic avatar.
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.supportingText, { color: colors.icon }]}>
            {isHydrated
              ? isComplete
                ? `Shared workspace profile complete with ${state.profile.interests.length} saved interests.`
                : hasStarted
                  ? 'Resume the shared Convex-backed profile setup from where you left off.'
                  : 'Launch the shared workspace onboarding flow from here.'
              : 'Loading shared workspace profile...'}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile-onboarding')}
            style={({ pressed }) => [
              styles.linkRow,
              { backgroundColor: colors.icon + '15', opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <IconSymbol
              name={isComplete ? 'checkmark' : 'person.fill'}
              size={24}
              color={colors.tint}
            />
            <View style={styles.linkCopy}>
              <ThemedText style={[styles.linkText, { color: colors.text }]}>
                {isComplete
                  ? 'Review Onboarding'
                  : hasStarted
                    ? 'Resume Onboarding'
                    : 'Start Onboarding'}
              </ThemedText>
              <ThemedText style={[styles.linkCaption, { color: colors.icon }]}>
                Shared across the app. Never launched automatically.
              </ThemedText>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </Pressable>
          {isSyncing ? (
            <ThemedText style={[styles.caption, { color: colors.icon }]}>
              Syncing Convex workspace changes...
            </ThemedText>
          ) : null}
        </View>
      </ScrollView>
    </TabRootBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  supportingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  metricsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryAction: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linkCopy: {
    flex: 1,
    gap: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCopy: {
    flex: 1,
    gap: 4,
  },
  avatarTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  linkCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
});
