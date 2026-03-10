import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ContentFilterInfoSheet() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.tint,
            },
          ]}
        >
          <ThemedText style={styles.badgeText}>18</ThemedText>
        </View>

        <View style={styles.copy}>
          <ThemedText type="title" style={styles.title}>
            Mature content may be hidden
          </ThemedText>
          <ThemedText style={[styles.description, { color: colors.icon }]}>
            Search providers can remove adult results before they ever reach the app. This
            usually depends on provider rules, account settings, or regional restrictions.
          </ThemedText>
          <ThemedText style={[styles.description, { color: colors.icon }]}>
            This notice is informational for now. Later, the filter sheet can expose
            account-aware controls when the provider APIs support them consistently.
          </ThemedText>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.icon + '18',
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.closeButton,
            {
              backgroundColor: colors.tint,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <ThemedText style={styles.closeButtonText}>Close</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 18,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#04111f',
    fontSize: 20,
    fontWeight: '700',
  },
  copy: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
  },
  closeButton: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  closeButtonText: {
    color: '#04111f',
    fontSize: 16,
    fontWeight: '700',
  },
});
