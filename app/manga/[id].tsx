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

import {
  ItemDetailTabs,
  type ItemDetailTabId,
} from '@/components/tracker/ItemDetailTabs';
import { ItemUserDataPanel } from '@/components/tracker/ItemUserDataPanel';
import { RatingStars } from '@/components/tracker/RatingStars';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { getItemUserDataKey } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { normalizeRating } from '@/lib/tracker-metadata';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import { Link } from 'expo-router';

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

async function fetchMangaDetails(id: string): Promise<MangaDetails> {
  const response = await fetch(`${JIKAN_API}/manga/${id}/full`);
  if (!response.ok) {
    throw new Error('manga_fetch_failed');
  }

  const json: { data: MangaDetails } = await response.json();
  return json.data;
}

export default function MangaDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [manga, setManga] = useState<MangaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);
    void fetchMangaDetails(id)
      .then(setManga)
      .catch(() => setError('Failed to load manga details'))
      .finally(() => setLoading(false));
  }, [id]);

  const imageUrl = manga?.images?.jpg?.large_image_url ?? manga?.images?.jpg?.image_url;
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

  if (!id) {
    return (
      <>
        <Stack.Screen options={{ title: 'Manga' }} />
        <ThemedView style={styles.centered}>
          <ThemedText>Invalid manga ID.</ThemedText>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: manga?.title ?? 'Manga' }} />
      <ThemedView style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : error || !manga ? (
          <View style={styles.centered}>
            <ThemedText>{error ?? 'Manga not found.'}</ThemedText>
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
            <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'details' ? (
              <>
                <ThemedText type="title">{manga.title}</ThemedText>
                {(manga.title_english || manga.title_japanese) && (
                  <ThemedText style={{ color: colors.icon }}>
                    {[manga.title_english, manga.title_japanese].filter(Boolean).join(' | ')}
                  </ThemedText>
                )}
                {meta ? <ThemedText style={{ color: colors.icon }}>{meta}</ThemedText> : null}
                {manga.authors?.length ? (
                  <View style={styles.sectionRow}>
                    <ThemedText style={styles.sectionLabel}>Authors:</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleScroll}>
                      {manga.authors.map((author) => (
                        <Link key={author.mal_id} href={`/person/jikan-author/${author.mal_id}` as any} asChild>
                          <Pressable style={styles.personLink}>
                            <ThemedText style={styles.personText}>{author.name}</ThemedText>
                          </Pressable>
                        </Link>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
                {communityRating ? (
                  <View style={styles.ratingRow}>
                    <ThemedText style={{ color: colors.icon }}>Community rating</ThemedText>
                    <RatingStars value={communityRating} showValue />
                  </View>
                ) : null}
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
                        const href = related.type === 'anime' ? `/anime/${related.mal_id}` : related.type === 'manga' ? `/manga/${related.mal_id}` : null;
                        if (!href) return null;
                        return (
                          <Link key={`${related.type}-${related.mal_id}-${index}`} href={href as any} asChild>
                            <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                              <ThemedText style={styles.relatedType} numberOfLines={1}>{related.relation}</ThemedText>
                              <ThemedText style={styles.relatedTitle} numberOfLines={2}>{related.name}</ThemedText>
                            </Pressable>
                          </Link>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : itemKey ? (
              <ItemUserDataPanel
                itemKey={itemKey}
                showRating
                progressConfig={progressConfig}
              />
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
    width: 140,
    padding: 12,
    borderRadius: 12,
  },
  relatedType: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 4,
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
