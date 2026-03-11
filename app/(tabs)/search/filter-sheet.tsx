import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FILTER_SECTIONS = [
  {
    title: 'Availability',
    description: 'Placeholder switches for catalog coverage.',
    options: ['Released only', 'Include upcoming', 'Favorites first'],
  },
  {
    title: 'Format',
    description: 'Placeholder format narrowing.',
    options: ['Series', 'Standalone', 'Collected editions'],
  },
  {
    title: 'Content',
    description: 'Placeholder content preferences.',
    options: ['Hide mature titles', 'Dub available', 'English metadata only'],
  },
] as const;

export default function SearchFilterSheet() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedOptions, setSelectedOptions] = useState<string[]>([
    'Released only',
    'Hide mature titles',
  ]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.notice,
            {
              borderColor: colors.icon + '22',
              backgroundColor: colors.icon + '10',
            },
          ]}
        >
          <ThemedText style={styles.noticeText}>
            Placeholder filters only for now. These controls are visual and do not change
            search results yet.
          </ThemedText>
        </View>

        {FILTER_SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[
              styles.section,
              {
                borderColor: colors.icon + '20',
                backgroundColor: colors.background,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">{section.title}</ThemedText>
              <ThemedText style={{ color: colors.icon }}>{section.description}</ThemedText>
            </View>
            <View style={styles.optionGrid}>
              {section.options.map((option) => {
                const selected = selectedOptions.includes(option);
                return (
                  <Pressable
                    key={option}
                    onPress={() =>
                      setSelectedOptions((current) =>
                        selected
                          ? current.filter((value) => value !== option)
                          : [...current, option]
                      )
                    }
                    style={({ pressed }) => [
                      styles.optionChip,
                      {
                        borderColor: selected ? colors.tint : colors.icon + '26',
                        backgroundColor: selected ? colors.tint + '16' : colors.icon + '08',
                        opacity: pressed ? 0.82 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      type={selected ? 'defaultSemiBold' : 'default'}
                      style={{ color: selected ? colors.tint : colors.text }}
                    >
                      {option}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.icon + '18',
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.tint,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <ThemedText style={styles.primaryButtonText}>Done</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  noticeText: {
    fontSize: 15,
    lineHeight: 21,
  },
  section: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    gap: 4,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: ThemePalette.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
