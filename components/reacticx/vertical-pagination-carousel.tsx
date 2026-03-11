import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  Pagination,
  type PaginationProps,
} from '@/components/reacticx/pagination';

export interface VerticalPaginationCarouselProps<ItemT> {
  data: readonly ItemT[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderItem: (info: {
    item: ItemT;
    index: number;
    pageHeight: number;
    blurOverlay: ReactElement;
  }) => ReactElement;
  keyExtractor?: (item: ItemT, index: number) => string;
  scrollEnabled?: boolean;
  pageSpacing?: number;
  itemVerticalInset?: number;
  pageStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  paginationStyle?: StyleProp<ViewStyle>;
  cardBlurIntensity?: number;
  paginationProps?: Omit<PaginationProps, 'activeIndex' | 'totalItems' | 'onIndexChange'>;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function CarouselPage<ItemT>({
  index,
  item,
  itemHeight,
  pageSize,
  pageSpacing,
  pageStyle,
  renderItem,
  scrollOffset,
  cardBlurIntensity,
  isLast,
}: {
  index: number;
  item: ItemT;
  itemHeight: number;
  pageSize: number;
  pageSpacing: number;
  pageStyle?: StyleProp<ViewStyle>;
  renderItem: (info: {
    item: ItemT;
    index: number;
    pageHeight: number;
    blurOverlay: ReactElement;
  }) => ReactElement;
  scrollOffset: SharedValue<number>;
  cardBlurIntensity: number;
  isLast: boolean;
}) {
  const blurStyle = useAnimatedStyle(() => {
    const pagePosition = pageSize > 0 ? scrollOffset.value / pageSize : 0;
    const blurOpacity = interpolate(
      Math.abs(pagePosition - index),
      [0, 0.18, 0.75],
      [0, 0.18, 0.72],
      Extrapolation.CLAMP
    );

    return {
      opacity: blurOpacity,
    };
  });

  const blurOverlay = (
    <AnimatedBlurView
      intensity={cardBlurIntensity}
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, blurStyle]}
      tint="default"
    />
  );

  return (
    <View
      style={[
        styles.pageOuter,
        {
          height: pageSize,
        },
      ]}
    >
      <View
        style={[
          styles.page,
          {
            height: itemHeight,
            marginBottom: isLast ? 0 : pageSpacing,
          },
          pageStyle,
        ]}
      >
        {renderItem({ item, index, pageHeight: itemHeight, blurOverlay })}
      </View>
    </View>
  );
}

export function VerticalPaginationCarousel<ItemT>({
  data,
  activeIndex,
  onActiveIndexChange,
  renderItem,
  keyExtractor,
  scrollEnabled = true,
  pageSpacing = 18,
  itemVerticalInset = 64,
  pageStyle,
  style,
  paginationStyle,
  cardBlurIntensity = 88,
  paginationProps,
}: VerticalPaginationCarouselProps<ItemT>) {
  const listRef = useRef<FlatList<ItemT>>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollOffset = useSharedValue(0);
  const clampedIndex = Math.min(Math.max(activeIndex, 0), Math.max(data.length - 1, 0));
  const itemHeight = Math.max(viewportHeight - itemVerticalInset * 2, 0);
  const pageSize = itemHeight + pageSpacing;

  useEffect(() => {
    if (!viewportHeight || !itemHeight || !listRef.current) {
      return;
    }

    listRef.current.scrollToOffset({
      offset: clampedIndex * pageSize,
      animated: true,
    });
  }, [clampedIndex, itemHeight, pageSize, viewportHeight]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight !== viewportHeight) {
      setViewportHeight(nextHeight);
    }
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageSize) {
      return;
    }

    const index = Math.round(event.nativeEvent.contentOffset.y / pageSize);
    const nextIndex = Math.min(Math.max(index, 0), Math.max(data.length - 1, 0));
    if (nextIndex !== clampedIndex) {
      onActiveIndexChange(nextIndex);
    }
  };

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
    },
  });

  return (
    <View style={[styles.root, style]}>
      <Pagination
        activeIndex={clampedIndex}
        totalItems={data.length}
        onIndexChange={onActiveIndexChange}
        style={[styles.paginationOverlay, paginationStyle]}
        {...paginationProps}
      />
      <View onLayout={handleLayout} style={styles.viewport}>
        {viewportHeight > 0 && itemHeight > 0 ? (
          <Animated.FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item, index) => keyExtractor?.(item, index) ?? `page-${index}`}
            renderItem={({ item, index }) => (
              <CarouselPage
                cardBlurIntensity={cardBlurIntensity}
                index={index}
                isLast={index === data.length - 1}
                item={item}
                itemHeight={itemHeight}
                pageSize={pageSize}
                pageSpacing={pageSpacing}
                pageStyle={pageStyle}
                renderItem={renderItem}
                scrollOffset={scrollOffset}
              />
            )}
            snapToInterval={pageSize}
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingVertical: Math.max((viewportHeight - itemHeight - pageSpacing) / 2, 0),
            }}
            getItemLayout={(_, index) => ({
              length: pageSize,
              offset: pageSize * index,
              index,
            })}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({
                offset: index * pageSize,
                animated: true,
              });
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  viewport: {
    flex: 1,
  },
  paginationOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  pageOuter: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  page: {
    width: '100%',
    overflow: 'hidden',
  },
});
