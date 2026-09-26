import { StyleSheet, TextInput } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface EntrySettingsTitleFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  editable?: boolean;
}

export function EntrySettingsTitleField({
  value,
  onChangeText,
  editable = true,
}: EntrySettingsTitleFieldProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TextInput
      style={[
        styles.titleField,
        {
          color: colors.text,
          borderColor: colors.icon + '28',
          backgroundColor: colors.icon + '10',
        },
      ]}
      multiline
      placeholder="Title"
      placeholderTextColor={colors.icon}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
    />
  );
}

const styles = StyleSheet.create({
  titleField: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: '600',
    minHeight: 56,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
});
