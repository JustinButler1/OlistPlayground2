import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommunityFeedList } from '@/components/community/community-feed-list';
import { TopTabs } from '@/components/reacticx/base/tabs';
import { TabRootBackground } from '@/components/tab-root-background';
import { Colors } from '@/constants/theme';
import { useTestAccounts } from '@/contexts/test-accounts-context';
import { MOCK_COMMUNITY_FEED } from '@/data/mock-community-feed';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeMockAccountSeed } = useTestAccounts();
  const accountFeed = activeMockAccountSeed?.communityFeed ?? MOCK_COMMUNITY_FEED;
  const forYouFeed = accountFeed;
  const followingFeed = accountFeed.slice(0, 2);
  const exploreFeed = [...accountFeed].reverse();
  const tabs = [
    {
      id: 'for-you',
      title: 'For You',
      contentComponent: (
        <CommunityFeedList
          badgeLabel="Tailored momentum picks"
          description="Posts aligned with the habits and interests you interact with most."
          items={forYouFeed}
        />
      ),
    },
    {
      id: 'following',
      title: 'Following',
      contentComponent: (
        <CommunityFeedList
          badgeLabel="Latest from your circle"
          description="Fresh updates from the creators and communities you already follow."
          items={followingFeed}
        />
      ),
    },
    {
      id: 'explore',
      title: 'Explore',
      contentComponent: (
        <CommunityFeedList
          badgeLabel="Discovery across the community"
          description="Broader conversations and standout posts beyond your usual feed."
          items={exploreFeed}
        />
      ),
    },
  ];

  return (
    <TabRootBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabsSection}>
          <TopTabs
            tabs={tabs}
            activeColor={colors.text}
            inactiveColor={colors.icon}
            underlineColor={colors.tint}
            underlineHeight={3}
          />
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
    paddingTop: 16,
  },
  tabsSection: {
    marginHorizontal: -4,
  },
});
