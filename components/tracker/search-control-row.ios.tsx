import { Button, Host, HStack, Image, Picker, Spacer, Text } from '@expo/ui/swift-ui';
import {
  background,
  border,
  buttonStyle,
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
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';

interface SearchControlRowProps {
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  selectedScopeLabel: string;
  mediaScope: string;
  scopeOptions: { value: string; label: string }[];
  onMediaScopeChange: (value: string) => void;
  sortId: string;
  sortOptions: { value: string; label: string }[];
  onSortChange: (value: string) => void;
  onOpenFilter: () => void;
}

export function SearchControlRow({
  colors,
  selectedScopeLabel,
  mediaScope,
  scopeOptions,
  onMediaScopeChange,
  sortId,
  sortOptions,
  onSortChange,
  onOpenFilter,
}: SearchControlRowProps) {
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
    <Host style={{ minHeight: 54 }}>
      <HStack spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
        <Picker
          label={
            <HStack spacing={10} modifiers={[...capsuleModifiers, frame({ minWidth: 142 })]}>
              <Text modifiers={[foregroundColor(colors.text)]}>{selectedScopeLabel}</Text>
              <Image
                systemName="chevron.down"
                size={14}
                modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
              />
            </HStack>
          }
          selection={mediaScope}
          onSelectionChange={(value) => {
            if (typeof value === 'string') {
              onMediaScopeChange(value);
            }
          }}
          modifiers={[pickerStyle('menu')]}
        >
          {scopeOptions.map((option) => (
            <Text key={option.value} modifiers={[tag(option.value)]}>
              {option.label}
            </Text>
          ))}
        </Picker>

        <Spacer />

        <Button onPress={onOpenFilter} modifiers={[buttonStyle('plain')]}>
          <HStack spacing={10} modifiers={capsuleModifiers}>
            <Text modifiers={[foregroundColor(colors.text)]}>Filter</Text>
            <Image
              systemName="line.3.horizontal.decrease"
              size={16}
              modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
            />
          </HStack>
        </Button>

        <Picker
          label={
            <HStack spacing={10} modifiers={capsuleModifiers}>
              <Text modifiers={[foregroundColor(colors.text)]}>Sort</Text>
              <Image
                systemName="arrow.up.arrow.down"
                size={16}
                modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}
              />
            </HStack>
          }
          selection={sortId}
          onSelectionChange={(value) => {
            if (typeof value === 'string') {
              onSortChange(value);
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
  );
}
