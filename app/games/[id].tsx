import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
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

import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { RatingStars } from '@/components/tracker/RatingStars';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildSeededHref,
  isAbortError,
  readDetailSeed,
} from '@/lib/detail-navigation';
import { normalizeRating } from '@/lib/tracker-metadata';

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
  summary?: null | string;
  cover?: IgdbCover;
  first_release_date?: number;
  total_rating?: number;
  platforms?: IgdbPlatform[];
  genres?: { id: number; name: string }[];
  themes?: { id: number; name: string }[];
  involved_companies?: {
    id: number;
    company: { id: number; name: string; logo?: IgdbCover };
  }[];
  similar_games?: { id: number; name: string; cover?: IgdbCover }[];
  dlcs?: { id: number; name: string; cover?: IgdbCover }[];
  remakes?: { id: number; name: string; cover?: IgdbCover }[];
  expansions?: { id: number; name: string; cover?: IgdbCover }[];
}

let igdbAccessToken: null | string = null;
let igdbTokenExpiryMs = 0;

function getIgdbCredentials() {
  const clientId = process.env.EXPO_PUBLIC_IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.EXPO_PUBLIC_IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('missing_igdb_credentials');
  }

  return { clientId, clientSecret };
}

async function getIgdbAccessToken(signal?: AbortSignal): Promise<string> {
  const now = Date.now();
  if (igdbAccessToken && igdbTokenExpiryMs > now + 60_000) {
    return igdbAccessToken;
  }

  const { clientId, clientSecret } = getIgdbCredentials();
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(
      clientId
    )}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal,
    }
  );

  if (!response.ok) {
    throw new Error('igdb_token_failed');
  }

  const json: { access_token: string; expires_in: number } = await response.json();
  igdbAccessToken = json.access_token;
  igdbTokenExpiryMs = now + (json.expires_in - 60) * 1000;
  return igdbAccessToken;
}

function buildIgdbCoverUrl(cover?: IgdbCover) {
  if (!cover?.image_id) {
    return null;
  }

  return `${IGDB_IMAGE_BASE}/t_cover_big_2x/${cover.image_id}.jpg`;
}

function formatIgdbYear(firstReleaseDate?: number) {
  if (!firstReleaseDate) {
    return null;
  }

  const date = new Date(firstReleaseDate * 1000);
  const year = date.getFullYear();
  return Number.isFinite(year) ? String(year) : null;
}

async function fetchGameDetails(id: string, signal?: AbortSignal): Promise<IgdbGameDetails> {
  const token = await getIgdbAccessToken(signal);
  const { clientId } = getIgdbCredentials();
  const body = [
    'fields name, summary, cover.image_id, first_release_date, total_rating, platforms.name, genres.name, themes.name, involved_companies.company.name, involved_companies.company.logo.image_id, similar_games.name, similar_games.cover.image_id, dlcs.name, dlcs.cover.image_id, remakes.name, remakes.cover.image_id, expansions.name, expansions.cover.image_id ;',
    `where id = ${id} ;`,
  ].join(' ');

  const response = await fetch(IGDB_GAMES_ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (!response.ok) {
    throw new Error('Failed to load game');
  }

  const json: IgdbGameDetails[] = await response.json();
  const game = json[0];
  if (!game) {
    throw new Error('Game not found');
  }

  return game;
}

export default function GameDetailsScreen() {
  const params = useLocalSearchParams<{
    id: string;
    seedImageUrl?: string;
    seedSubtitle?: string;
    seedTitle?: string;
  }>();
  const { id } = params;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const seed = readDetailSeed(params);
  const [game, setGame] = useState<IgdbGameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setGame(null);

    fetchGameDetails(id, controller.signal)
      .then((nextGame) => {
        if (!controller.signal.aborted) {
          setGame(nextGame);
        }
      })
      .catch((caughtError) => {
        if (isAbortError(caughtError)) {
          return;
        }

        if (
          caughtError instanceof Error &&
          caughtError.message === 'missing_igdb_credentials'
        ) {
          setError('IGDB credentials not configured.');
        } else {
          setError('Failed to load game details');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id]);

  const imageUrl = (game ? buildIgdbCoverUrl(game.cover) : null) ?? seed.imageUrl ?? null;
  const year = game ? formatIgdbYear(game.first_release_date) : null;
  const rating =
    game && typeof game.total_rating === 'number' && game.total_rating > 0
      ? normalizeRating(game.total_rating)
      : null;
  const platforms = game?.platforms?.map((platform) => platform.name).filter(Boolean) ?? [];
  const title = game?.name ?? seed.title ?? 'Game';

  if (!id) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>Invalid game ID</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => imageUrl && setFullScreenImageVisible(true)}
          style={({ pressed }) => [styles.heroImageWrap, pressed && imageUrl && { opacity: 0.9 }]}
        >
          <Link.AppleZoomTarget>
            <ThumbnailImage imageUrl={imageUrl ?? undefined} style={styles.heroImage} contentFit="cover" />
          </Link.AppleZoomTarget>
        </Pressable>

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
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.fullScreenImage} contentFit="contain" />
              ) : null}
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
          <View style={styles.headerBlock}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            {!game && seed.subtitle ? (
              <ThemedText style={[styles.meta, { color: colors.icon }]}>{seed.subtitle}</ThemedText>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.sectionState}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : error || !game ? (
            <View style={styles.sectionState}>
              <ThemedText style={styles.errorText}>{error ?? 'Game not found.'}</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.metaRow}>
                {year || platforms.length ? (
                  <ThemedText style={[styles.meta, { color: colors.icon }]}>
                    {year ?? 'Unknown year'}
                    {platforms.length ? ` · ${platforms.slice(0, 5).join(', ')}` : ''}
                  </ThemedText>
                ) : null}
                {rating !== null ? <RatingStars value={rating} showValue /> : null}
              </View>

              {game.genres?.length || game.themes?.length ? (
                <ExpandableTags
                  tags={[...(game.genres || []), ...(game.themes || [])].map((tag) => ({
                    id: tag.id,
                    name: tag.name,
                  }))}
                />
              ) : null}

              {game.summary ? <ExpandableDescription text={game.summary} /> : null}

              {[
                { title: 'Similar', data: game.similar_games },
                { title: 'DLCs', data: game.dlcs },
                { title: 'Remakes', data: game.remakes },
                { title: 'Expansions', data: game.expansions },
              ].map((section) =>
                section.data && section.data.length > 0 ? (
                  <View key={section.title} style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      {section.title}
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.relatedScroll}
                    >
                      {section.data.map((related, index) => {
                        const itemImageUrl = buildIgdbCoverUrl(related.cover);
                        return (
                          <Link
                            key={`${related.id}-${index}`}
                            href={buildSeededHref(`/games/${related.id}`, {
                              title: related.name,
                              imageUrl: itemImageUrl,
                            })}
                            asChild
                          >
                            <Link.Trigger>
                              <Pressable
                                style={StyleSheet.flatten([
                                  styles.relatedCard,
                                  { backgroundColor: colors.tint + '15' },
                                ])}
                              >
                                <Link.AppleZoom>
                                  {itemImageUrl ? (
                                    <Image source={{ uri: itemImageUrl }} style={styles.relatedImage} contentFit="cover" />
                                  ) : (
                                    <View style={styles.relatedImagePlaceholder}>
                                      <IconSymbol name="photo" size={24} color={colors.icon} />
                                    </View>
                                  )}
                                </Link.AppleZoom>
                                <View style={styles.relatedContent}>
                                  <ThemedText style={styles.relatedTitle} numberOfLines={2}>
                                    {related.name}
                                  </ThemedText>
                                </View>
                              </Pressable>
                            </Link.Trigger>
                          </Link>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null
              )}

              {game.involved_companies?.length ? (
                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    Companies
                  </ThemedText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.relatedScroll}
                  >
                    {game.involved_companies.map((inv) => {
                      const logoUrl = buildIgdbCoverUrl(inv.company.logo);
                      return (
                        <Link
                          key={inv.id}
                          href={buildSeededHref(`/person/igdb-company/${inv.company.id}`, {
                            title: inv.company.name,
                            imageUrl: logoUrl,
                            imageVariant: 'logo',
                          })}
                          asChild
                        >
                          <Link.Trigger>
                            <Pressable
                              style={StyleSheet.flatten([
                                styles.relatedCard,
                                { backgroundColor: colors.tint + '15' },
                              ])}
                            >
                              <Link.AppleZoom>
                                {logoUrl ? (
                                  <Image source={{ uri: logoUrl }} style={styles.relatedImage} contentFit="contain" />
                                ) : (
                                  <View style={styles.relatedImagePlaceholder}>
                                    <IconSymbol name="photo" size={24} color={colors.icon} />
                                  </View>
                                )}
                              </Link.AppleZoom>
                              <View style={styles.relatedContent}>
                                <ThemedText style={styles.relatedTitle} numberOfLines={2}>
                                  {inv.company.name}
                                </ThemedText>
                              </View>
                            </Pressable>
                          </Link.Trigger>
                        </Link>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </>
          )}
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
    maxWidth: 260,
    alignSelf: 'center',
    aspectRatio: 2 / 3,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 20,
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
  headerBlock: {
    gap: 6,
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
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
  section: {
    marginTop: 24,
  },
  sectionState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  relatedScroll: {
    gap: 12,
  },
  relatedCard: {
    width: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  relatedImagePlaceholder: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: 'rgba(128,128,128,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedImage: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  relatedContent: {
    padding: 8,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
