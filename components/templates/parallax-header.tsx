import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

export interface AnimatedScrollViewProps extends ScrollViewProps {
  HeaderComponent?: ReactNode;
  headerImage?: ReactNode;
  HeaderNavbarComponent?: ReactNode;
  OverlayHeaderContent?: ReactNode;
  TopNavBarComponent?: ReactNode;
  headerMaxHeight?: number;
  topBarElevation?: number;
  topBarHeight?: number;
  disableScale?: boolean;
  imageStyle?: ScrollViewProps['style'];
  renderHeaderComponent?: () => ReactNode;
  renderHeaderNavBarComponent?: () => ReactNode;
  renderOveralComponent?: () => ReactNode;
  renderTopNavBarComponent?: () => ReactNode;
}

export const AnimatedScrollView = forwardRef<ScrollView, AnimatedScrollViewProps>(
  (
    {
      HeaderComponent,
      HeaderNavbarComponent,
      OverlayHeaderContent,
      TopNavBarComponent,
      contentContainerStyle,
      renderHeaderComponent,
      renderHeaderNavBarComponent,
      renderOveralComponent,
      renderTopNavBarComponent,
      children,
      ...props
    },
    ref
  ) => {
    const header = renderHeaderComponent?.() ?? HeaderComponent;
    const overlay = renderOveralComponent?.() ?? OverlayHeaderContent;
    const headerNavbar = renderHeaderNavBarComponent?.() ?? HeaderNavbarComponent;
    const topNavbar = renderTopNavBarComponent?.() ?? TopNavBarComponent;

    return (
      <ScrollView
        ref={ref}
        contentInsetAdjustmentBehavior="automatic"
        {...props}
        contentContainerStyle={contentContainerStyle}
      >
        {topNavbar}
        {headerNavbar}
        {header ? <View style={styles.header}>{header}</View> : null}
        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
        {children}
      </ScrollView>
    );
  }
);

AnimatedScrollView.displayName = 'AnimatedScrollView';

export default AnimatedScrollView;

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  overlay: {
    width: '100%',
  },
});
