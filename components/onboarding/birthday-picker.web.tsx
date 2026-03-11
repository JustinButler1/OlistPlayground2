import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

interface BirthdayPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onOpenChange?: (open: boolean) => void;
  colors: ThemeColors;
}

function isValidStorageDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function BirthdayPicker({
  value,
  onChange,
  onOpenChange,
  colors,
}: BirthdayPickerProps) {
  const [draftValue, setDraftValue] = useState(value ?? '');

  useEffect(() => {
    setDraftValue(value ?? '');
  }, [value]);

  return (
    <View style={styles.container}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="numeric"
        onBlur={() => onOpenChange?.(false)}
        onChangeText={(nextValue) => {
          setDraftValue(nextValue);
          if (!nextValue.trim()) {
            onChange(null);
            return;
          }

          if (isValidStorageDate(nextValue)) {
            onChange(nextValue);
          }
        }}
        onFocus={() => onOpenChange?.(true)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.icon}
        style={[
          styles.input,
          {
            backgroundColor: colors.tint + '12',
            borderColor: colors.tint + '28',
            color: colors.text,
          },
        ]}
        value={draftValue}
      />
      <ThemedText style={[styles.caption, { color: colors.icon }]}>
        Web fallback uses ISO format. Native builds use the platform date picker.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 16,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
});
