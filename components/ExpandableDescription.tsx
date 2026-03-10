import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface ExpandableDescriptionProps {
  text: string;
}

export function ExpandableDescription({ text }: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  if (!text) return null;

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>Description</ThemedText>
      <ThemedText
        style={styles.text}
        numberOfLines={expanded ? undefined : 4}
      >
        {text}
      </ThemedText>
      <TouchableOpacity
        onPress={toggleExpand}
        style={styles.button}
        activeOpacity={0.7}
      >
        <IconSymbol
          name={expanded ? "chevron.up" : "chevron.down"}
          size={24}
          color={colors.icon}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
