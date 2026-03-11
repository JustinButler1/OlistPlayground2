import { BlurView } from '@sbaiahmed1/react-native-blur';
import {
  AndroidHaptics,
  impactAsync,
  ImpactFeedbackStyle,
  performAndroidHapticsAsync,
} from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  Pagination,
  type PaginationProps,
} from '@/components/reacticx/pagination';

const { height } = Dimensions.get('window');
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface VerticalPageItemBase {
  image?: unknown;
}

interface VerticalPaginationCarouselProps<ItemT extends VerticalPageItemBase> {
  data: ItemT[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderItem: (info: { item: ItemT; index: number }) => React.ReactElement;
  keyExtractor?: (item: ItemT, index: number) => string;
  itemHeight?: number;
  cardMargin?: number;
  cardSpacing?: number;
  pagingEnabled?: boolean;
  showVerticalScrollIndicator?: boolean;
  scaleRange?: [number, number, number];
  rotationRange?: [number, number, number];
  opacityRange?: [number, number, number];
  useBlur?: boolean;
  style?: StyleProp<ViewStyle>;
  paginationStyle?: StyleProp<ViewStyle>;
  paginationProps?: Omit<PaginationProps, 'activeIndex' | 'totalItems' | 'onIndexChange'>;
}

function VerticalPageItemComponent<ItemT extends VerticalPageItemBase>({
  item,
  index,
  activeIndex,
  scrollY,
  renderItem,
  itemHeight,
  cardMargin,
  cardSpacing,
  scaleRange,
  rotationRange,
  opacityRange,
  useBlur,
}: {
  item: ItemT;
  index: number;
  activeIndex: number;
  scrollY: SharedValue<number>;
  renderItem: (info: { item: ItemT; index: number }) => React.ReactElement;
  itemHeight: number;
  cardMargin: number;
  cardSpacing: number;
  scaleRange: [number, number, number];
  rotationRange: [number, number, number];
  opacityRange: [number, number, number];
  useBlur: boolean;
}) {
  const animatedBlurViewProps = useAnimatedProps(() => {
    const blurAmount = interpolate(
      scrollY.value,
      [index - 1, index, index + 1],
      [20, 0, 20],
      Extrapolation.CLAMP
    );

    return {
      blurAmount,
    };
  });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [index - 1, index, index + 1],
      scaleRange,
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [index - 1, index, index + 1],
      opacityRange,
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(
          scrollY.value,
          [index - 1, index, index + 1],
          rotationRange
        )}deg`,
      },
    ],
  }));

  return (
    <View
      style={[
        styles.itemContainer,
        {
          height: itemHeight + cardSpacing,
          paddingHorizontal: cardMargin,
        },
      ]}
    >
      <Animated.View style={[styles.card, { height: itemHeight }, animatedStyle]}>
        <Animated.View style={styles.imageContainer}>
          {item.image ? (
            <Animated.Image source={item.image as never} style={[styles.image, imageAnimatedStyle]} />
          ) : null}
        </Animated.View>
        {renderItem({ item, index })}
        {useBlur && index !== activeIndex ? (
          <AnimatedBlurView
            style={StyleSheet.absoluteFill}
            animatedProps={animatedBlurViewProps}
            blurAmount={20}
            blurType="regular"
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

export function VerticalPaginationCarousel<ItemT extends VerticalPageItemBase>({
  data,
  activeIndex,
  onActiveIndexChange,
  renderItem,
  keyExtractor,
  itemHeight = height * 0.7,
  cardMargin = 20,
  cardSpacing = 20,
  pagingEnabled = true,
  showVerticalScrollIndicator = false,
  scaleRange = [0.9, 1, 0.9],
  rotationRange = [0, 0, 0],
  opacityRange = [0.5, 1, 0.5],
  useBlur = true,
  style,
  paginationStyle,
  paginationProps,
}: VerticalPaginationCarouselProps<ItemT>) {
  const listRef = useRef<FlatList<ItemT>>(null);
  const scrollY = useSharedValue(0);
  const snapSize = itemHeight + cardSpacing;
  const clampedIndex = Math.min(Math.max(activeIndex, 0), Math.max(data.length - 1, 0));

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollToOffset({
      offset: clampedIndex * snapSize,
      animated: true,
    });
  }, [clampedIndex, snapSize]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y / snapSize;
    },
    onEndDrag: () => {
      if (Platform.OS === 'ios') {
        scheduleOnRN(impactAsync, ImpactFeedbackStyle.Medium);
      } else {
        scheduleOnRN(performAndroidHapticsAsync, AndroidHaptics.Confirm);
      }
    },
  });

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / snapSize);
    const nextIndex = Math.min(Math.max(index, 0), Math.max(data.length - 1, 0));
    if (nextIndex !== clampedIndex) {
      onActiveIndexChange(nextIndex);
    }
  };

  const defaultKeyExtractor = (item: ItemT, index: number) =>
    keyExtractor ? keyExtractor(item, index) : `item-${index}`;

  return (
    <View style={[styles.carouselWrapper, style]}>
      <Pagination
        activeIndex={clampedIndex}
        totalItems={data.length}
        onIndexChange={onActiveIndexChange}
        style={[styles.paginationOverlay, paginationStyle]}
        {...paginationProps}
      />
      <Animated.FlatList
        ref={listRef}
        data={data}
        keyExtractor={defaultKeyExtractor}
        horizontal={false}
        pagingEnabled={pagingEnabled}
        showsVerticalScrollIndicator={showVerticalScrollIndicator}
        onScroll={onScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={snapSize}
        decelerationRate="fast"
        contentContainerStyle={[
          styles.flatListContent,
          { paddingVertical: (height - itemHeight) / 2 - cardSpacing / 2 },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <VerticalPageItemComponent
            item={item}
            index={index}
            activeIndex={clampedIndex}
            scrollY={scrollY}
            renderItem={renderItem}
            itemHeight={itemHeight}
            cardMargin={cardMargin}
            cardSpacing={cardSpacing}
            scaleRange={scaleRange}
            rotationRange={rotationRange}
            opacityRange={opacityRange}
            useBlur={useBlur}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  carouselWrapper: {
    flex: 1,
  },
  paginationOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  flatListContent: {},
  itemContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
