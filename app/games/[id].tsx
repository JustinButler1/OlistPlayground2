import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
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

const IGDB_GAMES_ENDPOINT = 'https://api.igdb.com/v4/games';
const IGDB_IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload';

interface IgdbCover {
  id: number;
  image_id: string;
}

interface IgdbPlatform {
  id: number;
  name: string;
}

interface IgdbGameDetails {
  id: number;
  name: string;
  summary?: string | null;
  cover?: IgdbCover;
  first_release_date?: number;
  total_rating?: number;
  platforms?: IgdbPlatform[];
}

let igdbAccessToken: string | null = null;
let igdbTokenExpiryMs = 0;

function getIgdbCredentials() {
  const clientId = process.env.EXPO_PUBLIC_IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.EXPO_PUBLIC_IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('missing_igdb_credentials');
  }
  return { clientId, clientSecret };
}

async function getIgdbAccessToken(): Promise<string> {
  const now = Date.now();
  if (igdbAccessToken && igdbTokenExpiryMs > now + 60_000) {
    return igdbAccessToken;
  }
  const { clientId, clientSecret } = getIgdbCredentials();
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
      clientId
    )}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  if (!res.ok) throw new Error('igdb_token_failed');
  const json: { access_token: string; expires_in: number } = await res.json();
  igdbAccessToken = json.access_token;
  igdbTokenExpiryMs = now + (json.expires_in - 60) * 1000;
  return igdbAccessToken;
}

function buildIgdbCoverUrl(cover?: IgdbCover): string | null {
  if (!cover?.image_id) return null;
  return `${IGDB_IMAGE_BASE}/t_cover_big/${cover.image_id}.jpg`;
}

function formatIgdbYear(firstReleaseDate?: number): string | null {
  if (!firstReleaseDate) return null;
  const date = new Date(firstReleaseDate * 1000);
  const year = date.getFullYear();
  return Number.isFinite(year) ? String(year) : null;
}

async function fetchGameDetails(id: string): Promise<IgdbGameDetails> {
  const token = await getIgdbAccessToken();
  const { clientId } = getIgdbCredentials();
  const body = [
    `fields name, summary, cover.image_id, first_release_date, total_rating, platforms.name ;`,
    `where id = ${id} ;`,
  ].join(' ');

  const res = await fetch(IGDB_GAMES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!res.ok) throw new Error('Failed to load game');
  const json: IgdbGameDetails[] = await res.json();
  const game = json?.[0];
  if (!game) throw new Error('Game not found');
  return game;
}

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [game, setGame] = useState<IgdbGameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchGameDetails(id)
      .then(setGame)
      .catch((e) => {
        if (e instanceof Error && e.message === 'missing_igdb_credentials') {
          setError('IGDB credentials not configured.');
        } else {
          setError('Failed to load game details');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const img = game ? buildIgdbCoverUrl(game.cover) : null;
  const year = game ? formatIgdbYear(game.first_release_date) : null;
  const rating =
    game && typeof game.total_rating === 'number' && game.total_rating > 0
      ? Math.round(game.total_rating)
      : null;
  const platforms = game?.platforms?.map((p) => p.name).filter(Boolean) ?? [];

  if (!id) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>Invalid game ID</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (loading || error) {
    return (
      <ThemedView style={styles.container}>
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
        ) : (
          <View style={[styles.heroImageWrap, styles.placeholderImage]} />
        )}

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
              {img && (
                <Image
                  source={{ uri: img }}
                  style={styles.fullScreenImage}
                  contentFit="contain"
                />
              )}
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
            {game!.name}
          </ThemedText>

          <View style={styles.metaRow}>
            {(year || platforms.length > 0) && (
              <ThemedText style={[styles.meta, { color: colors.icon }]}>
                {year ?? 'Unknown year'}
                {platforms.length ? ` · ${platforms.slice(0, 5).join(', ')}` : ''}
              </ThemedText>
            )}
            {rating != null && (
              <ThemedText style={styles.score}>★ {rating}</ThemedText>
            )}
          </View>

          {game!.summary ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Summary
              </ThemedText>
              <ThemedText style={styles.synopsis}>{game!.summary}</ThemedText>
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
  placeholderImage: {
    backgroundColor: 'rgba(128,128,128,0.25)',
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
