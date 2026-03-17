import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CommunityLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isIos = process.env.EXPO_OS === 'ios';

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Community',
          headerTransparent: true,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerRightActions}>
              <Pressable
                accessibilityLabel="Create post"
                accessibilityRole="button"
                onPress={() => router.push('/community/create-post')}
                style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
              >
                <IconSymbol name="plus" size={22} color={colors.tint} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="create-post"
        options={{
          title: 'Create Post',
          presentation: isIos ? 'formSheet' : 'modal',
          headerTransparent: isIos,
          contentStyle: isIos ? { backgroundColor: 'transparent' } : undefined,
          sheetGrabberVisible: isIos,
          sheetAllowedDetents: isIos ? [0.6, 0.95] : undefined,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRightActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
