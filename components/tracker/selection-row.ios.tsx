import { Host, HStack, Image, Picker, Spacer, Text } from '@expo/ui/swift-ui';
import {
  background,
  border,
  cornerRadius,
  foregroundColor,
  foregroundStyle,
  frame,
  glassEffect,
  padding,
  pickerStyle,
  shapes,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { Platform, StyleSheet } from 'react-native';

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
  const supportsLiquidGlass =
    Number.parseInt(String(Platform.Version).split('.')[0] ?? '0', 10) >= 26;
  const rowModifiers = supportsLiquidGlass
    ? [
        padding({ horizontal: 16, vertical: 12 }),
        frame({ maxWidth: Infinity }),
        glassEffect({
          glass: { interactive: true, variant: 'regular' },
          shape: 'roundedRectangle',
        }),
      ]
    : [
        padding({ horizontal: 16, vertical: 12 }),
        frame({ maxWidth: Infinity }),
        background(colors.background, shapes.roundedRectangle({ cornerRadius: 16 })),
        border({ color: colors.icon + '24', width: 1 }),
        cornerRadius(16),
      ];

  return (
    <Host style={styles.host}>
      <Picker
        label={
          <HStack spacing={10} modifiers={rowModifiers}>
            <Text modifiers={[foregroundColor(colors.text)]}>{title}</Text>
            <Spacer />
            <Text modifiers={[foregroundColor(colors.icon)]}>{value}</Text>
            <Image
              systemName="chevron.down"
              size={14}
              modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
            />
          </HStack>
        }
        selection={selectedValue}
        onSelectionChange={(nextValue) => {
          if (typeof nextValue === 'string') {
            onValueChange(nextValue);
          }
        }}
        modifiers={[pickerStyle('menu')]}
      >
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    minHeight: 54,
  },
});
