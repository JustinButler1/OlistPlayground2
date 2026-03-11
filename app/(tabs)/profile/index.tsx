import { Stack, useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists, deletedLists } = useListsQuery();
  const { loadMockData } = useListActions();

  const confirmLoadMockData = () => {
    const runLoad = () => loadMockData();
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (
        window.confirm(
          'Replace your current list data with the power-user mock workspace? This overwrites existing lists on this device.'
        )
      ) {
        runLoad();
      }
      return;
    }

    Alert.alert(
      'Load mock data?',
      'Replace your current lists with a seeded power-user workspace. This overwrites existing list data on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load', style: 'destructive', onPress: runLoad },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profile',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={[styles.container, { backgroundColor: colors.background }]}
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
            New installs start empty. Demo data is only loaded from the button below.
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
