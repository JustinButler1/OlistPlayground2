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

interface MangaDetails {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  synopsis?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  score?: number | null;
  type?: string | null;
  published?: {
    string?: string | null;
  };
  images?: {
    jpg?: {
      image_url?: string;
      large_image_url?: string;
    };
  };
  genres?: { mal_id: number; name: string }[];
  authors?: { mal_id: number; name: string }[];
  serializations?: { mal_id: number; name: string }[];
  relations?: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[];
}

async function fetchMangaDetails(id: string, signal?: AbortSignal): Promise<MangaDetails> {
  const response = await fetch(`${JIKAN_API}/manga/${id}/full`, { signal });
  if (!response.ok) {
    throw new Error('manga_fetch_failed');
  }

  const json: { data: MangaDetails } = await response.json();
  return json.data;
}

interface JikanMangaCharacterResp {
  character: { mal_id: number; name: string; images: { jpg: { image_url: string } } };
  role: string;
}

async function fetchMangaCharacters(id: string, signal?: AbortSignal): Promise<JikanMangaCharacterResp[]> {
  const response = await fetch(`${JIKAN_API}/manga/${id}/characters`, { signal });
  if (!response.ok) return [];
  const json = await response.json();
  return (json.data ?? []).slice(0, 20);
}

const JikanDynamicImage = forwardRef<Image, { type: 'anime' | 'manga' | 'authors', id: number }>(({ type, id }, ref) => {
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

export default function MangaDetailsScreen() {
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
  const [manga, setManga] = useState<MangaDetails | null>(null);
  const [characters, setCharacters] = useState<JikanMangaCharacterResp[]>([]);
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
    setManga(null);
    setCharacters([]);

    fetchMangaDetails(id, controller.signal)
      .then((mangaData) => {
        if (controller.signal.aborted) {
          return;
        }

        setManga(mangaData);
      })
      .catch((caughtError) => {
        if (!isAbortError(caughtError)) {
          setError('Failed to load manga details');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    fetchMangaCharacters(id, controller.signal)
      .then((charsData) => {
        if (!controller.signal.aborted) {
          setCharacters(charsData);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [id]);

  const imageUrl =
    manga?.images?.jpg?.large_image_url ?? manga?.images?.jpg?.image_url ?? seed.imageUrl;
  const itemKey = id ? getItemUserDataKey('manga', id) : null;
  const communityRating = normalizeRating(manga?.score ?? undefined);
  const progressConfig =
    typeof manga?.chapters === 'number' && manga.chapters > 0
      ? {
          label: 'Chapters',
          unit: 'chapter' as const,
          total: manga.chapters,
        }
      : typeof manga?.volumes === 'number' && manga.volumes > 0
      ? {
          label: 'Volumes',
          unit: 'volume' as const,
          total: manga.volumes,
        }
      : undefined;
  const meta = [
    manga?.type,
    manga?.volumes ? `${manga.volumes} vol` : null,
    manga?.chapters ? `${manga.chapters} ch` : null,
    manga?.published?.string,
  ]
    .filter(Boolean)
    .join(' | ');
  const title = manga?.title ?? seed.title ?? 'Manga';
  const subtitle =
    manga && (manga.title_english || manga.title_japanese)
      ? [manga.title_english, manga.title_japanese].filter(Boolean).join(' | ')
      : seed.subtitle;

  if (!id) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Manga',
            headerShadowVisible: false,
            headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
            headerTransparent: true,
          }}
        />
        <BlurredImageBackground imageUrl={seed.imageUrl}>
          <ThemedView style={[styles.centered, { backgroundColor: 'transparent' }]}>
            <ThemedText>Invalid manga ID.</ThemedText>
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
            ) : error || !manga ? (
              <View style={styles.sectionState}>
                <ThemedText>{error ?? 'Manga not found.'}</ThemedText>
              </View>
            ) : (
              <>
                {manga.genres?.length ? (
                  <ExpandableTags tags={manga.genres.map(g => ({ id: g.mal_id, name: g.name }))} />
                ) : null}
                {manga.synopsis ? (
                  <ExpandableDescription text={manga.synopsis} />
                ) : null}
                {manga.relations?.length ? (
                  <View style={styles.section}>
                    <ThemedText type="subtitle">Related</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                      {manga.relations.flatMap(r => r.entry.map(e => ({ ...e, relation: r.relation }))).map((related, index) => {
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
                                </View>
                              </Pressable>
                            </Link.Trigger>
                          </Link>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
                {manga.authors?.length ? (
                  <View style={styles.section}>
                    <ThemedText type="subtitle">Authors</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                      {manga.authors.map((author) => (
                        <Link
                          key={author.mal_id}
                          href={buildSeededHref(`/person/jikan-author/${author.mal_id}`, {
                            title: author.name,
                          })}
                          asChild
                        >
                          <Link.Trigger>
                            <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                              <Link.AppleZoom>
                                <JikanDynamicImage type="authors" id={author.mal_id} />
                              </Link.AppleZoom>
                              <View style={styles.relatedContent}>
                                <ThemedText style={styles.relatedTitle} numberOfLines={2}>{author.name}</ThemedText>
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
              progressConfig={progressConfig}
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
