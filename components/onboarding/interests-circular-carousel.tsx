import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CircularCarousel } from '@/components/reacticx/molecules/circular-carousel';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
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
  const { height, width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const clampedIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(ONBOARDING_INTEREST_OPTIONS.length - 1, 0)
  );
  const itemHeight = height * 0.76;
  const itemWidth = width - 40;
  const horizontalSpacing = 0;
  const selectedLabels = useMemo(
    () =>
      ONBOARDING_INTEREST_OPTIONS.filter((interest) =>
        selectedInterests.includes(interest.id)
      ).map((interest) => interest.label),
    [selectedInterests]
  );

  return (
    <View style={styles.page}>
      <CircularCarousel
        data={ONBOARDING_INTEREST_OPTIONS}
        horizontalSpacing={horizontalSpacing}
        itemHeight={itemHeight}
        itemWidth={itemWidth}
        keyExtractor={(interest) => interest.id}
        onIndexChange={setActiveIndex}
        renderItem={({ item }) => {
          const isSelected = selectedInterests.includes(item.id);

          return (
            <Pressable
              accessibilityHint={`Double tap to ${isSelected ? 'remove' : 'add'
                } ${item.label} from your interests.`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                void onToggleInterest(item.id);
              }}
              style={({ pressed }) => [
                styles.interestCard,
                {
                  backgroundColor: isSelected ? colors.tint : colors.background,
                  borderColor: isSelected ? colors.tint : colors.icon + '22',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.cardStatusBadge,
                    {
                      backgroundColor: isSelected
                        ? colors.background + '26'
                        : colors.tint + '12',
                      borderColor: isSelected
                        ? colors.background + '40'
                        : colors.tint + '1f',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.cardStatusBadgeText,
                      {
                        color: isSelected ? colors.background : colors.tint,
                      },
                    ]}
                  >
                    {isSelected ? 'Selected' : 'Tap to add'}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.cardIcon,
                    {
                      backgroundColor: isSelected
                        ? colors.background + '1e'
                        : colors.tint + '12',
                      borderColor: isSelected
                        ? colors.background + '36'
                        : colors.tint + '1e',
                    },
                  ]}
                >
                  <IconSymbol
                    color={isSelected ? colors.background : colors.tint}
                    name={isSelected ? 'checkmark' : 'plus'}
                    size={20}
                  />
                </View>
              </View>

              <View style={styles.cardBody}>
                <ThemedText
                  style={[
                    styles.interestLabel,
                    { color: isSelected ? colors.background : colors.text },
                  ]}
                >
                  {item.label}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.interestDescription,
                    {
                      color: isSelected ? colors.background + 'd9' : colors.icon,
                    },
                  ]}
                >
                  {item.description}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.cardFooter,
                  {
                    borderColor: isSelected
                      ? colors.background + '20'
                      : colors.icon + '18',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.cardFooterCopy,
                    {
                      color: isSelected ? colors.background : colors.text,
                    },
                  ]}
                >
                  {isSelected
                    ? 'Included in the shared profile.'
                    : 'Add this lane to the shared profile.'}
                </ThemedText>
              </View>
            </Pressable>
          );
        }}
        spacing={18}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
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
    width: '100%',
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
