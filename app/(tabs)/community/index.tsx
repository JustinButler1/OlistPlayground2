import { ScrollView, StyleSheet } from 'react-native';

import { CommunityFeedList } from '@/components/community/community-feed-list';
import { TabRootBackground } from '@/components/tab-root-background';

export default function CommunityScreen() {
  return (
    <TabRootBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CommunityFeedList />
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
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
