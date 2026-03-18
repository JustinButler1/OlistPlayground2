import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { findEntryByItemKey } from '@/lib/tracker-selectors';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { ExpandableTags } from '@/components/ExpandableTags';
import {
  buildSeededHref,
  readDetailSeed,
} from '@/lib/detail-navigation';
import { apiQueryKeys } from '@/services/api-query-keys';
import {
  fetchGoogleBookDetails,
  type GoogleBooksVolume,
} from '@/services/catalog/google-books';

export function bookKeyToSlug(key: string): string {
  return key;
}

function slugToBookKey(slug: string): string {
  return slug;
}

function getDescriptionText(work: GoogleBooksVolume): string | null {
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
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');
  const [authorExpanded, setAuthorExpanded] = useState(false);

  const workKey = slug ? slugToBookKey(slug) : null;
  const { activeLists } = useListsQuery();
  const itemKey = workKey ? getItemUserDataKey('book', workKey) : null;
  const entryLocation = useMemo(
    () => (itemKey ? findEntryByItemKey(activeLists, itemKey) : null),
    [activeLists, itemKey]
  );
  const workQuery = useQuery({
    queryKey: apiQueryKeys.book.detail(workKey ?? ''),
    queryFn: ({ signal }) => fetchGoogleBookDetails(workKey!, signal),
    enabled: Boolean(workKey),
    staleTime: 1000 * 60 * 10,
  });
  const work = workQuery.data ?? null;
  const authorNames = work?.volumeInfo?.authors ?? [];
  const loading = workQuery.isPending;
  const error = workQuery.isError ? 'Failed to load book details' : null;

  const imageLinks = work?.volumeInfo?.imageLinks;
  const imageUrl =
    (imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail)?.replace('http:', 'https:') ||
    seed.imageUrl ||
    null;
  const description = work ? getDescriptionText(work) : null;
  const title = work?.volumeInfo?.title ?? seed.title ?? 'Book';
  const authorLine = authorNames.length > 0 ? authorNames.join(', ') : (seed.subtitle ?? null);
  const progressLine = [
    work?.volumeInfo?.pageCount ? `${work.volumeInfo.pageCount} pages` : null,
    work?.volumeInfo?.publishedDate ?? null,
  ].filter(Boolean).join(' · ') || null;

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
          <View style={styles.headerBlock}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            {(authorLine || progressLine) ? (
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
              ) : error || !work ? (
                <View style={styles.sectionState}>
                  <ThemedText style={styles.errorText}>{error ?? 'Book not found.'}</ThemedText>
                </View>
              ) : (
                <>
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
                        <Link
                          key={`${authorName}-${index}`}
                          href={buildSeededHref(`/person/book-author/${encodeURIComponent(authorName)}`, {
                            title: authorName,
                            subtitle: 'Author',
                            imageVariant: 'avatar',
                          })}
                          asChild
                        >
                          <Link.Trigger>
                            <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                              <View style={styles.relatedImagePlaceholder}>
                                <IconSymbol name="person.fill" size={24} color={colors.icon} />
                              </View>
                              <View style={styles.relatedContent}>
                                <ThemedText style={styles.relatedTitle} numberOfLines={2}>{authorName}</ThemedText>
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
                  label: 'Pages',
                  unit: 'item',
                  allowCustomTotal: true,
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
  metaLeft: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
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
