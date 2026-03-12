import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';

export default function CommunityScreen() {
  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Community',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.placeholder}>Community content goes here.</ThemedText>
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
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  placeholder: {
    opacity: 0.7,
    textAlign: 'center',
  },
});
