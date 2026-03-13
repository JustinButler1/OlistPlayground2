import { ContextMenu, ListItem, Picker } from '@expo/ui/jetpack-compose';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SelectionOption {
  label: string;
  value: string;
}

interface SelectionRowProps {
  title: string;
  value: string;
  options: readonly SelectionOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function SelectionRow({
  title,
  value,
  options,
  selectedValue,
  onValueChange,
}: SelectionRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);

  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <View
          style={[
            styles.surface,
            {
              borderColor: colors.icon + '24',
              backgroundColor: colors.background,
            },
          ]}
        >
          <ListItem headline={title} supportingText={value}>
            <ListItem.Trailing>
              <ThemedText style={styles.trailing}>Choose</ThemedText>
            </ListItem.Trailing>
          </ListItem>
        </View>
      </ContextMenu.Trigger>
      <ContextMenu.Items>
        <Picker
          options={options.map((option) => option.label)}
          selectedIndex={selectedIndex >= 0 ? selectedIndex : null}
          variant="radio"
          onOptionSelected={({ nativeEvent }) => {
            const nextValue = options[nativeEvent.index]?.value;
            if (nextValue !== undefined) {
              onValueChange(nextValue);
            }
          }}
        />
      </ContextMenu.Items>
    </ContextMenu>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trailing: {
    opacity: 0.65,
  },
});
