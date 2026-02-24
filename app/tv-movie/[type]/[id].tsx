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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TMDB_BACKDROP_SIZE = 'w780';

type TmdbType = 'movie' | 'tv';

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  status: string;
  tagline: string | null;
  genres: TmdbGenre[];
}

interface TmdbTvDetails {
  id: number;
  name: string;
  original_name: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  vote_count: number;
  status: string;
  tagline: string | null;
  genres: TmdbGenre[];
}

type TmdbDetails = TmdbMovieDetails | TmdbTvDetails;

function getTmdbApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();
  return key ? key : null;
}

async function fetchTmdbDetails(
  type: TmdbType,
  id: string
): Promise<TmdbDetails> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) throw new Error('TMDB API key not configured');

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const res = await fetch(
    `${TMDB_API_BASE}/${endpoint}/${id}?api_key=${encodeURIComponent(apiKey)}&language=en-US`
  );
  if (!res.ok) throw new Error('Failed to load details');
  return res.json();
}

function isMovie(d: TmdbDetails): d is TmdbMovieDetails {
  return 'title' in d && 'release_date' in d;
}

export default function TvMovieDetailsScreen() {
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [details, setDetails] = useState<TmdbDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);

  const mediaType: TmdbType | null =
    type === 'movie' || type === 'tv' ? type : null;

  useEffect(() => {
    if (!id || !mediaType) return;
    setLoading(true);
    setError(null);
    fetchTmdbDetails(mediaType, id)
      .then(setDetails)
      .catch(() => setError('Failed to load details'))
      .finally(() => setLoading(false));
  }, [id, mediaType]);

  const backdropPath = details?.backdrop_path ?? details?.poster_path;
  const img = backdropPath
    ? `${TMDB_IMAGE_BASE}/${TMDB_BACKDROP_SIZE}${backdropPath}`
    : null;
  const title = details
    ? isMovie(details)
      ? details.title
      : details.name
    : '';
  const subtitle = details
    ? isMovie(details)
      ? details.original_title
      : details.original_name
    : null;
  const dateStr = details
    ? isMovie(details)
      ? details.release_date?.slice(0, 4)
      : details.first_air_date?.slice(0, 4)
    : null;
  const metaParts: string[] = [];
  if (mediaType) metaParts.push(mediaType === 'movie' ? 'Movie' : 'TV');
  if (dateStr) metaParts.push(dateStr);
  if (details && isMovie(details) && details.runtime)
    metaParts.push(`${details.runtime} min`);
  if (details && !isMovie(details)) {
    if (details.number_of_seasons)
      metaParts.push(`${details.number_of_seasons} season(s)`);
    if (details.number_of_episodes)
      metaParts.push(`${details.number_of_episodes} ep`);
  }

  const headerTitle = title || (mediaType === 'movie' ? 'Movie' : 'TV');

  if (!id || !mediaType) {
    return (
      <>
        <Stack.Screen options={{ title: mediaType === 'movie' ? 'Movie' : 'TV' }} />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>Invalid TV/Movie ID</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  if (loading || error) {
    return (
      <>
        <Stack.Screen options={{ title: headerTitle }} />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.tint} />
            ) : (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            )}
          </View>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ThemedView style={styles.container}>
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
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {subtitle}
            </ThemedText>
          ) : null}

          <View style={styles.metaRow}>
            {metaParts.length > 0 && (
              <ThemedText style={[styles.meta, { color: colors.icon }]}>
                {metaParts.join(' · ')}
              </ThemedText>
            )}
            {details!.vote_average > 0 && (
              <ThemedText style={styles.score}>
                ★ {details!.vote_average.toFixed(1)}
              </ThemedText>
            )}
          </View>

          {details!.tagline ? (
            <ThemedText style={[styles.tagline, { color: colors.icon }]}>
              {details!.tagline}
            </ThemedText>
          ) : null}

          {details!.genres?.length > 0 && (
            <View style={styles.genres}>
              {details!.genres.map((g) => (
                <View
                  key={g.id}
                  style={[styles.genreChip, { backgroundColor: colors.tint + '20' }]}
                >
                  <ThemedText style={[styles.genreText, { color: colors.tint }]}>
                    {g.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {details!.overview ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Overview
              </ThemedText>
              <ThemedText style={styles.synopsis}>{details!.overview}</ThemedText>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 8,
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
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
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
