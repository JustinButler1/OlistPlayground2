import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabRootBackground } from '@/components/tab-root-background';
import { Colors } from '@/constants/theme';
import { AI_PILLARS } from '@/data/ai-pillars';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExperimentalScreen() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <TabRootBackground>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 20,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
          Explore four pillars of AI: an introductory selection of ways machines learn, understand,
          perceive, and act.
        </Text>
        {AI_PILLARS.map((pillar) => (
          <View
            key={pillar.title}
            testID="ai-pillar"
            style={{
              padding: 20,
              gap: 10,
              borderRadius: 16,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.icon,
              backgroundColor: colors.background,
            }}
          >
            <Text
              selectable
              accessibilityRole="header"
              style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}
            >
              {pillar.title}
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 25 }}>
              {pillar.description}
            </Text>
          </View>
        ))}
      </ScrollView>
    </TabRootBackground>
  );
}
