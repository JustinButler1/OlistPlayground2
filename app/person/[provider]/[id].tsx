import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { readDetailSeed } from '@/lib/detail-navigation';

export default function PersonDetailsPlaceholder() {
  const params = useLocalSearchParams<{
    id: string;
    provider: string;
    seedImageUrl?: string;
    seedImageVariant?: string;
    seedSubtitle?: string;
    seedTitle?: string;
  }>();
  const { provider, id } = params;
  const seed = readDetailSeed(params);
  const title = seed.title ?? 'Details';
  const subtitle = seed.subtitle ?? `Provider: ${provider}`;
  const imageStyle =
    seed.imageVariant === 'avatar'
      ? styles.avatarImage
      : seed.imageVariant === 'logo'
      ? styles.logoImage
      : styles.posterImage;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          {seed.imageUrl ? (
            <Link.AppleZoomTarget>
              <ThumbnailImage imageUrl={seed.imageUrl} style={imageStyle} contentFit="cover" />
            </Link.AppleZoomTarget>
          ) : null}
          <ThemedText type="title" style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.meta}>{subtitle}</ThemedText>
          <ThemedText style={styles.meta}>ID: {id}</ThemedText>
          <ThemedText style={styles.placeholder}>
            This page is a placeholder under construction. More details will be implemented soon!
          </ThemedText>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: {
    textAlign: 'center',
  },
  meta: {
    opacity: 0.8,
    textAlign: 'center',
  },
  placeholder: {
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 32,
  },
  posterImage: {
    width: 180,
    aspectRatio: 2 / 3,
    borderRadius: 20,
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  logoImage: {
    width: 220,
    height: 140,
    borderRadius: 20,
  },
});
