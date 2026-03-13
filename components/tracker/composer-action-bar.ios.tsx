import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
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
  showTagButton?: boolean;
  showLinkButton?: boolean;
}

export function ComposerActionBar({
  accessoryId,
  visible,
  colors,
  onSearchPress,
  onTagPress,
  onLinkPress,
  showTagButton = true,
  showLinkButton = true,
}: ComposerActionBarProps) {
  if (!visible) {
    return null;
  }

  const supportsGlass = isGlassEffectAPIAvailable();

  return (
    <InputAccessoryView nativeID={accessoryId}>
      <View style={styles.accessoryWrap}>
        {supportsGlass ? (
          <GlassView
            glassEffectStyle="regular"
            isInteractive
            style={styles.actionBar}
          >
            <ActionButton icon="magnifyingglass" color={colors.tint} onPress={onSearchPress} />
            {showTagButton ? (
              <ActionButton icon="tag.fill" color={colors.tint} onPress={onTagPress} />
            ) : null}
            {showLinkButton ? (
              <ActionButton icon="link" color={colors.tint} onPress={onLinkPress} />
            ) : null}
          </GlassView>
        ) : (
          <View
            style={[
              styles.actionBar,
              styles.actionBarFallback,
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
        )}
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
      <IconSymbol name={icon} size={26} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  accessoryWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  actionBar: {
    alignSelf: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  actionBarFallback: {
    borderWidth: 1,
  },
  actionIconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
});
