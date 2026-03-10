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

import {
  ItemDetailTabs,
  type ItemDetailTabId,
} from '@/components/tracker/ItemDetailTabs';
import { ItemUserDataPanel } from '@/components/tracker/ItemUserDataPanel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { getItemUserDataKey } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import { Link } from 'expo-router';

const GOOGLE_BOOKS_BASE = 'https://www.googleapis.com/books/v1/volumes/';

export function bookKeyToSlug(key: string): string {
  return key;
}

function slugToBookKey(slug: string): string {
  return slug;
}

interface GoogleBooksWork {
  id: string;
  volumeInfo: {
    title: string;
    description?: string;
    publishedDate?: string;
    authors?: string[];
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
  };
}

async function fetchBookDetails(id: string): Promise<GoogleBooksWork> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const url = new URL(`${GOOGLE_BOOKS_BASE}${id}`);
  if (apiKey) {
    url.searchParams.append('key', apiKey);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load book');
  return res.json();
}

function getDescriptionText(work: GoogleBooksWork): string | null {
  if (!work.volumeInfo.description) return null;
  return work.volumeInfo.description.replace(/<[^>]*>?/gm, '');
}

type DescriptionSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; title: string; workKey: string };

function parseDescriptionWithLinks(description: string): DescriptionSegment[] {
  return [{ type: 'text', value: description }];
}

export default function BookDetailsScreen() {
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [work, setWork] = useState<GoogleBooksWork | null>(null);
  const [authorNames, setAuthorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');

  const workKey = slug ? slugToBookKey(slug) : null;
  const itemKey = workKey ? getItemUserDataKey('book', workKey) : null;

  useEffect(() => {
    if (!workKey) return;

    setLoading(true);
    setError(null);
    fetchBookDetails(workKey)
      .then((data) => {
        setWork(data);
        setAuthorNames(data.volumeInfo?.authors ?? []);
      })
      .catch(() => setError('Failed to load book details'))
      .finally(() => setLoading(false));
  }, [workKey]);

  const imageLinks = work?.volumeInfo?.imageLinks;
  const imageUrl = (imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail)?.replace('http:', 'https:') || null;
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
        <Stack.Screen options={{ title: work?.volumeInfo?.title ?? 'Book' }} />
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
      <Stack.Screen options={{ title: work?.volumeInfo?.title ?? 'Book' }} />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => imageUrl && setFullScreenImageVisible(true)}
            style={({ pressed }) => [styles.heroImageWrap, pressed && imageUrl && { opacity: 0.9 }]}
          >
            <ThumbnailImage
              imageUrl={imageUrl ?? undefined}
              style={styles.heroImage}
              contentFit="cover"
            />
          </Pressable>
          <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />

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
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.fullScreenImage}
                    contentFit="contain"
                  />
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
            {activeTab === 'details' ? (
              <>
                <ThemedText type="title" style={styles.title}>
                  {work?.volumeInfo?.title}
                </ThemedText>

                {(authorNames.length > 0 || work?.volumeInfo?.publishedDate) && (
                  <View style={styles.metaRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleScroll}>
                      {authorNames.map((authorName, index) => (
                        <Link key={index} href={`/person/google-books-author/${encodeURIComponent(authorName)}` as any} asChild>
                          <Pressable style={styles.personLink}>
                            <ThemedText style={styles.subtitle}>{authorName}</ThemedText>
                          </Pressable>
                        </Link>
                      ))}
                    </ScrollView>
                    {work?.volumeInfo?.publishedDate ? (
                      <ThemedText style={[styles.subtitle, { color: colors.icon, marginLeft: 8 }]}>
                        | {work.volumeInfo.publishedDate}
                      </ThemedText>
                    ) : null}
                    {work?.volumeInfo?.pageCount ? (
                      <ThemedText style={[styles.subtitle, { color: colors.icon, marginLeft: 8 }]}>
                        | {work.volumeInfo.pageCount} pages
                      </ThemedText>
                    ) : null}
                  </View>
                )}

                {work?.volumeInfo?.categories?.length ? (
                  <ExpandableTags tags={work.volumeInfo.categories.map((c, i) => ({ id: i, name: c }))} />
                ) : null}

                {description ? (
                  <ExpandableDescription text={description} />
                ) : null}
              </>
            ) : itemKey ? (
              <ItemUserDataPanel
                itemKey={itemKey}
                showRating
                progressConfig={{
                  label: 'Pages',
                  unit: 'item',
                  allowCustomTotal: true,
                }}
              />
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  peopleScroll: {
    gap: 8,
  },
  personLink: {
  },
});
