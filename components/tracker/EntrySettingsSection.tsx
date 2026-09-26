import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface EntrySettingsSectionProps {
  title?: string;
  children: ReactNode;
}

export function EntrySettingsSection({ title, children }: EntrySettingsSectionProps) {
  return (
    <View style={styles.section}>
      {title ? (
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
});
