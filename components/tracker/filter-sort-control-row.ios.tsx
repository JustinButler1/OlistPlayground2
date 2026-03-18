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
import { Pressable, Platform, StyleSheet, View } from 'react-native';

import { AvatarIcon } from '@/components/avatar-icon';
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
  filterValue,
  sortValue,
  filterOptions = [],
  sortOptions = [],
  onFilterChange,
  onSortChange,
  alignRight = false,
  ownerAvatar = null,
}: FilterSortControlRowProps) {
  const supportsLiquidGlass =
    Number.parseInt(String(Platform.Version).split('.')[0] ?? '0', 10) >= 26;
  const capsuleModifiers = supportsLiquidGlass
    ? [
        padding({ horizontal: 16, vertical: 12 }),
        glassEffect({
          glass: { interactive: true, variant: 'regular' },
          shape: 'capsule',
        }),
      ]
    : [
        padding({ horizontal: 16, vertical: 12 }),
        background(colors.background, shapes.capsule()),
        border({ color: colors.icon + '24', width: 1 }),
        cornerRadius(999),
      ];

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

      <Host style={styles.host}>
        <HStack spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
          {alignRight ? <Spacer /> : null}

          <Picker
            label={
              <HStack spacing={10} modifiers={capsuleModifiers}>
                <Text modifiers={[foregroundColor(colors.text)]}>{filterLabel}</Text>
                <Image
                  systemName="line.3.horizontal.decrease"
                  size={16}
                  modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
                />
              </HStack>
            }
            selection={filterValue ?? filterOptions[0]?.value ?? ''}
            onSelectionChange={(value) => {
              if (typeof value === 'string') {
                onFilterChange?.(value);
              }
            }}
            modifiers={[pickerStyle('menu')]}
          >
            {filterOptions.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>

          <Picker
            label={
              <HStack spacing={10} modifiers={capsuleModifiers}>
                <Text modifiers={[foregroundColor(colors.text)]}>{sortLabel}</Text>
                <Image
                  systemName="arrow.up.arrow.down"
                  size={16}
                  modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
                />
              </HStack>
            }
            selection={sortValue ?? sortOptions[0]?.value ?? ''}
            onSelectionChange={(value) => {
              if (typeof value === 'string') {
                onSortChange?.(value);
              }
            }}
            modifiers={[pickerStyle('menu')]}
          >
            {sortOptions.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </HStack>
      </Host>
    </View>
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
  host: {
    flex: 1,
    minHeight: 54,
  },
  avatarButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 6,
  },
});
