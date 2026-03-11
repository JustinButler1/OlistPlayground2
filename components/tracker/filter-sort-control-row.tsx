import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface FilterSortControlRowProps {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  filterLabel: string;
  sortLabel: string;
  filterValue?: string;
  sortValue?: string;
  filterOptions?: { value: string; label: string }[];
  sortOptions?: { value: string; label: string }[];
  onFilterChange?: (value: string) => void;
  onSortChange?: (value: string) => void;
  onOpenFilter?: () => void;
  onOpenSort?: () => void;
  alignRight?: boolean;
}

export function FilterSortControlRow({
  colors,
  filterLabel,
  sortLabel,
  onOpenFilter,
  onOpenSort,
  alignRight = false,
}: FilterSortControlRowProps) {
  return (
    <View style={[styles.controlRow, alignRight ? styles.controlRowRight : null]}>
      <ControlButton
        label={filterLabel}
        icon="line.3.horizontal.decrease"
        colors={colors}
        onPress={onOpenFilter ?? (() => {})}
      />
      <ControlButton
        label={sortLabel}
        icon="arrow.up.arrow.down"
        colors={colors}
        onPress={onOpenSort ?? (() => {})}
      />
    </View>
  );
}

function ControlButton({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  icon: ComponentProps<typeof IconSymbol>['name'];
  label: string;
  onPress: () => void;
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
    gap: 12,
  },
  controlRowRight: {
    justifyContent: 'flex-end',
  },
  controlButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  controlButtonLabel: {
    fontSize: 17,
  },
});
