import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HOME_SECTIONS = [
  {
    eyebrow: 'Pinned backdrop',
    title: 'Static art, moving content',
    body: 'The aurora shader stays fixed behind the screen while the homepage feed scrolls over it.',
  },
  {
    eyebrow: 'Brand motion',
    title: 'Aurora background',
    body: 'The background now carries the new violet and cyan brand palette through the full tab experience.',
  },
  {
    eyebrow: 'Feed content',
    title: 'Still scrollable',
    body: 'The route keeps enough content below the fold to make the parallax-like effect obvious during vertical scrolling.',
  },
  {
    eyebrow: 'Color tuning',
    title: 'Brand-aware palette',
    body: 'Both modes now stay anchored to the same brand family, with neutrals only used where contrast needs them.',
  },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Home',
          headerTransparent: true,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroOffset} />

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(5, 18, 35, 0.76)' : 'rgba(245, 248, 252, 0.8)',
              borderColor: isDark ? 'rgba(19, 158, 193, 0.2)' : 'rgba(42, 27, 96, 0.1)',
            },
          ]}
        >
          <ThemedText
            selectable
            style={[
              styles.heroEyebrow,
              { color: isDark ? 'rgba(255, 255, 255, 0.74)' : 'rgba(42, 27, 96, 0.74)' },
            ]}
          >
            Home surface
          </ThemedText>
          <ThemedText
            selectable
            type="title"
            style={[styles.heroTitle, { color: isDark ? ThemePalette.white : ThemePalette.ink }]}
          >
            Aurora over the new brand system
          </ThemedText>
          <ThemedText
            selectable
            style={[
              styles.heroBody,
              { color: isDark ? 'rgba(255, 255, 255, 0.84)' : 'rgba(7, 22, 44, 0.84)' },
            ]}
          >
            The Aurora field is pinned to the screen. Only the homepage content moves.
          </ThemedText>
        </View>

        {HOME_SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[
              styles.feedCard,
              {
                backgroundColor: isDark ? 'rgba(5, 18, 35, 0.8)' : 'rgba(245, 248, 252, 0.84)',
                borderColor: isDark ? 'rgba(19, 158, 193, 0.16)' : 'rgba(42, 27, 96, 0.08)',
              },
            ]}
          >
            <ThemedText
              selectable
              style={[
                styles.cardEyebrow,
                { color: isDark ? 'rgba(255, 255, 255, 0.66)' : 'rgba(42, 27, 96, 0.66)' },
              ]}
            >
              {section.eyebrow}
            </ThemedText>
            <ThemedText selectable type="subtitle" style={styles.cardTitle}>
              {section.title}
            </ThemedText>
            <ThemedText selectable style={styles.cardBody}>
              {section.body}
            </ThemedText>
          </View>
        ))}

        <View
          style={[
            styles.footerPanel,
            {
              backgroundColor: isDark ? 'rgba(5, 18, 35, 0.86)' : 'rgba(245, 248, 252, 0.9)',
              borderColor: isDark ? 'rgba(19, 158, 193, 0.16)' : 'rgba(42, 27, 96, 0.08)',
            },
          ]}
        >
          <ThemedText selectable type="subtitle" style={styles.cardTitle}>
            Scroll test
          </ThemedText>
          <ThemedText selectable style={styles.cardBody}>
            Keep scrolling and the cards continue moving while Aurora remains pinned behind the route.
          </ThemedText>
        </View>
      </ScrollView>
    </TabRootBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    gap: 18,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroOffset: {
    height: 168,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
    padding: 24,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
  },
  feedCard: {
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    lineHeight: 28,
  },
  cardBody: {
    opacity: 0.84,
  },
  footerPanel: {
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    marginTop: 6,
    minHeight: 220,
    padding: 20,
  },
});
