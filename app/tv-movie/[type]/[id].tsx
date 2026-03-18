import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiDetailPage } from '@/components/api-detail-page';
import {
  ItemDetailTabs,
  type ItemDetailTabId,
} from '@/components/tracker/ItemDetailTabs';
import { ItemUserDataPanel } from '@/components/tracker/ItemUserDataPanel';
import { RatingStars } from '@/components/tracker/RatingStars';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { getItemUserDataKey } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildSeededHref,
  readDetailSeed,
} from '@/lib/detail-navigation';
import { useListsQuery } from '@/contexts/lists-context';
import { normalizeRating } from '@/lib/tracker-metadata';
import { findEntryByItemKey } from '@/lib/tracker-selectors';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import { apiQueryKeys } from '@/services/api-query-keys';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TMDB_BACKDROP_SIZE = 'w1280';
const TMDB_POSTER_SIZE = 'w780';

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

interface TmdbCreatedBy {
  id: number;
  name: string;
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
  created_by: TmdbCreatedBy[];
}

type TmdbDetails = TmdbMovieDetails | TmdbTvDetails;

interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  type: string;
  site: string;
}

interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface TmdbRecommendation {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: string;
}

function getTmdbApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_TMDB_API_KEY?.trim();
  return key ? key : null;
}

async function fetchTmdbDetails(
  type: TmdbType,
  id: string,
  signal?: AbortSignal
): Promise<TmdbDetails> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) throw new Error('TMDB API key not configured');

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const response = await fetch(
    `${TMDB_API_BASE}/${endpoint}/${id}?api_key=${encodeURIComponent(apiKey)}&language=en-US`,
    { signal }
  );
  if (!response.ok) throw new Error('Failed to load details');
  return response.json();
}

async function fetchTmdbVideos(
  type: TmdbType,
  id: string,
  signal?: AbortSignal
): Promise<TmdbVideo[]> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return [];

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const response = await fetch(
    `${TMDB_API_BASE}/${endpoint}/${id}/videos?api_key=${encodeURIComponent(apiKey)}&language=en-US`,
    { signal }
  );
  if (!response.ok) return [];

  const json: { results?: TmdbVideo[] } = await response.json();
  return (json.results ?? []).filter(
    (video) =>
      video.site === 'YouTube' &&
      (video.type === 'Trailer' || video.type === 'Teaser') &&
      video.key
  );
}

interface TmdbCreditsResult {
  cast: TmdbCastMember[];
  directors: string[];
}

async function fetchTmdbCredits(
  type: TmdbType,
  id: string,
  signal?: AbortSignal
): Promise<TmdbCreditsResult> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return { cast: [], directors: [] };

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const response = await fetch(
    `${TMDB_API_BASE}/${endpoint}/${id}/credits?api_key=${encodeURIComponent(apiKey)}&language=en-US`,
    { signal }
  );
  if (!response.ok) return { cast: [], directors: [] };

  const json: { cast?: TmdbCastMember[]; crew?: { name: string; job: string }[] } = await response.json();
  const cast = (json.cast ?? [])
    .filter((member) => member.name && member.character)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 20);
  const directors = (json.crew ?? [])
    .filter((c) => c.job === 'Director')
    .map((c) => c.name);
  return { cast, directors };
}

async function fetchTmdbRecommendations(
  type: TmdbType,
  id: string,
  signal?: AbortSignal
): Promise<TmdbRecommendation[]> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return [];

  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const response = await fetch(
    `${TMDB_API_BASE}/${endpoint}/${id}/recommendations?api_key=${encodeURIComponent(apiKey)}&language=en-US`,
    { signal }
  );
  if (!response.ok) return [];

  const json: { results?: TmdbRecommendation[] } = await response.json();
  return (json.results ?? []).slice(0, 10);
}

function isMovie(details: TmdbDetails): details is TmdbMovieDetails {
  return 'title' in details && 'release_date' in details;
}

export default function TvMovieDetailsScreen() {
  const params = useLocalSearchParams<{
    id: string;
    seedImageUrl?: string;
    seedSubtitle?: string;
    seedTitle?: string;
    type: string;
  }>();
  const { type, id } = params;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const seed = readDetailSeed(params);
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');
  const [authorExpanded, setAuthorExpanded] = useState(false);

  const mediaType: TmdbType | null = type === 'movie' || type === 'tv' ? type : null;
  const { activeLists } = useListsQuery();
  const itemKey = mediaType && id ? getItemUserDataKey(mediaType, id) : null;
  const entryLocation = useMemo(
    () => (itemKey ? findEntryByItemKey(activeLists, itemKey) : null),
    [activeLists, itemKey]
  );
  const [detailsQuery, trailersQuery, castQuery, recommendationsQuery] = useQueries({
    queries: [
      {
        queryKey: apiQueryKeys.tmdb.detail(mediaType ?? 'movie', id ?? ''),
        queryFn: ({ signal }) => fetchTmdbDetails(mediaType!, id!, signal),
        enabled: Boolean(id && mediaType),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: apiQueryKeys.tmdb.videos(mediaType ?? 'movie', id ?? ''),
        queryFn: ({ signal }) => fetchTmdbVideos(mediaType!, id!, signal),
        enabled: Boolean(id && mediaType) && activeTab === 'details',
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: apiQueryKeys.tmdb.credits(mediaType ?? 'movie', id ?? ''),
        queryFn: ({ signal }) => fetchTmdbCredits(mediaType!, id!, signal),
        enabled: Boolean(id && mediaType) && activeTab === 'details',
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: apiQueryKeys.tmdb.recommendations(mediaType ?? 'movie', id ?? ''),
        queryFn: ({ signal }) => fetchTmdbRecommendations(mediaType!, id!, signal),
        enabled: Boolean(id && mediaType) && activeTab === 'details',
        staleTime: 1000 * 60 * 10,
      },
    ],
  });
  const details = detailsQuery.data ?? null;
  const trailers = trailersQuery.data ?? [];
  const cast = castQuery.data?.cast ?? [];
  const directors = castQuery.data?.directors ?? [];
  const recommendations = recommendationsQuery.data ?? [];
  const loading = detailsQuery.isPending;
  const error =
    detailsQuery.error instanceof Error &&
    detailsQuery.error.message === 'TMDB API key not configured'
      ? 'TMDB is not configured in this build environment.'
      : detailsQuery.isError
      ? 'Failed to load details'
      : null;

  const backdropPath = details?.backdrop_path;
  const posterPath = details?.poster_path;
  const imageUrl = posterPath
    ? `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${posterPath}`
    : backdropPath
    ? `${TMDB_IMAGE_BASE}/${TMDB_BACKDROP_SIZE}${backdropPath}`
    : seed.imageUrl ?? null;
  const title = details
    ? isMovie(details)
      ? details.title
      : details.name
    : seed.title ?? '';
  const subtitle = details
    ? isMovie(details)
      ? details.original_title
      : details.original_name
    : seed.subtitle ?? null;
  const dateStr = details
    ? isMovie(details)
      ? details.release_date?.slice(0, 4)
      : details.first_air_date?.slice(0, 4)
    : null;
  const metaParts: string[] = [];

  if (mediaType) metaParts.push(mediaType === 'movie' ? 'Movie' : 'TV');
  if (dateStr) metaParts.push(dateStr);
  if (details && isMovie(details) && details.runtime) {
    metaParts.push(`${details.runtime} min`);
  }
  if (details && !isMovie(details)) {
    if (details.number_of_seasons) metaParts.push(`${details.number_of_seasons} season(s)`);
    if (details.number_of_episodes) metaParts.push(`${details.number_of_episodes} ep`);
  }

  const headerTitle = title || (mediaType === 'movie' ? 'Movie' : 'TV');
  const communityRating = normalizeRating(details?.vote_average ?? undefined);
  const authorLine = details
    ? isMovie(details)
      ? directors.join(', ') || null
      : (details.created_by ?? []).map((c) => c.name).join(', ') || null
    : null;
  const progressLine = details
    ? isMovie(details)
      ? [
          details.runtime ? `${details.runtime} min` : null,
          details.release_date ? details.release_date.slice(0, 4) : null,
        ].filter(Boolean).join(' · ') || null
      : [
          details.number_of_seasons ? `${details.number_of_seasons} season${details.number_of_seasons !== 1 ? 's' : ''}` : null,
          details.number_of_episodes ? `${details.number_of_episodes} ep` : null,
          details.first_air_date ? details.first_air_date.slice(0, 4) : null,
        ].filter(Boolean).join(' · ') || null
    : null;

  if (!id || !mediaType) {
    return (
      <>
        <Stack.Screen
          options={{
            title: mediaType === 'movie' ? 'Movie' : 'TV',
            headerShadowVisible: false,
            headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
            headerTransparent: true,
          }}
        />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>Invalid TV/Movie ID</ThemedText>
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
      screenTitle={headerTitle}
    >
          <View style={styles.headerBlock}>
            <ThemedText type="title" style={styles.title}>
              {headerTitle}
            </ThemedText>
            {(authorLine || progressLine || communityRating) ? (
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  {authorLine ? (
                    <Pressable onPress={() => setAuthorExpanded((v) => !v)}>
                      <ThemedText
                        numberOfLines={authorExpanded ? undefined : 1}
                        style={[styles.subtitle, { color: colors.icon }]}
                      >
                        {authorLine}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                  {progressLine ? (
                    <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
                      {progressLine}
                    </ThemedText>
                  ) : null}
                </View>
                {communityRating ? <RatingStars value={communityRating} /> : null}
              </View>
            ) : null}
          </View>
          <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />
          <View style={styles.content}>
            {activeTab === 'details' ? (
              loading ? (
                <View style={styles.sectionState}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : error || !details ? (
                <View style={styles.sectionState}>
                  <ThemedText style={styles.errorText}>{error ?? 'Item not found.'}</ThemedText>
                </View>
              ) : (
                <>
                {details.tagline ? (
                  <ThemedText style={[styles.tagline, { color: colors.icon }]}>
                    {details.tagline}
                  </ThemedText>
                ) : null}

                {details.genres?.length ? (
                  <ExpandableTags tags={details.genres} />
                ) : null}

                {details.overview ? (
                  <ExpandableDescription text={details.overview} />
                ) : null}



                {trailers.length > 0 ? (
                  <View style={styles.trailerSection}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Trailers
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.trailerScroll}
                    >
                      {trailers.map((trailer) => {
                        const thumbnailUri = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`;
                        const youtubeUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
                        return (
                          <Pressable
                            key={trailer.id}
                            onPress={() => Linking.openURL(youtubeUrl)}
                            style={({ pressed }) => [
                              styles.trailerCard,
                              { backgroundColor: colors.tint + '15' },
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <View style={styles.trailerThumbWrap}>
                              <Image
                                source={{ uri: thumbnailUri }}
                                style={styles.trailerThumb}
                                contentFit="cover"
                              />
                              <View style={styles.trailerPlayOverlay}>
                                <IconSymbol
                                  name="play.circle.fill"
                                  size={56}
                                  color="rgba(255,255,255,0.95)"
                                />
                              </View>
                            </View>
                            <ThemedText
                              style={[styles.trailerTitle, { color: colors.text }]}
                              numberOfLines={2}
                            >
                              {trailer.name}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {recommendations.length > 0 ? (
                  <View style={styles.trailerSection}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Related
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.trailerScroll}
                    >
                      {recommendations.map((rec, index) => {
                        const href = `/tv-movie/${rec.media_type}/${rec.id}`;
                        const imageUrl = rec.poster_path ? `${TMDB_IMAGE_BASE}/w185${rec.poster_path}` : null;
                        return (
                          <Link
                            key={`${rec.id}-${index}`}
                            href={buildSeededHref(href, {
                              title: rec.title || rec.name,
                              imageUrl,
                              imageVariant: 'poster',
                            })}
                            asChild
                          >
                            <Link.Trigger>
                              <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                                <Link.AppleZoom>
                                  {imageUrl ? (
                                    <Image source={{ uri: imageUrl }} style={styles.relatedImage} contentFit="cover" />
                                  ) : (
                                    <View style={styles.relatedImagePlaceholder}>
                                      <IconSymbol name="photo" size={24} color={colors.icon} />
                                    </View>
                                  )}
                                </Link.AppleZoom>
                                <View style={styles.relatedContent}>
                                  <ThemedText style={styles.relatedTitle} numberOfLines={2}>
                                    {rec.title || rec.name}
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

                {cast.length > 0 ? (
                  <View style={styles.castSection}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>
                      Cast
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.castScroll}
                    >
                      {cast.map((member, index) => {
                        const profileUri = member.profile_path
                          ? `${TMDB_IMAGE_BASE}/w185${member.profile_path}`
                          : null;
                        return (
                          <Link
                            key={`${member.id}-${member.character}-${index}`}
                            href={buildSeededHref(`/person/tmdb-person/${member.id}`, {
                              title: member.name,
                              subtitle: member.character,
                              imageUrl: profileUri,
                              imageVariant: 'avatar',
                            })}
                            asChild
                          >
                            <Link.Trigger>
                              <Pressable style={StyleSheet.flatten([styles.castCard, { backgroundColor: colors.tint + '15' }])}>
                                <Link.AppleZoom>
                                  <View style={styles.castImageWrap}>
                                    {profileUri ? (
                                      <Image
                                        source={{ uri: profileUri }}
                                        style={styles.castImage}
                                        contentFit="cover"
                                      />
                                    ) : (
                                      <View style={[styles.castImage, styles.castImagePlaceholder]} />
                                    )}
                                  </View>
                                </Link.AppleZoom>
                                <ThemedText
                                  style={[styles.castName, { color: colors.text }]}
                                  numberOfLines={2}
                                >
                                  {member.name}
                                </ThemedText>
                                <ThemedText
                                  style={[styles.castCharacter, { color: colors.icon }]}
                                  numberOfLines={2}
                                >
                                  {member.character}
                                </ThemedText>
                              </Pressable>
                            </Link.Trigger>
                          </Link>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                </>
              )
            ) : itemKey ? (
              <ItemUserDataPanel
                itemKey={itemKey}
                showRating
                progressConfig={{
                  label: mediaType === 'movie' ? 'Watched' : 'Episodes',
                  unit: mediaType === 'movie' ? 'item' : 'episode',
                  total:
                    mediaType === 'movie'
                      ? 1
                      : details && !isMovie(details)
                      ? details.number_of_episodes
                      : undefined,
                }}
                statusConfig={entryLocation ? {
                  entryId: entryLocation.entry.id,
                  listId: entryLocation.list.id,
                  currentStatus: entryLocation.entry.status,
                } : undefined}
              />
            ) : null}
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  metaLeft: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  castSection: {
    marginTop: 24,
  },
  castScroll: {
    paddingBottom: 8,
    paddingRight: 20,
  },
  castCard: {
    width: 100,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  castImageWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginTop: 8,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  castImage: {
    width: '100%',
    height: '100%',
  },
  castImagePlaceholder: {
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  castName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  castCharacter: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  trailerSection: {
    marginTop: 32,
  },
  trailerScroll: {
    paddingBottom: 8,
    paddingRight: 20,
  },
  trailerCard: {
    width: 280,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trailerThumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  trailerThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  trailerPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  trailerTitle: {
    fontSize: 14,
    padding: 12,
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
  sectionState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  relatedCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  relatedImagePlaceholder: {
    width: '100%',
    aspectRatio: 2/3,
    backgroundColor: 'rgba(128,128,128,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  relatedImage: {
    width: '100%',
    aspectRatio: 2/3,
  },
  relatedContent: {
    padding: 8,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
