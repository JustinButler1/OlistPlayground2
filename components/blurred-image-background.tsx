import { BlurView } from 'expo-blur';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BlurredImageBackgroundProps extends ViewProps {
  imageUrl?: null | string;
}

export function BlurredImageBackground({
  children,
  imageUrl,
  style,
  ...otherProps
}: BlurredImageBackgroundProps) {
  const colorScheme = useColorScheme() ?? 'dark';

  return (
    <View style={[styles.container, style]} {...otherProps}>
      <View style={StyleSheet.absoluteFillObject}>
        <ThumbnailImage imageUrl={imageUrl} style={styles.backgroundImage} />
        <BlurView
          intensity={92}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(5, 18, 35, 0.58)'
                  : 'rgba(245, 248, 252, 0.72)',
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    backgroundColor: ThemePalette.baseBackground,
  },
});
