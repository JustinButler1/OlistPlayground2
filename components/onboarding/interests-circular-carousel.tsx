import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  ONBOARDING_INTEREST_OPTIONS,
  type OnboardingInterestId,
} from '@/constants/onboarding';
import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

interface InterestsCircularCarouselProps {
  colors: ThemeColors;
  selectedInterests: readonly OnboardingInterestId[];
  onToggleInterest: (interestId: OnboardingInterestId) => void | Promise<void>;
  footer: ReactNode;
}

export function InterestsCircularCarousel({
  colors,
  selectedInterests,
  onToggleInterest,
  footer,
}: InterestsCircularCarouselProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const clampedIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(ONBOARDING_INTEREST_OPTIONS.length - 1, 0)
  );
  const activeInterest = ONBOARDING_INTEREST_OPTIONS[clampedIndex];
  const isActiveInterestSelected = selectedInterests.includes(activeInterest.id);
  const itemWidth = Math.min(Math.max(width - 152, 216), 312);
  const selectedLabels = useMemo(
    () =>
      ONBOARDING_INTEREST_OPTIONS.filter((interest) =>
        selectedInterests.includes(interest.id)
      ).map((interest) => interest.label),
    [selectedInterests]
  );

  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
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
          <ThemedText style={[styles.badgeText, { color: colors.tint }]}>Interests</ThemedText>
        </View>
        <ThemedText type="title" style={styles.title}>
          Choose what you care about
        </ThemedText>
        <ThemedText style={[styles.description, { color: colors.icon }]}>
          Swipe sideways through interest lanes, then tap any card to add or remove it from
          the shared workspace profile.
        </ThemedText>
      </View>

      <View style={styles.statusRow}>
        <ThemedText style={[styles.selectionCount, { color: colors.icon }]}>
          {selectedInterests.length} selected
        </ThemedText>
        <View
          style={[
            styles.swipeBadge,
            {
              backgroundColor: colors.tint + '12',
              borderColor: colors.tint + '22',
            },
          ]}
        >
          <ThemedText style={[styles.swipeBadgeText, { color: colors.tint }]}>
            Swipe sideways
          </ThemedText>
        </View>
      </View>

      <View style={styles.carouselSection}>

      </View>

      <View
        style={[
          styles.activeSummary,
          {
            backgroundColor: colors.tint + '10',
            borderColor: colors.tint + '20',
          },
        ]}
      >
        <ThemedText style={styles.activeSummaryLabel}>Focused interest</ThemedText>
        <ThemedText type="subtitle" style={styles.activeSummaryTitle}>
          {activeInterest.label}
        </ThemedText>
        <ThemedText style={[styles.activeSummaryCopy, { color: colors.icon }]}>
          {isActiveInterestSelected
            ? 'This one is already part of the profile.'
            : 'Swipe to explore more lanes, then tap a card to add it.'}
        </ThemedText>
      </View>

      <View style={styles.selectedWrap}>
        {selectedLabels.length ? (
          selectedLabels.map((label) => (
            <View
              key={label}
              style={[
                styles.selectedChip,
                {
                  backgroundColor: colors.tint + '12',
                  borderColor: colors.tint + '22',
                },
              ]}
            >
              <ThemedText style={[styles.selectedChipText, { color: colors.tint }]}>
                {label}
              </ThemedText>
            </View>
          ))
        ) : (
          <ThemedText style={[styles.emptyStateCopy, { color: colors.icon }]}>
            No interests selected yet.
          </ThemedText>
        )}
      </View>

      <View style={styles.footer}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 16,
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
    letterSpacing: 0.6,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  swipeBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  swipeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  carouselSection: {
    flex: 1,
    marginHorizontal: -8,
  },
  interestCard: {
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    minHeight: 320,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardStatusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cardIcon: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  interestLabel: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 10,
  },
  interestDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cardFooterCopy: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  activeSummary: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  activeSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activeSummaryTitle: {
    fontSize: 20,
    lineHeight: 24,
  },
  activeSummaryCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
  },
  selectedChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    gap: 12,
  },
});
