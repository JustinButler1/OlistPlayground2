import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface ComposerActionBarProps {
  accessoryId?: string;
  visible: boolean;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  bottom: number;
  onSearchPress: () => void;
  onTagPress: () => void;
  onLinkPress: () => void;
  showTagButton?: boolean;
  showLinkButton?: boolean;
}

export function ComposerActionBar({
  visible,
  colors,
  bottom,
  onSearchPress,
  onTagPress,
  onLinkPress,
  showTagButton = true,
  showLinkButton = true,
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
        {showTagButton ? (
          <ActionButton icon="tag.fill" color={colors.tint} onPress={onTagPress} />
        ) : null}
        {showLinkButton ? (
          <ActionButton icon="link" color={colors.tint} onPress={onLinkPress} />
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  color,
  icon,
  onPress,
}: {
  color: string;
  icon: 'magnifyingglass' | 'tag.fill' | 'link';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionIconButton, { opacity: pressed ? 0.7 : 1 }]}
    >
      <IconSymbol name={icon} size={22} color={color} />
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
