import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiDetailPage } from '@/components/api-detail-page';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import { RatingStars } from '@/components/tracker/RatingStars';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildSeededHref,
  readDetailSeed,
} from '@/lib/detail-navigation';
import { normalizeRating } from '@/lib/tracker-metadata';
import { apiQueryKeys } from '@/services/api-query-keys';

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
  const gameQuery = useQuery({
    queryKey: apiQueryKeys.game.detail(id ?? ''),
    queryFn: ({ signal }) => fetchGameDetails(id!, signal),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
  });
  const game = gameQuery.data ?? null;
  const loading = gameQuery.isPending;
  const error =
    gameQuery.error instanceof Error && gameQuery.error.message === 'missing_igdb_credentials'
      ? 'IGDB credentials not configured.'
      : gameQuery.isError
      ? 'Failed to load game details'
      : null;

  const imageUrl = (game ? buildIgdbCoverUrl(game.cover) : null) ?? seed.imageUrl ?? null;
  const year = game ? formatIgdbYear(game.first_release_date) : null;
  const rating =
    game && typeof game.total_rating === 'number' && game.total_rating > 0
      ? normalizeRating(game.total_rating)
      : null;
  const platforms = game?.platforms?.map((platform) => platform.name).filter(Boolean) ?? [];
  const title = game?.name ?? seed.title ?? 'Game';
  const authorLine = game?.involved_companies?.map((inv) => inv.company.name).join(', ') || null;
  const progressLine = [
    year,
    platforms.length ? platforms.slice(0, 5).join(', ') : null,
  ].filter(Boolean).join(' · ') || null;

  if (!id) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Game',
            headerShadowVisible: false,
            headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
            headerTransparent: true,
          }}
        />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>Invalid game ID</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  return (
    <ApiDetailPage
      backgroundImageUrl={imageUrl}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      heroImageStyle={styles.heroImage}
      heroImageUrl={imageUrl}
      heroWrapperStyle={styles.heroImageWrap}
      scrollStyle={styles.scroll}
      screenTitle={title}
    >
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            {(authorLine || progressLine || rating !== null) ? (
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  {authorLine ? (
                    <ThemedText style={[styles.meta, { color: colors.icon }]} numberOfLines={1}>
                      {authorLine}
                    </ThemedText>
                  ) : null}
                  {progressLine ? (
                    <ThemedText style={[styles.meta, { color: colors.icon }]}>
                      {progressLine}
                    </ThemedText>
                  ) : !game && seed.subtitle ? (
                    <ThemedText style={[styles.meta, { color: colors.icon }]}>{seed.subtitle}</ThemedText>
                  ) : null}
                </View>
                {rating !== null ? <RatingStars value={rating} /> : null}
              </View>
            ) : !game && seed.subtitle ? (
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
    </ApiDetailPage>
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
    width: 180,
    height: 270,
    alignSelf: 'center',
  },
  heroImage: {
    width: 180,
    height: 270,
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 20,
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
    justifyContent: 'space-between',
    gap: 8,
  },
  metaLeft: {
    flex: 1,
    gap: 2,
  },
  meta: {
    fontSize: 14,
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
