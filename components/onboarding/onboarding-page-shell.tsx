import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

interface OnboardingPageShellProps {
  colors: ThemeColors;
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  blurOverlay?: ReactNode;
}

export function OnboardingPageShell({
  colors,
  badge,
  title,
  description,
  children,
  footer,
  blurOverlay,
}: OnboardingPageShellProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.icon + '28',
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.tint + '14',
              borderColor: colors.tint + '24',
            },
          ]}
        >
          <ThemedText style={[styles.badgeText, { color: colors.tint }]}>{badge}</ThemedText>
        </View>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.description, { color: colors.icon }]}>
          {description}
        </ThemedText>
      </View>
      <View style={styles.body}>{children}</View>
      <View style={styles.footer}>{footer}</View>
      {blurOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 20,
  },
  header: {
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    flex: 1,
    gap: 16,
  },
  footer: {
    gap: 12,
  },
});
