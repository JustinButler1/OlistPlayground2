import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomePlaceholderSections } from '@/components/home-placeholder-sections';
import { TabRootBackground } from '@/components/tab-root-background';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          title: 'Home',
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HomePlaceholderSections />
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
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 14,
  },
});
