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
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');

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
  const itemKey = id ? getItemUserDataKey('anime', id) : null;
  const communityRating = normalizeRating(anime?.score ?? undefined);
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
            <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'details' ? (
              <>
                <ThemedText type="title">{anime.title}</ThemedText>
                {(anime.title_english || anime.title_japanese) && (
                  <ThemedText style={{ color: colors.icon }}>
                    {[anime.title_english, anime.title_japanese].filter(Boolean).join(' | ')}
                  </ThemedText>
                )}
                {meta ? <ThemedText style={{ color: colors.icon }}>{meta}</ThemedText> : null}
                {communityRating ? (
                  <View style={styles.ratingRow}>
                    <ThemedText style={{ color: colors.icon }}>Community rating</ThemedText>
                    <RatingStars value={communityRating} showValue />
                  </View>
                ) : null}
                {anime.producers?.length ? (
                  <View style={styles.sectionRow}>
                    <ThemedText style={styles.sectionLabel}>Producers:</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleScroll}>
                      {anime.producers.map((producer) => (
                        <Link key={producer.mal_id} href={`/person/jikan-producer/${producer.mal_id}` as any} asChild>
                          <Pressable style={styles.personLink}>
                            <ThemedText style={styles.personText}>{producer.name}</ThemedText>
                          </Pressable>
                        </Link>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
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
                progressConfig={{
                  label: 'Episodes',
                  unit: 'episode',
                  total: anime?.episodes ?? undefined,
                }}
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
