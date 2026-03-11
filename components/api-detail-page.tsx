import { Image, type ImageContentFit } from 'expo-image';
import { Link, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BlurredImageBackground } from '@/components/blurred-image-background';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ApiDetailPageProps {
  backgroundImageUrl?: null | string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  heroContentFit?: ImageContentFit;
  heroImageStyle?: StyleProp<ImageStyle>;
  heroImageUrl?: null | string;
  heroWrapperStyle?: StyleProp<ViewStyle>;
  screenTitle: string;
  scrollStyle?: StyleProp<ViewStyle>;
}

export function ApiDetailPage({
  backgroundImageUrl,
  children,
  contentContainerStyle,
  heroContentFit = 'cover',
  heroImageStyle,
  heroImageUrl,
  heroWrapperStyle,
  screenTitle,
  scrollStyle,
}: ApiDetailPageProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const canPreview = typeof heroImageUrl === 'string' && heroImageUrl.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerShadowVisible: false,
          headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
          headerTransparent: true,
        }}
      />
      <BlurredImageBackground imageUrl={backgroundImageUrl ?? heroImageUrl}>
        <ScrollView
          style={scrollStyle}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
        >
          {heroImageUrl !== undefined ? (
            <Pressable
              onPress={() => canPreview && setFullScreenImageVisible(true)}
              style={({ pressed }) => [
                styles.heroWrap,
                heroWrapperStyle,
                pressed && canPreview ? { opacity: 0.9 } : null,
              ]}
            >
              <Link.AppleZoomTarget>
                <ThumbnailImage
                  imageUrl={heroImageUrl}
                  style={[styles.heroImage, heroImageStyle]}
                  contentFit={heroContentFit}
                />
              </Link.AppleZoomTarget>
            </Pressable>
          ) : null}
          {children}
        </ScrollView>
      </BlurredImageBackground>
      <Modal
        visible={fullScreenImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImageVisible(false)}
      >
        <Pressable style={styles.fullScreenOverlay} onPress={() => setFullScreenImageVisible(false)}>
          <Pressable onPress={() => {}} style={styles.fullScreenImageContainer}>
            {canPreview ? (
              <Image source={{ uri: heroImageUrl.trim() }} style={styles.fullScreenImage} contentFit="contain" />
            ) : null}
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.closeFullScreenButton,
              pressed ? { opacity: 0.7 } : null,
            ]}
            onPress={() => setFullScreenImageVisible(false)}
          >
            <IconSymbol name="xmark" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  closeFullScreenButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: 180,
    height: 270,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  heroWrap: {
    width: 180,
    height: 270,
    alignSelf: 'center',
  },
});
