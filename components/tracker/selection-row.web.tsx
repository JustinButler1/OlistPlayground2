import { Pressable, StyleSheet, View } from 'react-native';

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
  const currentIndex = options.findIndex((option) => option.value === selectedValue);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => {
          const next = options[(currentIndex + 1) % options.length];
          if (next) {
            onValueChange(next.value);
          }
        }}
        style={[
          styles.row,
          {
            borderColor: colors.icon + '24',
            backgroundColor: colors.icon + '10',
          },
        ]}
      >
        <View style={styles.textBlock}>
          <ThemedText>{title}</ThemedText>
          <ThemedText style={{ color: colors.icon }}>{value}</ThemedText>
        </View>
        <ThemedText style={{ color: colors.icon }}>Choose</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
});
