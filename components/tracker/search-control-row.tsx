import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface SearchControlRowProps {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  selectedScopeLabel: string;
  mediaScope?: string;
  scopeOptions?: { value: string; label: string }[];
  onMediaScopeChange?: (value: string) => void;
  sortId?: string;
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (value: string) => void;
  onOpenScopeMenu: () => void;
  onOpenFilter: () => void;
  onOpenSortMenu: () => void;
}

export function SearchControlRow({
  colors,
  selectedScopeLabel,
  onOpenScopeMenu,
  onOpenFilter,
  onOpenSortMenu,
}: SearchControlRowProps) {
  return (
    <View style={styles.controlRow}>
      <ControlButton
        label={selectedScopeLabel}
        icon="chevron.down"
        colors={colors}
        onPress={onOpenScopeMenu}
        style={styles.scopeButton}
      />

      <View style={styles.trailingControls}>
        <ControlButton
          label="Filter"
          icon="line.3.horizontal.decrease"
          colors={colors}
          onPress={onOpenFilter}
        />
        <ControlButton
          label="Sort"
          icon="arrow.up.arrow.down"
          colors={colors}
          onPress={onOpenSortMenu}
        />
      </View>
    </View>
  );
}

function ControlButton({
  colors,
  icon,
  label,
  onPress,
  style,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  icon: ComponentProps<typeof IconSymbol>['name'];
  label: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        {
          backgroundColor: colors.background,
          borderColor: colors.icon + '24',
          opacity: pressed ? 0.84 : 1,
        },
        style,
      ]}
    >
      <ThemedText type="defaultSemiBold" style={styles.controlButtonLabel}>
        {label}
      </ThemedText>
      <IconSymbol name={icon} size={18} color={colors.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  trailingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  scopeButton: {
    minWidth: 142,
  },
  controlButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButtonLabel: {
    fontSize: 17,
  },
});
