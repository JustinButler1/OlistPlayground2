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

const ADAPTATION_CARD_WIDTH = 110;
const ADAPTATION_IMAGE_ASPECT = 3 / 4;

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const JIKAN_API = 'https://api.jikan.moe/v4';

interface RelationEntry {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

interface MangaRelation {
  relation: string;
  entry: RelationEntry[];
}

interface MangaDetails {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string;
  chapters: number | null;
  volumes: number | null;
  status: string;
  score: number | null;
  scored_by: number | null;
  synopsis: string | null;
  published?: {
    from?: string;
    to?: string | null;
    string?: string;
  };
  images: {
    jpg: { image_url: string; large_image_url: string };
  };
  genres: { mal_id: number; name: string }[];
  authors?: { mal_id: number; name: string; url: string }[];
  url: string;
  relations?: MangaRelation[];
}

async function fetchMangaDetails(id: string): Promise<MangaDetails> {
  const res = await fetch(`${JIKAN_API}/manga/${id}/full`);
  if (!res.ok) throw new Error('Failed to load manga');
  const json = await res.json();
  return json.data;
}

const DIRECT_RELATION_TYPES = [
  'Sequel',
  'Prequel',
  'Alternative version',
  'Side story',
  'Summary',
  'Parent story',
  'Adaptation',
  'Spin-off',
  'Other',
];

export default function MangaDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [manga, setManga] = useState<MangaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [adaptationImages, setAdaptationImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchMangaDetails(id)
      .then(setManga)
      .catch(() => setError('Failed to load manga details'))
      .finally(() => setLoading(false));
  }, [id]);

  const adaptationEntries =
    manga?.relations?.find((r) => r.relation === 'Adaptation')?.entry?.filter(
      (e) => e.type === 'anime' || e.type === 'manga'
    ) ?? [];

  useEffect(() => {
    if (adaptationEntries.length === 0) return;
    let cancelled = false;
    adaptationEntries.forEach((entry) => {
      const k = `${entry.type}-${entry.mal_id}`;
      const endpoint = entry.type === 'anime' ? 'anime' : 'manga';
      fetch(`${JIKAN_API}/${endpoint}/${entry.mal_id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (cancelled || !json?.data?.images?.jpg) return;
          const img =
            json.data.images.jpg.large_image_url ??
            json.data.images.jpg.image_url ??
            json.data.images.jpg.small_image_url;
          if (img) setAdaptationImages((prev) => ({ ...prev, [k]: img }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [
    manga?.mal_id,
    adaptationEntries.map((e) => `${e.type}-${e.mal_id}`).join(','),
  ]);

  const img = manga?.images?.jpg?.large_image_url ?? manga?.images?.jpg?.image_url;

  if (!id) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>Invalid manga ID</ThemedText>
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
            {manga!.title}
          </ThemedText>
          {(manga!.title_english || manga!.title_japanese) && (
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {[manga!.title_english, manga!.title_japanese].filter(Boolean).join(' · ')}
            </ThemedText>
          )}

          <View style={styles.metaRow}>
            {(manga!.type || manga!.volumes != null || manga!.chapters != null || manga!.published?.string) && (
              <ThemedText style={[styles.meta, { color: colors.icon }]}>
                {manga!.type}
                {manga!.volumes != null ? ` · ${manga!.volumes} vol` : ''}
                {manga!.chapters != null ? ` · ${manga!.chapters} ch` : ''}
                {manga!.published?.string ? ` · ${manga!.published.string}` : ''}
              </ThemedText>
            )}
            {manga!.score != null && (
              <ThemedText style={styles.score}>★ {manga!.score}</ThemedText>
            )}
          </View>

          {manga!.authors?.length ? (
            <ThemedText style={[styles.authors, { color: colors.icon }]}>
              {manga!.authors.map((a) => a.name).join(', ')}
            </ThemedText>
          ) : null}

          {manga!.genres?.length > 0 && (
            <View style={styles.genres}>
              {manga!.genres.map((g) => (
                <View key={g.mal_id} style={[styles.genreChip, { backgroundColor: colors.tint + '20' }]}>
                  <ThemedText style={[styles.genreText, { color: colors.tint }]}>{g.name}</ThemedText>
                </View>
              ))}
            </View>
          )}

          {manga!.synopsis ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Synopsis
              </ThemedText>
              <ThemedText style={styles.synopsis}>{manga!.synopsis}</ThemedText>
            </>
          ) : null}

          {manga!.relations && manga.relations.length > 0 ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Related
              </ThemedText>
              {manga.relations
                .filter(
                  (r) =>
                    r.entry?.length > 0 &&
                    DIRECT_RELATION_TYPES.includes(r.relation)
                )
                .map((rel) =>
                  rel.relation === 'Adaptation' ? (
                    <View key={rel.relation} style={styles.relationBlock}>
                      <ThemedText
                        style={[styles.relationLabel, { color: colors.icon }]}
                      >
                        {rel.relation}
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.adaptationScrollContent}
                      >
                        {rel.entry
                          .filter(
                            (e) => e.type === 'anime' || e.type === 'manga'
                          )
                          .map((entry) => {
                            const imgKey = `${entry.type}-${entry.mal_id}`;
                            const imageUri = adaptationImages[imgKey];
                            return (
                              <Pressable
                                key={imgKey}
                                onPress={() =>
                                  router.push(
                                    `/${entry.type}/${entry.mal_id}` as any
                                  )
                                }
                                style={({ pressed }) => [
                                  styles.adaptationCard,
                                  { opacity: pressed ? 0.8 : 1 },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.adaptationCardImageWrap,
                                    {
                                      backgroundColor: colors.tint + '20',
                                    },
                                  ]}
                                >
                                  {imageUri ? (
                                    <Image
                                      source={{ uri: imageUri }}
                                      style={styles.adaptationCardImage}
                                      contentFit="cover"
                                    />
                                  ) : (
                                    <View
                                      style={[
                                        styles.adaptationCardImage,
                                        {
                                          backgroundColor: colors.tint + '15',
                                        },
                                      ]}
                                    />
                                  )}
                                </View>
                                <ThemedText
                                  style={[
                                    styles.adaptationCardTitle,
                                    { color: colors.text },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {entry.name}
                                </ThemedText>
                              </Pressable>
                            );
                          })}
                      </ScrollView>
                    </View>
                  ) : (
                    <View key={rel.relation} style={styles.relationBlock}>
                      <ThemedText
                        style={[styles.relationLabel, { color: colors.icon }]}
                      >
                        {rel.relation}
                      </ThemedText>
                      {rel.entry.map((entry) => {
                        const canNavigate =
                          entry.type === 'anime' || entry.type === 'manga';
                        return (
                          <Pressable
                            key={`${entry.type}-${entry.mal_id}`}
                            onPress={() =>
                              canNavigate &&
                              router.push(
                                `/${entry.type}/${entry.mal_id}` as any
                              )
                            }
                            style={({ pressed }) => [
                              styles.relationEntry,
                              {
                                backgroundColor: colors.tint + '15',
                                opacity: canNavigate && pressed ? 0.7 : 1,
                              },
                            ]}
                            disabled={!canNavigate}
                          >
                            <ThemedText
                              style={[
                                styles.relationEntryTitle,
                                { color: colors.tint },
                              ]}
                              numberOfLines={2}
                            >
                              {entry.name}
                            </ThemedText>
                            {canNavigate && (
                              <IconSymbol
                                name="chevron.right"
                                size={14}
                                color={colors.tint}
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )
                )}
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
  authors: {
    fontSize: 14,
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
  relationBlock: {
    marginTop: 20,
    marginBottom: 8,
  },
  relationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relationEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  relationEntryTitle: {
    fontSize: 15,
    flex: 1,
  },
  adaptationScrollContent: {
    paddingRight: 20,
  },
  adaptationCard: {
    width: ADAPTATION_CARD_WIDTH,
    marginRight: 14,
  },
  adaptationCardImageWrap: {
    width: ADAPTATION_CARD_WIDTH,
    aspectRatio: 1 / ADAPTATION_IMAGE_ASPECT,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  adaptationCardImage: {
    width: '100%',
    height: '100%',
  },
  adaptationCardTitle: {
    fontSize: 12,
    textAlign: 'center',
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
