import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface ComposerActionBarProps {
  accessoryId?: string;
  visible: boolean;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  bottom: number;
  sublistMode?: boolean;
  onSearchPress: () => void;
  onTagPress: () => void;
  onLinkPress: () => void;
  onSublistToggle?: () => void;
}

export function ComposerActionBar({
  visible,
  colors,
  bottom,
  sublistMode,
  onSearchPress,
  onTagPress,
  onLinkPress,
  onSublistToggle,
}: ComposerActionBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.actionBarWrap,
        {
          bottom,
          paddingHorizontal: 20,
        },
      ]}
    >
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.background,
            borderColor: colors.icon + '22',
          },
        ]}
      >
        <ActionButton icon="magnifyingglass" color={colors.tint} onPress={onSearchPress} />
        <ActionButton icon="tag.fill" color={colors.tint} onPress={onTagPress} />
        <ActionButton icon="link" color={colors.tint} onPress={onLinkPress} />
        {onSublistToggle ? (
          <ActionButton
            icon="list.bullet"
            color={colors.tint}
            active={sublistMode}
            activeColor={colors.tint}
            backgroundColor={colors.background}
            onPress={onSublistToggle}
          />
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  color,
  icon,
  active,
  activeColor,
  backgroundColor,
  onPress,
}: {
  color: string;
  icon: 'magnifyingglass' | 'tag.fill' | 'link' | 'list.bullet';
  active?: boolean;
  activeColor?: string;
  backgroundColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionIconButton,
        { opacity: pressed ? 0.7 : 1 },
        active && {
          backgroundColor: (activeColor ?? color) + '20',
          borderRadius: 14,
        },
      ]}
    >
      <IconSymbol name={icon} size={22} color={active ? (activeColor ?? color) : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  actionBar: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  actionIconButton: {
    width: 56,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
});
