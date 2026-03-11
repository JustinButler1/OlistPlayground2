import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { getItemUserDataKey } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import { isAbortError, readDetailSeed } from '@/lib/detail-navigation';

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

async function fetchBookDetails(id: string, signal?: AbortSignal): Promise<GoogleBooksWork> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  const url = new URL(`${GOOGLE_BOOKS_BASE}${id}`);
  if (apiKey) {
    url.searchParams.append('key', apiKey);
  }
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error('Failed to load book');
  return res.json();
}

function getDescriptionText(work: GoogleBooksWork): string | null {
  if (!work.volumeInfo.description) return null;
  return work.volumeInfo.description.replace(/<[^>]*>?/gm, '');
}

export default function BookDetailsScreen() {
  const params = useLocalSearchParams<{
    id: string;
    seedImageUrl?: string;
    seedSubtitle?: string;
    seedTitle?: string;
  }>();
  const { id: slug } = params;
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const seed = readDetailSeed(params);

  const [work, setWork] = useState<GoogleBooksWork | null>(null);
  const [authorNames, setAuthorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');

  const workKey = slug ? slugToBookKey(slug) : null;
  const itemKey = workKey ? getItemUserDataKey('book', workKey) : null;

  useEffect(() => {
    if (!workKey) return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setWork(null);
    setAuthorNames([]);

    fetchBookDetails(workKey, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setWork(data);
        setAuthorNames(data.volumeInfo?.authors ?? []);
      })
      .catch((caughtError) => {
        if (!isAbortError(caughtError)) {
          setError('Failed to load book details');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [workKey]);

  const imageLinks = work?.volumeInfo?.imageLinks;
  const imageUrl =
    (imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail)?.replace('http:', 'https:') ||
    seed.imageUrl ||
    null;
  const description = work ? getDescriptionText(work) : null;
  const title = work?.volumeInfo?.title ?? seed.title ?? 'Book';
  const subtitle =
    work?.volumeInfo?.publishedDate ?? seed.subtitle ?? null;

  if (!slug) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Book',
            headerShadowVisible: false,
            headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
            headerTransparent: true,
          }}
        />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>Invalid book</ThemedText>
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
          <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />
          <View style={styles.content}>
            <View style={styles.headerBlock}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>

              {subtitle ? (
                <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
                  {subtitle}
                </ThemedText>
              ) : null}
            </View>
            {activeTab === 'details' ? (
              loading ? (
                <View style={styles.sectionState}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : error || !work ? (
                <View style={styles.sectionState}>
                  <ThemedText style={styles.errorText}>{error ?? 'Book not found.'}</ThemedText>
                </View>
              ) : (
                <>
                {(work.volumeInfo?.publishedDate || work.volumeInfo?.pageCount) && (
                  <View style={styles.metaRow}>
                    {work.volumeInfo?.publishedDate ? (
                      <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
                        {work.volumeInfo.publishedDate}
                      </ThemedText>
                    ) : null}
                    {work.volumeInfo?.pageCount ? (
                      <ThemedText style={[styles.subtitle, { color: colors.icon, marginLeft: work.volumeInfo?.publishedDate ? 8 : 0 }]}>
                        {work.volumeInfo?.publishedDate ? '| ' : ''}{work.volumeInfo.pageCount} pages
                      </ThemedText>
                    ) : null}
                  </View>
                )}

                {work.volumeInfo?.categories?.length ? (
                  <ExpandableTags tags={work.volumeInfo.categories.map((c, i) => ({ id: i, name: c }))} />
                ) : null}

                {description ? (
                  <ExpandableDescription text={description} />
                ) : null}
                
                {authorNames.length > 0 ? (
                  <View style={styles.section}>
                    <ThemedText type="subtitle">Authors</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
                      {authorNames.map((authorName, index) => (
                        <Pressable key={index} style={[styles.relatedCard, { backgroundColor: colors.tint + '15' }]}>
                          <View style={styles.relatedImagePlaceholder}>
                            <IconSymbol name="photo" size={24} color={colors.icon} />
                          </View>
                          <View style={styles.relatedContent}>
                            <ThemedText style={styles.relatedTitle} numberOfLines={2}>{authorName}</ThemedText>
                          </View>
                        </Pressable>
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
                  label: 'Pages',
                  unit: 'item',
                  allowCustomTotal: true,
                }}
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
    gap: 4,
    marginBottom: 16,
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
