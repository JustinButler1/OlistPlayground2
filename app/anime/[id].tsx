import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const JIKAN_API = 'https://api.jikan.moe/v4';

interface AnimeDetails {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  episodes?: number | null;
  score?: number | null;
  year?: number | null;
  type?: string | null;
  duration?: string | null;
  images?: {
    jpg?: {
      image_url?: string;
      large_image_url?: string;
    };
  };
  genres?: { mal_id: number; name: string }[];
}

async function fetchAnimeDetails(id: string): Promise<AnimeDetails> {
  const response = await fetch(`${JIKAN_API}/anime/${id}/full`);
  if (!response.ok) {
    throw new Error('anime_fetch_failed');
  }

  const json: { data: AnimeDetails } = await response.json();
  return json.data;
}

export default function AnimeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);
    void fetchAnimeDetails(id)
      .then(setAnime)
      .catch(() => setError('Failed to load anime details'))
      .finally(() => setLoading(false));
  }, [id]);

  const imageUrl = anime?.images?.jpg?.large_image_url ?? anime?.images?.jpg?.image_url;
  const meta = [anime?.type, anime?.episodes ? `${anime.episodes} ep` : null, anime?.year, anime?.duration]
    .filter(Boolean)
    .join(' | ');

  if (!id) {
    return (
      <>
        <Stack.Screen options={{ title: 'Anime' }} />
        <ThemedView style={styles.centered}>
          <ThemedText>Invalid anime ID.</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: anime?.title ?? 'Anime' }} />
      <ThemedView style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : error || !anime ? (
          <View style={styles.centered}>
            <ThemedText>{error ?? 'Anime not found.'}</ThemedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={() => imageUrl && setShowImage(true)}>
              <ThumbnailImage imageUrl={imageUrl} style={styles.hero} />
            </Pressable>
            <ThemedText type="title">{anime.title}</ThemedText>
            {(anime.title_english || anime.title_japanese) && (
              <ThemedText style={{ color: colors.icon }}>
                {[anime.title_english, anime.title_japanese].filter(Boolean).join(' | ')}
              </ThemedText>
            )}
            {meta ? <ThemedText style={{ color: colors.icon }}>{meta}</ThemedText> : null}
            {typeof anime.score === 'number' ? (
              <ThemedText style={{ color: colors.icon }}>Score: {anime.score.toFixed(1)}</ThemedText>
            ) : null}
            {anime.genres?.length ? (
              <View style={styles.genreRow}>
                {anime.genres.map((genre) => (
                  <View
                    key={genre.mal_id}
                    style={[styles.genreChip, { backgroundColor: colors.tint + '14' }]}
                  >
                    <ThemedText style={{ color: colors.tint }}>{genre.name}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
            {anime.synopsis ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">Synopsis</ThemedText>
                <ThemedText>{anime.synopsis}</ThemedText>
              </View>
            ) : null}
          </ScrollView>
        )}
      </ThemedView>
      <Modal visible={showImage} transparent animationType="fade" onRequestClose={() => setShowImage(false)}>
        <Pressable style={styles.imageOverlay} onPress={() => setShowImage(false)}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.fullImage} contentFit="contain" />
          ) : null}
        </Pressable>
      </Modal>
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
  },
  content: {
    padding: 20,
    gap: 12,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 20,
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
