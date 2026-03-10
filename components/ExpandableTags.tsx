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

interface Tag {
  id: string | number;
  name: string;
}

interface ExpandableTagsProps {
  tags: Tag[];
}

export function ExpandableTags({ tags }: ExpandableTagsProps) {
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  if (!tags || tags.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.tagsContainer, !expanded && styles.collapsed]}>
        {tags.map((tag) => (
          <View
            key={tag.id}
            style={[styles.tagChip, { backgroundColor: colors.tint + '14' }]}
          >
            <ThemedText style={{ color: colors.tint }}>{tag.name}</ThemedText>
          </View>
        ))}
      </View>
      {tags.length > 5 && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    overflow: 'hidden',
  },
  collapsed: {
    maxHeight: 70, // Approximates 2 lines based on pill height + gap
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
});
