import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ContextAction = {
  destructive?: boolean;
  icon: 'list.bullet' | 'pin.fill' | 'trash';
  id: string;
  label: string;
  onPress: () => void;
};

type ContextActionPopoverProps = {
  actions: ContextAction[];
  anchor: { x: number; y: number; width: number; height: number } | null;
  onClose: () => void;
  visible: boolean;
};

const POPOVER_WIDTH = 208;
const ACTION_ROW_HEIGHT = 52;
const POPOVER_EDGE_MARGIN = 12;
const POPOVER_THUMBNAIL_GAP = 8;

export function ContextActionPopover({
  actions,
  anchor,
  onClose,
  visible,
}: ContextActionPopoverProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!visible || !anchor) {
    return null;
  }

  const popoverHeight = actions.length * ACTION_ROW_HEIGHT;
  const anchorCenterX = anchor.x + anchor.width / 2;
  const preferredLeft = anchorCenterX - POPOVER_WIDTH / 2;
  const left = Math.min(
    Math.max(preferredLeft, POPOVER_EDGE_MARGIN),
    windowWidth - POPOVER_WIDTH - POPOVER_EDGE_MARGIN
  );

  const belowTop = anchor.y + anchor.height + POPOVER_THUMBNAIL_GAP;
  const aboveTop = anchor.y - popoverHeight - POPOVER_THUMBNAIL_GAP;
  const fitsBelow = belowTop + popoverHeight <= windowHeight - POPOVER_EDGE_MARGIN;
  const top = fitsBelow
    ? belowTop
    : Math.max(aboveTop, POPOVER_EDGE_MARGIN);

  return (
    <Pressable onPress={onClose} style={styles.overlay}>
      <BlurView
        intensity={84}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={[
          styles.card,
          {
            left,
            top,
            backgroundColor: colors.background + 'E8',
            borderColor: colors.icon + '22',
          },
        ]}
      >
        {actions.map((action, index) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.actionRow,
              index < actions.length - 1
                ? {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.icon + '1E',
                  }
                : null,
              {
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <View style={styles.actionTextWrap}>
              <ThemedText style={{ color: action.destructive ? '#C62828' : colors.text }}>
                {action.label}
              </ThemedText>
            </View>
            <IconSymbol
              name={action.icon}
              size={18}
              color={action.destructive ? '#C62828' : colors.icon}
            />
          </Pressable>
        ))}
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  card: {
    position: 'absolute',
    width: POPOVER_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
});
