import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export interface PaginationProps {
  activeIndex: number;
  totalItems: number;
  onIndexChange?: (index: number) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  dotGap?: number;
  activeDotColor?: string;
  inactiveDotColor?: string;
  dotSize?: number;
  activeScale?: number;
}

export function Pagination({
  activeIndex,
  totalItems,
  onIndexChange,
  disabled = false,
  style,
  dotGap = 10,
  activeDotColor = '#4e2899',
  inactiveDotColor = 'rgba(78, 40, 153, 0.22)',
  dotSize = 8,
  activeScale = 1.35,
}: PaginationProps) {
  const clampedIndex = Math.min(Math.max(activeIndex, 0), Math.max(totalItems - 1, 0));

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.trackRow, { gap: dotGap }]}>
        {Array.from({ length: totalItems }, (_, index) => (
          <PaginationDot
            key={`pagination-step-${index}`}
            activeColor={activeDotColor}
            activeScale={activeScale}
            inactiveColor={inactiveDotColor}
            isActive={index === clampedIndex}
            onPress={() => onIndexChange?.(index)}
            size={dotSize}
            disabled={disabled}
            index={index}
          />
        ))}
      </View>
    </View>
  );
}

function PaginationDot({
  isActive,
  onPress,
  disabled,
  activeColor,
  inactiveColor,
  size,
  activeScale,
  index,
}: {
  isActive: boolean;
  onPress: () => void;
  disabled: boolean;
  activeColor: string;
  inactiveColor: string;
  size: number;
  activeScale: number;
  index: number;
}) {
  const scale = useSharedValue(isActive ? activeScale : 1);

  useEffect(() => {
    scale.value = withTiming(isActive ? activeScale : 1, { duration: 180 });
  }, [activeScale, isActive, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityLabel={`Go to step ${index + 1}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isActive }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={styles.dotPressable}
    >
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isActive ? activeColor : inactiveColor,
            opacity: isActive ? 1 : 0.85,
          },
          animatedStyle,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPressable: {
    padding: 2,
  },
  dot: {},
});
