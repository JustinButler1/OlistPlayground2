import { StyleSheet, View, useWindowDimensions, type ViewProps } from 'react-native';

import AuroraBackground from '@/components/molecules/aurora';
import { Colors, ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabRootBackgroundProps = ViewProps;

export function TabRootBackground({ children, style, ...rest }: TabRootBackgroundProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { width, height } = useWindowDimensions();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }, style]} {...rest}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <AuroraBackground
          width={width}
          height={height}
          auroraColors={
            isDark
              ? [ThemePalette.primaryBrand, ThemePalette.primaryAccent, ThemePalette.secondaryAccent]
              : [ThemePalette.primaryAccent, ThemePalette.primaryBrand, ThemePalette.secondaryAccent]
          }
          skyColors={
            isDark
              ? [ThemePalette.baseBackground, ThemePalette.secondaryBrand]
              : ['#edf4fb', '#d6e8f7']
          }
          speed={0.3}
          intensity={isDark ? 1.02 : 0.74}
          waveDirection={isDark ? [7, -5] : [5, -3]}
          style={styles.backgroundAurora}
        />
        <View
          style={[
            styles.backgroundScrim,
            {
              backgroundColor: isDark ? 'rgba(5, 18, 35, 0.26)' : 'rgba(245, 248, 252, 0.28)',
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundAurora: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
  },
});
