import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { ThumbnailImage } from '@/components/thumbnail-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

/** Encodes Open Library key (e.g. "/works/OL27479W") to a single route segment. */
export function bookKeyToSlug(key: string): string {
  return key.replace(/^\//, '').replace(/\//g, '--');
}

/** Decodes route segment back to Open Library key. */
function slugToBookKey(slug: string): string {
  // Handle raw work ID (e.g. OL34852204W from mock data or legacy links)
  if (/^OL\d+W$/i.test(slug)) {
    return `/works/${slug}`;
  }
  return '/' + slug.replace(/--/g, '/');
}

interface OpenLibraryWork {
  key: string;
  title: string;
  description?: string | { type: string; value: string };
  first_publish_date?: string;
  covers?: number[];
  authors?: { author: { key: string } }[];
}

async function fetchBookDetails(key: string): Promise<OpenLibraryWork> {
  const url = `${OPEN_LIBRARY_BASE}${key}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OlistPlayground (https://github.com)' },
  });
  if (!res.ok) throw new Error('Failed to load book');
  return res.json();
}

async function fetchAuthorName(authorKey: string): Promise<string> {
  try {
    const res = await fetch(`${OPEN_LIBRARY_BASE}${authorKey}.json`, {
      headers: { 'User-Agent': 'OlistPlayground (https://github.com)' },
    });
    if (!res.ok) return authorKey;
    const json: { name?: string } = await res.json();
    return json.name ?? authorKey;
  } catch {
    return authorKey;
  }
}

function getDescriptionText(work: OpenLibraryWork): string | null {
  const d = work.description;
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && 'value' in d) return d.value;
  return null;
}

type DescriptionSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; title: string; workKey: string };

/** Parses Open Library description: extracts [n]: https://openlibrary.org/works/OL... refs and [***Title***][n] links. */
function parseDescriptionWithLinks(description: string): DescriptionSegment[] {
  const refs: Record<string, string> = {};
  const refDefRegex = /\[(\d+)\]:\s*https:\/\/openlibrary\.org\/works\/(OL\d+W)(?:\/[^\s\n]*)?/gi;
  let m;
  while ((m = refDefRegex.exec(description)) !== null) {
    refs[m[1]] = `/works/${m[2]}`;
  }
  let body = description.replace(/\n?\s*\[\d+\]:\s*https:\/\/openlibrary\.org\/works\/[^\s\n]+/gi, '').trim();
  const segments: DescriptionSegment[] = [];
  let lastIndex = 0;
  const inlineRegex = /\[\*+([^*]+)\*+\]\[(\d+)\]/g;
  let match;
  while ((match = inlineRegex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, match.index) });
    }
    const title = match[1].trim();
    const workKey = refs[match[2]];
    if (workKey) {
      segments.push({ type: 'link', title, workKey });
    } else {
      segments.push({ type: 'text', value: match[0] });
    }
    lastIndex = inlineRegex.lastIndex;
  }
  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', value: description }];
}

export default function BookDetailsScreen() {
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [work, setWork] = useState<OpenLibraryWork | null>(null);
  const [authorNames, setAuthorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const key = slugToBookKey(slug);
    setLoading(true);
    setError(null);
    fetchBookDetails(key)
      .then(async (data) => {
        setWork(data);
        if (data.authors?.length) {
          const names = await Promise.all(
            data.authors.map((a) => fetchAuthorName(a.author.key))
          );
          setAuthorNames(names);
        } else {
          setAuthorNames([]);
        }
      })
      .catch(() => setError('Failed to load book details'))
      .finally(() => setLoading(false));
  }, [slug]);

  const coverId = work?.covers?.[0];
  const img = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : null;
  const description = work ? getDescriptionText(work) : null;

  if (!slug) {
    return (
      <>
        <Stack.Screen options={{ title: 'Book' }} />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>Invalid book</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  if (loading || error) {
    return (
      <>
        <Stack.Screen options={{ title: work?.title ?? 'Book' }} />
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
      <Stack.Screen options={{ title: work!.title }} />
      <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => img && setFullScreenImageVisible(true)}
          style={({ pressed }) => [styles.heroImageWrap, pressed && img && { opacity: 0.9 }]}
        >
          <ThumbnailImage
            imageUrl={img ?? undefined}
            style={styles.heroImage}
            contentFit="cover"
          />
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
            {work!.title}
          </ThemedText>

          {(authorNames.length > 0 || work!.first_publish_date) && (
            <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
              {authorNames.length > 0 ? authorNames.join(', ') : ''}
              {authorNames.length > 0 && work!.first_publish_date ? ' · ' : ''}
              {work!.first_publish_date ?? ''}
            </ThemedText>
          )}

          {description ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Description
              </ThemedText>
              <ThemedText style={styles.synopsis}>
                {parseDescriptionWithLinks(description).map((seg, i) =>
                  seg.type === 'text' ? (
                    <ThemedText key={i}>{seg.value}</ThemedText>
                  ) : (
                    <ThemedText
                      key={i}
                      style={[styles.descriptionLink, { color: colors.tint }]}
                      onPress={() =>
                        router.push(`/books/${bookKeyToSlug(seg.workKey)}` as any)
                      }
                    >
                      {seg.title}
                    </ThemedText>
                  )
                )}
              </ThemedText>
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
    aspectRatio: 2 / 3,
    maxHeight: 400,
    alignSelf: 'center',
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
    marginBottom: 16,
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
  descriptionLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
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
