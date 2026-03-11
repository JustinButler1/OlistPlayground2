import { InputAccessoryView, Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface ComposerActionBarProps {
  accessoryId: string;
  visible: boolean;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  bottom?: number;
  onSearchPress: () => void;
  onTagPress: () => void;
  onLinkPress: () => void;
}

export function ComposerActionBar({
  accessoryId,
  visible,
  colors,
  onSearchPress,
  onTagPress,
  onLinkPress,
}: ComposerActionBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <InputAccessoryView nativeID={accessoryId}>
      <View
        style={[
          styles.accessoryWrap,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.icon + '18',
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
        </View>
      </View>
    </InputAccessoryView>
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
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionIconButton, { opacity: pressed ? 0.7 : 1 }]}
    >
      <IconSymbol name={icon} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accessoryWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
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
