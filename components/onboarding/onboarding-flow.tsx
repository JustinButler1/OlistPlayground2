import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthdayPicker } from '@/components/onboarding/birthday-picker';
import { OnboardingPageShell } from '@/components/onboarding/onboarding-page-shell';
import { VerticalPaginationCarousel } from '@/components/reacticx/vertical-pagination-carousel';
import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  ONBOARDING_INTEREST_OPTIONS,
} from '@/constants/onboarding';
import { Colors, ThemePalette } from '@/constants/theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STEPS = ['intro', 'profile', 'birthday', 'interests', 'finish'] as const;
type OnboardingStep = (typeof STEPS)[number];
type ThemeColors = (typeof Colors)[keyof typeof Colors];

function formatBirthday(value: string | null): string {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not set';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function ActionButton({
  label,
  onPress,
  colors,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: isPrimary ? colors.tint : colors.icon + '10',
          borderColor: isPrimary ? colors.tint : colors.icon + '22',
          opacity: disabled ? 0.5 : pressed ? 0.84 : 1,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.actionButtonLabel,
          { color: isPrimary ? colors.background : colors.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function FooterActions({
  colors,
  showBack = true,
  onBack,
  onNext,
  nextLabel,
}: {
  colors: ThemeColors;
  showBack?: boolean;
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <View style={styles.footerRow}>
      {showBack ? (
        <ActionButton
          colors={colors}
          label="Back"
          onPress={onBack ?? (() => { })}
          variant="secondary"
        />
      ) : (
        <View style={styles.footerSpacer} />
      )}
      <ActionButton colors={colors} label={nextLabel} onPress={onNext} />
    </View>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const {
    completeOnboarding,
    isHydrated,
    state,
    setAvatarUri,
    setBirthDate,
    setDisplayName,
    toggleInterest,
  } = useOnboarding();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCarouselLocked, setIsCarouselLocked] = useState(false);

  const nextStep = () => {
    setActiveIndex((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const previousStep = () => {
    setActiveIndex((current) => Math.max(current - 1, 0));
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const summaryInterests = state.profile.interests
    .flatMap((interestId) => {
      const label = ONBOARDING_INTEREST_OPTIONS.find((item) => item.id === interestId)?.label;
      return label ? [label] : [];
    });

  const renderStep = (step: OnboardingStep, blurOverlay: ReactNode) => {
    switch (step) {
      case 'intro':
        return (
          <OnboardingPageShell
            badge="Local only"
            blurOverlay={blurOverlay}
            colors={colors}
            description="This flow only opens from Profile. Nothing checks at startup, nothing requires an account, and you can revisit it any time."
            footer={
              <FooterActions
                colors={colors}
                nextLabel="Start"
                onNext={nextStep}
                showBack={false}
              />
            }
            title="Set up your profile on this device"
          >
            <View style={styles.featureStack}>
              {[
                'Profile-triggered only, never auto-launched.',
                'Interests stay local and do not create lists yet.',
                'The final Pro page is only a stub for now.',
              ].map((itemCopy) => (
                <View
                  key={itemCopy}
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: colors.tint + '10',
                      borderColor: colors.tint + '1e',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoDot,
                      {
                        backgroundColor: ThemePalette.primaryAccent,
                      },
                    ]}
                  />
                  <ThemedText style={styles.infoCopy}>{itemCopy}</ThemedText>
                </View>
              ))}
            </View>
          </OnboardingPageShell>
        );
      case 'profile':
        return (
          <OnboardingPageShell
            badge="Profile"
            blurOverlay={blurOverlay}
            colors={colors}
            description="Add a display name and optional image for the local profile card."
            footer={
              <FooterActions
                colors={colors}
                nextLabel="Continue"
                onBack={previousStep}
                onNext={nextStep}
              />
            }
            title="Start with the basics"
          >
            <View style={styles.profileSection}>
              <View style={styles.avatarSection}>
                <ThumbnailImage imageUrl={state.profile.avatarUri} style={styles.avatar} />
                <View style={styles.avatarActions}>
                  <ActionButton colors={colors} label="Choose image" onPress={pickAvatar} />
                  {state.profile.avatarUri ? (
                    <ActionButton
                      colors={colors}
                      label="Remove"
                      onPress={() => setAvatarUri(null)}
                      variant="secondary"
                    />
                  ) : null}
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>Display name</ThemedText>
                <TextInput
                  onBlur={() => setIsCarouselLocked(false)}
                  onChangeText={setDisplayName}
                  onFocus={() => setIsCarouselLocked(true)}
                  placeholder="What should Olist call you?"
                  placeholderTextColor={colors.icon}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.tint + '12',
                      borderColor: colors.tint + '28',
                      color: colors.text,
                    },
                  ]}
                  value={state.profile.displayName}
                />
                <ThemedText style={[styles.fieldCaption, { color: colors.icon }]}>
                  Leave it blank if you want. You can update it later from Profile.
                </ThemedText>
              </View>
            </View>
          </OnboardingPageShell>
        );
      case 'birthday':
        return (
          <OnboardingPageShell
            badge="Birthday"
            blurOverlay={blurOverlay}
            colors={colors}
            description="Birthday is optional and stays local to this device."
            footer={
              <FooterActions
                colors={colors}
                nextLabel="Continue"
                onBack={previousStep}
                onNext={nextStep}
              />
            }
            title="Add a birthday"
          >
            <View style={styles.featureStack}>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.tint + '10',
                    borderColor: colors.tint + '20',
                  },
                ]}
              >
                <ThemedText style={styles.summaryLabel}>Current value</ThemedText>
                <ThemedText type="subtitle" style={styles.summaryValue}>
                  {formatBirthday(state.profile.birthDate)}
                </ThemedText>
              </View>
              <BirthdayPicker
                colors={colors}
                onChange={setBirthDate}
                onOpenChange={setIsCarouselLocked}
                value={state.profile.birthDate}
              />
            </View>
          </OnboardingPageShell>
        );
      case 'interests':
        return (
          <OnboardingPageShell
            badge="Interests"
            blurOverlay={blurOverlay}
            colors={colors}
            description="Pick the topics you want Olist to remember. These selections are saved locally only for now."
            footer={
              <FooterActions
                colors={colors}
                nextLabel="Continue"
                onBack={previousStep}
                onNext={nextStep}
              />
            }
            title="Choose what you care about"
          >
            <View style={styles.featureStack}>
              <ThemedText style={[styles.selectionCount, { color: colors.icon }]}>
                {state.profile.interests.length} selected
              </ThemedText>
              <View style={styles.interestGrid}>
                {ONBOARDING_INTEREST_OPTIONS.map((interest) => {
                  const isSelected = state.profile.interests.includes(interest.id);

                  return (
                    <Pressable
                      key={interest.id}
                      accessibilityRole="button"
                      onPress={() => toggleInterest(interest.id)}
                      style={({ pressed }) => [
                        styles.interestChip,
                        {
                          backgroundColor: isSelected ? colors.tint : colors.background,
                          borderColor: isSelected ? colors.tint : colors.icon + '24',
                          opacity: pressed ? 0.86 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.interestLabel,
                          {
                            color: isSelected ? colors.background : colors.text,
                          },
                        ]}
                      >
                        {interest.label}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.interestDescription,
                          {
                            color: isSelected ? colors.background + 'd9' : colors.icon,
                          },
                        ]}
                      >
                        {interest.description}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </OnboardingPageShell>
        );
      case 'finish':
        return (
          <OnboardingPageShell
            badge="Pro stub"
            blurOverlay={blurOverlay}
            colors={colors}
            description="This final page only saves your local onboarding state. Pro behavior is still a placeholder."
            footer={
              <FooterActions
                colors={colors}
                nextLabel="Finish"
                onBack={previousStep}
                onNext={() => {
                  completeOnboarding();
                  router.back();
                }}
              />
            }
            title="Finish and return to Profile"
          >
            <View style={styles.featureStack}>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.tint + '10',
                    borderColor: colors.tint + '20',
                  },
                ]}
              >
                <ThemedText style={styles.summaryLabel}>Display name</ThemedText>
                <ThemedText type="subtitle" style={styles.summaryValue}>
                  {state.profile.displayName.trim() || 'Not set'}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.tint + '10',
                    borderColor: colors.tint + '20',
                  },
                ]}
              >
                <ThemedText style={styles.summaryLabel}>Birthday</ThemedText>
                <ThemedText type="subtitle" style={styles.summaryValue}>
                  {formatBirthday(state.profile.birthDate)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.tint + '10',
                    borderColor: colors.tint + '20',
                  },
                ]}
              >
                <ThemedText style={styles.summaryLabel}>Interests</ThemedText>
                <ThemedText type="subtitle" style={styles.summaryValue}>
                  {summaryInterests.length ? summaryInterests.join(', ') : 'None selected'}
                </ThemedText>
              </View>
              {!isHydrated ? (
                <ThemedText style={[styles.fieldCaption, { color: colors.icon }]}>
                  Saving local onboarding state...
                </ThemedText>
              ) : null}
            </View>
          </OnboardingPageShell>
        );
    }
  };

  return (
    <TabRootBackground>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <View style={styles.screenContent}>
          <VerticalPaginationCarousel
            activeIndex={activeIndex}
            data={STEPS}
            itemVerticalInset={Math.max(72, Math.min(108, windowHeight * 0.11))}
            onActiveIndexChange={setActiveIndex}
            pageStyle={styles.page}
            paginationStyle={{
              top: insets.top + 18,
            }}
            paginationProps={{
              activeDotColor: colors.tint,
              inactiveDotColor: colors.icon + '3a',
            }}
            renderItem={({ item, blurOverlay }) => renderStep(item, blurOverlay)}
            scrollEnabled={!isCarouselLocked}
            style={styles.carousel}
          />
          <View
            pointerEvents="box-none"
            style={[
              styles.overlayControls,
              {
                top: insets.top + 14,
              },
            ]}
          >
            <Pressable
              accessibilityLabel="Close onboarding"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.icon + '18',
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <IconSymbol color={colors.text} name="xmark" size={18} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TabRootBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenContent: {
    flex: 1,
  },
  overlayControls: {
    position: 'absolute',
    right: 20,
    zIndex: 3,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  carousel: {
    flex: 1,
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  featureStack: {
    flex: 1,
    gap: 12,
  },
  infoCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  infoDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  infoCopy: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerSpacer: {
    flex: 1,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  actionButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  profileSection: {
    flex: 1,
    gap: 18,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    borderRadius: 28,
    height: 176,
    width: 128,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  fieldCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 18,
    lineHeight: 22,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestChip: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: '47%',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  interestLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  interestDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
