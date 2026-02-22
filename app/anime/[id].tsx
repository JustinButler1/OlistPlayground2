import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const JIKAN_API = 'https://api.jikan.moe/v4';

interface AnimeDetails {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  scored_by: number | null;
  synopsis: string | null;
  year: number | null;
  duration: string | null;
  rating: string | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
  };
  genres: { mal_id: number; name: string }[];
  studios: { mal_id: number; name: string }[];
  url: string;
}

async function fetchAnimeDetails(id: string): Promise<AnimeDetails> {
  const res = await fetch(`${JIKAN_API}/anime/${id}/full`);
  if (!res.ok) throw new Error('Failed to load anime');
  const json = await res.json();
  return json.data;
}

export default function AnimeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchAnimeDetails(id)
      .then(setAnime)
      .catch(() => setError('Failed to load anime details'))
      .finally(() => setLoading(false));
  }, [id]);

  const img = anime?.images?.jpg?.large_image_url ?? anime?.images?.jpg?.image_url;

  if (!id) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
          <ThemedText>Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.errorText}>Invalid anime ID</ThemedText>
      </ThemedView>
    );
  }

  if (loading || error) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
          <ThemedText>Back</ThemedText>
        </Pressable>
        <View style={styles.centered}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} />
          ) : (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <IconSymbol name="chevron.left" size={24} color={colors.text} />
        <ThemedText>Back</ThemedText>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {img ? (
          <Pressable
            onPress={() => setFullScreenImageVisible(true)}
            style={({ pressed }) => [styles.heroImageWrap, pressed && { opacity: 0.9 }]}
          >
            <Image
              source={{ uri: img }}
              style={styles.heroImage}
              contentFit="cover"
            />
          </Pressable>
        ) : null}

        <Modal
          visible={fullScreenImageVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFullScreenImageVisible(false)}
        >
          <Pressable
            style={styles.fullScreenOverlay}
            onPress={() => setFullScreenImageVisible(false)}
          >
            <Pressable onPress={() => {}} style={styles.fullScreenImageContainer}>
              <Image
                source={{ uri: img! }}
                style={styles.fullScreenImage}
                contentFit="contain"
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.closeFullScreenButton,
                { top: insets.top + 12 },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => setFullScreenImageVisible(false)}
            >
              <IconSymbol name="xmark" size={24} color="#fff" />
            </Pressable>
          </Pressable>
        </Modal>

        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {anime!.title}
          </ThemedText>
          {(anime!.title_english || anime!.title_japanese) && (
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {[anime!.title_english, anime!.title_japanese].filter(Boolean).join(' · ')}
            </ThemedText>
          )}

          <View style={styles.metaRow}>
            {anime!.type && (
              <ThemedText style={[styles.meta, { color: colors.icon }]}>
                {anime!.type}
                {anime!.episodes ? ` · ${anime!.episodes} ep` : ''}
                {anime!.year ? ` · ${anime!.year}` : ''}
                {anime!.duration ? ` · ${anime!.duration}` : ''}
              </ThemedText>
            )}
            {anime!.score != null && (
              <ThemedText style={styles.score}>★ {anime!.score}</ThemedText>
            )}
          </View>

          {anime!.genres?.length > 0 && (
            <View style={styles.genres}>
              {anime!.genres.map((g) => (
                <View key={g.mal_id} style={[styles.genreChip, { backgroundColor: colors.tint + '20' }]}>
                  <ThemedText style={[styles.genreText, { color: colors.tint }]}>{g.name}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {anime!.synopsis ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Synopsis
              </ThemedText>
              <ThemedText style={styles.synopsis}>{anime!.synopsis}</ThemedText>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroImageWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeFullScreenButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  meta: {
    fontSize: 14,
    flex: 1,
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  synopsis: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
  },
});
