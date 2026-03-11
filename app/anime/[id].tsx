import { Image } from 'expo-image';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { forwardRef, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ItemDetailTabs,
  type ItemDetailTabId,
} from '@/components/tracker/ItemDetailTabs';
import { BlurredImageBackground } from '@/components/blurred-image-background';
import { ItemUserDataPanel } from '@/components/tracker/ItemUserDataPanel';
import { RatingStars } from '@/components/tracker/RatingStars';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { getItemUserDataKey } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { normalizeRating } from '@/lib/tracker-metadata';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import {
  buildSeededHref,
  isAbortError,
  readDetailSeed,
} from '@/lib/detail-navigation';
import { enqueueJikan } from '@/lib/jikan-queue';

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
  studios?: { mal_id: number; name: string; type: string }[];
  producers?: { mal_id: number; name: string; type: string }[];
  relations?: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[];
}

async function fetchAnimeDetails(id: string, signal?: AbortSignal): Promise<AnimeDetails> {
  const response = await fetch(`${JIKAN_API}/anime/${id}/full`, { signal });
  if (!response.ok) {
    throw new Error('anime_fetch_failed');
  }

  const json: { data: AnimeDetails } = await response.json();
  return json.data;
}

interface JikanCharacterResp {
  character: { mal_id: number; name: string; images: { jpg: { image_url: string } } };
  role: string;
  voice_actors: { person: { mal_id: number; name: string; images: { jpg: { image_url: string } } }; language: string }[];
}

async function fetchAnimeCharacters(id: string, signal?: AbortSignal): Promise<JikanCharacterResp[]> {
  const response = await fetch(`${JIKAN_API}/anime/${id}/characters`, { signal });
  if (!response.ok) return [];
  const json = await response.json();
  return (json.data ?? []).slice(0, 20);
}

const JikanDynamicImage = forwardRef<Image, { type: 'anime' | 'manga' | 'producers', id: number }>(({ type, id }, ref) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    enqueueJikan(async () => {
      const resp = await fetch(`${JIKAN_API}/${type}/${id}`);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.data?.images?.jpg?.image_url;
    })
      .then((url) => mounted && url && setImageUrl(url))
      .catch(() => {});
    return () => { mounted = false; };
  }, [type, id]);

  if (!imageUrl) {
    return (
      <View ref={ref as any} style={styles.relatedImagePlaceholder}>
        <IconSymbol name="photo" size={24} color="#888" />
      </View>
    );
  }
  return <Image ref={ref} source={{ uri: imageUrl }} style={styles.relatedImage} contentFit="cover" />;
});
JikanDynamicImage.displayName = 'JikanDynamicImage';

export default function AnimeDetailsScreen() {
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
  const [anime, setAnime] = useState<AnimeDetails | null>(null);
  const [characters, setCharacters] = useState<JikanCharacterResp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');
  const seed = readDetailSeed(params);

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setAnime(null);
    setCharacters([]);

    fetchAnimeDetails(id, controller.signal)
      .then((animeData) => {
        if (controller.signal.aborted) {
          return;
        }

        setAnime(animeData);
      })
      .catch((caughtError) => {
        if (!isAbortError(caughtError)) {
          setError('Failed to load anime details');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    fetchAnimeCharacters(id, controller.signal)
      .then((charsData) => {
        if (!controller.signal.aborted) {
          setCharacters(charsData);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [id]);

  const imageUrl =
    anime?.images?.jpg?.large_image_url ?? anime?.images?.jpg?.image_url ?? seed.imageUrl;
  const itemKey = id ? getItemUserDataKey('anime', id) : null;
  const communityRating = normalizeRating(anime?.score ?? undefined);
  const meta = [anime?.type, anime?.episodes ? `${anime.episodes} ep` : null, anime?.year, anime?.duration]
    .filter(Boolean)
    .join(' | ');
  const title = anime?.title ?? seed.title ?? 'Anime';
  const subtitle =
    anime && (anime.title_english || anime.title_japanese)
      ? [anime.title_english, anime.title_japanese].filter(Boolean).join(' | ')
      : seed.subtitle;

  if (!id) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Anime',
            headerShadowVisible: false,
            headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
            headerTransparent: true,
          }}
        />
        <BlurredImageBackground imageUrl={seed.imageUrl}>
          <ThemedView style={[styles.centered, { backgroundColor: 'transparent' }]}>
            <ThemedText>Invalid anime ID.</ThemedText>
          </ThemedView>
        </BlurredImageBackground>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerShadowVisible: false,
          headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
          headerTransparent: true,
        }}
      />
      <BlurredImageBackground imageUrl={imageUrl}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => imageUrl && setShowImage(true)} style={styles.heroWrap}>
            <Link.AppleZoomTarget>
              <ThumbnailImage imageUrl={imageUrl} style={styles.hero} />
            </Link.AppleZoomTarget>
          </Pressable>
          <View style={styles.headerBlock}>
            <ThemedText type="title">{title}</ThemedText>
            {subtitle ? <ThemedText style={{ color: colors.icon }}>{subtitle}</ThemedText> : null}
            {meta ? <ThemedText style={{ color: colors.icon }}>{meta}</ThemedText> : null}
            {communityRating ? (
              <View style={styles.ratingRow}>
                <ThemedText style={{ color: colors.icon }}>Community rating</ThemedText>
                <RatingStars value={communityRating} showValue />
              </View>
            ) : null}
          </View>
          <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === 'details' ? (
            loading ? (
              <View style={styles.sectionState}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : error || !anime ? (
              <View style={styles.sectionState}>
                <ThemedText>{error ?? 'Anime not found.'}</ThemedText>
              </View>
            ) : (
              <>
                {anime.genres?.length ? (
                  <ExpandableTags tags={anime.genres.map(g => ({ id: g.mal_id, name: g.name }))} />
                ) : null}
                {anime.synopsis ? (
                  <ExpandableDescription text={anime.synopsis} />
                ) : null}
                {anime.relations?.length ? (
                  <View style={styles.section}>
                    <ThemedText type="subtitle">Related</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                      {anime.relations.flatMap(r => r.entry.map(e => ({ ...e, relation: r.relation }))).map((related, index) => {
                        const href =
                          related.type === 'anime'
                            ? `/anime/${related.mal_id}`
                            : related.type === 'manga'
                            ? `/manga/${related.mal_id}`
                            : null;
                        if (!href) return null;
                        return (
                          <Link
                            key={`${related.type}-${related.mal_id}-${index}`}
                            href={buildSeededHref(href, {
                              title: related.name,
                              subtitle: related.relation,
                            })}
                            asChild
                          >
                            <Link.Trigger>
                              <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                                <Link.AppleZoom>
                                  <JikanDynamicImage type={related.type as any} id={related.mal_id} />
                                </Link.AppleZoom>
                                <View style={styles.relatedContent}>
                                  <ThemedText style={styles.relatedType} numberOfLines={1}>{related.relation}</ThemedText>
                                  <ThemedText style={styles.relatedTitle} numberOfLines={2}>{related.name}</ThemedText>
                                </View>
                              </Pressable>
                            </Link.Trigger>
                          </Link>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                {characters.length > 0 ? (
                  <View style={styles.section}>
                    <ThemedText type="subtitle">Cast</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                      {characters.map((charItem, index) => {
                        const char = charItem.character;
                        const va = charItem.voice_actors?.find(v => v.language === 'Japanese') ?? charItem.voice_actors?.[0];
                        return (
                          <Link
                            key={`char-${char.mal_id}-${index}`}
                            href={buildSeededHref(`/person/jikan-character/${char.mal_id}`, {
                              title: char.name,
                              subtitle: charItem.role,
                              imageUrl: char.images?.jpg?.image_url,
                              imageVariant: 'avatar',
                            })}
                            asChild
                          >
                            <Link.Trigger>
                              <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                                <Link.AppleZoom>
                                  {char.images?.jpg?.image_url ? (
                                    <Image source={{ uri: char.images.jpg.image_url }} style={styles.relatedImage} contentFit="cover" />
                                  ) : (
                                    <View style={styles.relatedImagePlaceholder}>
                                      <IconSymbol name="person.fill" size={24} color={colors.icon} />
                                    </View>
                                  )}
                                </Link.AppleZoom>
                                <View style={styles.relatedContent}>
                                  <ThemedText style={styles.relatedTitle} numberOfLines={1}>{char.name}</ThemedText>
                                  <ThemedText style={styles.relatedType} numberOfLines={1}>{charItem.role}</ThemedText>
                                  {va && (
                                    <ThemedText style={[styles.relatedType, { marginTop: 4 }]} numberOfLines={1}>VA: {va.person.name}</ThemedText>
                                  )}
                                </View>
                              </Pressable>
                            </Link.Trigger>
                          </Link>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                {anime.producers?.length ? (
                  <View style={styles.section}>
                    <ThemedText type="subtitle">Producers</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                      {anime.producers.map((producer) => (
                        <Link
                          key={producer.mal_id}
                          href={buildSeededHref(`/person/jikan-producer/${producer.mal_id}`, {
                            title: producer.name,
                          })}
                          asChild
                        >
                          <Link.Trigger>
                            <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                              <Link.AppleZoom>
                                <JikanDynamicImage type="producers" id={producer.mal_id} />
                              </Link.AppleZoom>
                              <View style={styles.relatedContent}>
                                <ThemedText style={styles.relatedTitle} numberOfLines={2}>{producer.name}</ThemedText>
                              </View>
                            </Pressable>
                          </Link.Trigger>
                        </Link>
                      ))}
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
                label: 'Episodes',
                unit: 'episode',
                total: anime?.episodes ?? undefined,
              }}
            />
          ) : null}
        </ScrollView>
      </BlurredImageBackground>
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
  heroWrap: {
    width: 180,
    height: 270,
    alignSelf: 'center',
  },
  hero: {
    width: 180,
    height: 270,
    borderRadius: 20,
  },
  headerBlock: {
    gap: 6,
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  ratingRow: {
    gap: 8,
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    fontWeight: '600',
    marginRight: 8,
    color: '#888',
  },
  peopleScroll: {
    gap: 8,
  },
  personLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  personText: {
    fontSize: 14,
    fontWeight: '500',
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
  relatedType: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 2,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
