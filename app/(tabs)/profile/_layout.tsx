import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Profile',
          headerTransparent: true,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerRightActions}>
              <Pressable
                onPress={() => router.push('/profile/settings')}
                style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <IconSymbol name="gearshape" size={22} color={colors.tint} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
