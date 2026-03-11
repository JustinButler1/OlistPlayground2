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

import {
  Pagination,
  type PaginationProps,
} from '@/components/reacticx/pagination';

export interface VerticalPaginationCarouselProps<ItemT> {
  data: readonly ItemT[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderItem: (info: { item: ItemT; index: number; pageHeight: number }) => ReactElement;
  keyExtractor?: (item: ItemT, index: number) => string;
  scrollEnabled?: boolean;
  pageSpacing?: number;
  itemVerticalInset?: number;
  pageStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  paginationStyle?: StyleProp<ViewStyle>;
  paginationProps?: Omit<PaginationProps, 'activeIndex' | 'totalItems' | 'onIndexChange'>;
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
  paginationProps,
}: VerticalPaginationCarouselProps<ItemT>) {
  const listRef = useRef<FlatList<ItemT>>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
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
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item, index) => keyExtractor?.(item, index) ?? `page-${index}`}
            renderItem={({ item, index }) => (
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
                      marginBottom: index === data.length - 1 ? 0 : pageSpacing,
                    },
                    pageStyle,
                  ]}
                >
                  {renderItem({ item, index, pageHeight: itemHeight })}
                </View>
              </View>
            )}
            snapToInterval={pageSize}
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onMomentumScrollEnd={handleMomentumScrollEnd}
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
  },
});
