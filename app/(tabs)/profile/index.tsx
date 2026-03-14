import { ScrollView, StyleSheet } from 'react-native';

import { TabRootBackground } from '@/components/tab-root-background';

export default function ProfileScreen() {
  return (
    <TabRootBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
});
