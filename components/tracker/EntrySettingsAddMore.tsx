import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AdvancedSectionId } from '@/lib/tracker-metadata';

interface AddMoreAction {
  id: AdvancedSectionId;
  label: string;
  icon: string;
}

const ADD_MORE_ACTIONS: AddMoreAction[] = [
  { id: 'notes', label: 'Add notes', icon: 'note.text' },
  { id: 'tags', label: 'Add tags', icon: 'tag' },
  { id: 'customFields', label: 'Add custom fields', icon: 'slider.horizontal.3' },
  { id: 'cover', label: 'Add cover', icon: 'photo' },
  { id: 'link', label: 'Add link', icon: 'link' },
];

interface EntrySettingsAddMoreProps {
  visibleSections: Record<AdvancedSectionId, boolean>;
  /** Which sections are available based on list config */
  availableSections: Set<AdvancedSectionId>;
  onReveal: (section: AdvancedSectionId) => void;
}

export function EntrySettingsAddMore({
  visibleSections,
  availableSections,
  onReveal,
}: EntrySettingsAddMoreProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const hiddenActions = ADD_MORE_ACTIONS.filter(
    (action) => availableSections.has(action.id) && !visibleSections[action.id]
  );

  if (!hiddenActions.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={{ opacity: 0.65 }}>
        Add more
      </ThemedText>
      <View style={styles.actions}>
        {hiddenActions.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onReveal(action.id)}
            style={({ pressed }) => [
              styles.actionButton,
              {
                borderColor: colors.tint + '35',
                backgroundColor: colors.tint + '10',
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <IconSymbol name={action.icon as never} size={16} color={colors.tint} />
            <ThemedText style={[styles.actionLabel, { color: colors.tint }]}>
              {action.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
