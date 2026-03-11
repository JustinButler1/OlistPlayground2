import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

interface BirthdayPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onOpenChange?: (open: boolean) => void;
  colors: ThemeColors;
}

function parseStoredDate(value: string | null): Date {
  if (!value) {
    return new Date(2000, 0, 1);
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed;
}

function toStorageDate(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBirthday(value: string | null): string {
  if (!value) {
    return 'Choose your birthday';
  }

  const parsed = parseStoredDate(value);
  return parsed.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function BirthdayPicker({
  value,
  onChange,
  onOpenChange,
  colors,
}: BirthdayPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isIOS = process.env.EXPO_OS === 'ios';

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Choose birthday"
          accessibilityRole="button"
          onPress={() => setIsOpen((current) => (isIOS ? !current : true))}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: colors.tint + '12',
              borderColor: colors.tint + '28',
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
            {formatBirthday(value)}
          </ThemedText>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityLabel="Clear birthday"
            accessibilityRole="button"
            onPress={() => onChange(null)}
            style={({ pressed }) => [
              styles.clearButton,
              {
                backgroundColor: colors.icon + '10',
                borderColor: colors.icon + '24',
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: colors.icon }}>Clear</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {isOpen ? (
        <View
          style={[
            styles.pickerContainer,
            {
              borderColor: colors.icon + '20',
              backgroundColor: colors.tint + '08',
            },
          ]}
        >
          <DateTimePicker
            display={isIOS ? 'spinner' : 'default'}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
            mode="date"
            value={parseStoredDate(value)}
            onChange={(event, selectedDate) => {
              if (!isIOS) {
                setIsOpen(false);
              }

              if (event.type === 'dismissed' || !selectedDate) {
                return;
              }

              onChange(toStorageDate(selectedDate));
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pickerContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
});
