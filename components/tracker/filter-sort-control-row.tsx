import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarIcon } from '@/components/avatar-icon';
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
  ownerAvatar?: {
    profileId: string;
    displayName: string;
    accessibilityLabel: string;
    onPress: () => void;
  } | null;
}

export function FilterSortControlRow({
  colors,
  filterLabel,
  sortLabel,
  onOpenFilter,
  onOpenSort,
  alignRight = false,
  ownerAvatar = null,
}: FilterSortControlRowProps) {
  return (
    <View style={[styles.wrapper, ownerAvatar ? styles.wrapperSpaced : null]}>
      {ownerAvatar ? (
        <Pressable
          accessibilityLabel={ownerAvatar.accessibilityLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={ownerAvatar.onPress}
          style={({ pressed }) => [
            styles.avatarButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.icon + '24',
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <AvatarIcon
            profileId={ownerAvatar.profileId}
            displayName={ownerAvatar.displayName}
            size={32}
          />
        </Pressable>
      ) : null}

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
  wrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  wrapperSpaced: {
    justifyContent: 'space-between',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlRowRight: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  avatarButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 6,
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
