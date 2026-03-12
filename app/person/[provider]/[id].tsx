import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiDetailPage } from '@/components/api-detail-page';
import { ExpandableTags } from '@/components/ExpandableTags';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  buildSeededHref,
  readDetailSeed,
} from '@/lib/detail-navigation';
import { apiQueryKeys } from '@/services/api-query-keys';
import {
  fetchBooksByAuthor,
  type GoogleBooksVolume,
} from '@/services/catalog/google-books';

function decodeRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getBookImageUrl(book?: GoogleBooksVolume | null) {
  return (
    book?.volumeInfo.imageLinks?.extraLarge ||
    book?.volumeInfo.imageLinks?.large ||
    book?.volumeInfo.imageLinks?.medium ||
    book?.volumeInfo.imageLinks?.small ||
    book?.volumeInfo.imageLinks?.thumbnail
  )?.replace('http:', 'https:') ?? null;
}

function getPublishedYear(value?: string) {
  const match = value?.match(/\d{4}/);
  return match?.[0] ?? null;
}

function getYearRange(books: GoogleBooksVolume[]) {
  const years = books
    .map((book) => getPublishedYear(book.volumeInfo.publishedDate))
    .filter((value): value is string => Boolean(value))
    .sort();

  if (!years.length) {
    return null;
  }

  return years[0] === years[years.length - 1]
    ? years[0]
    : `${years[0]}-${years[years.length - 1]}`;
}

function getTopCategories(books: GoogleBooksVolume[]) {
  const categoryMap = new Map<string, number>();

  for (const book of books) {
    for (const category of book.volumeInfo.categories ?? []) {
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    }
  }

  return Array.from(categoryMap.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([name], index) => ({ id: index, name }));
}

function PersonPlaceholder() {
  const params = useLocalSearchParams<{
    id: string;
    provider: string;
    seedImageUrl?: string;
    seedImageVariant?: string;
    seedSubtitle?: string;
    seedTitle?: string;
  }>();
  const { provider, id } = params;
  const seed = readDetailSeed(params);
  const title = seed.title ?? 'Details';
  const subtitle = seed.subtitle ?? `Provider: ${provider}`;
  const imageStyle =
    seed.imageVariant === 'avatar'
      ? styles.avatarImage
      : seed.imageVariant === 'logo'
      ? styles.logoImage
      : styles.posterImage;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          {seed.imageUrl ? (
            <Link.AppleZoomTarget>
              <ThumbnailImage imageUrl={seed.imageUrl} style={imageStyle} contentFit="cover" />
            </Link.AppleZoomTarget>
          ) : null}
          <ThemedText type="title" style={styles.placeholderTitle}>{title}</ThemedText>
          <ThemedText style={styles.meta}>{subtitle}</ThemedText>
          <ThemedText style={styles.meta}>ID: {id}</ThemedText>
          <ThemedText style={styles.placeholder}>
            This page is a placeholder under construction. More details will be implemented soon!
          </ThemedText>
        </View>
      </ThemedView>
    </>
  );
}

function BookAuthorDetails() {
  const params = useLocalSearchParams<{
    id: string;
    provider: string;
    seedSubtitle?: string;
    seedTitle?: string;
  }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const seed = readDetailSeed(params);
  const authorName = params.id ? decodeRouteSegment(params.id) : seed.title ?? null;
  const authorQuery = useQuery({
    queryKey: apiQueryKeys.book.authorWorks(authorName ?? ''),
    queryFn: ({ signal }) => fetchBooksByAuthor(authorName!, signal),
    enabled: Boolean(authorName),
    staleTime: 1000 * 60 * 10,
  });

  const books = authorQuery.data ?? [];
  const featuredBook = books.find((book) => getBookImageUrl(book)) ?? books[0] ?? null;
  const backgroundImageUrl = getBookImageUrl(featuredBook);
  const title = authorName ?? seed.title ?? 'Author';
  const yearRange = getYearRange(books);
  const meta = [
    books.length ? `${books.length} books` : null,
    yearRange,
  ]
    .filter(Boolean)
    .join(' | ');
  const tags = getTopCategories(books);
  const loading = authorQuery.isPending;
  const error = authorQuery.isError ? 'Failed to load author details' : null;

  if (!authorName) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Author',
            headerShadowVisible: false,
            headerTintColor: colorScheme === 'dark' ? '#fff' : colors.text,
            headerTransparent: true,
          }}
        />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText style={styles.errorText}>Invalid author</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  return (
    <ApiDetailPage
      backgroundImageUrl={backgroundImageUrl}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      screenTitle={title}
    >
      <View style={styles.authorHeroWrap}>
        <View style={[styles.authorHero, { backgroundColor: colors.tint + '15' }]}>
          <IconSymbol name="person.fill" size={42} color={colors.tint} />
        </View>
      </View>
      <View style={styles.headerBlock}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText style={{ color: colors.icon }}>
          {seed.subtitle ?? 'Author'}
        </ThemedText>
        {meta ? <ThemedText style={{ color: colors.icon }}>{meta}</ThemedText> : null}
      </View>

      {loading ? (
        <View style={styles.sectionState}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={styles.sectionState}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : (
        <>
          {tags.length ? <ExpandableTags tags={tags} /> : null}
          <View style={styles.section}>
            <ThemedText type="subtitle">More By This Author</ThemedText>
            {books.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedScroll}
              >
                {books.map((book) => {
                  const imageUrl = getBookImageUrl(book);
                  const subtitle = [
                    book.volumeInfo.subtitle,
                    getPublishedYear(book.volumeInfo.publishedDate),
                  ]
                    .filter(Boolean)
                    .join(' | ');

                  return (
                    <Link
                      key={book.id}
                      href={buildSeededHref(`/books/${book.id}`, {
                        title: [book.volumeInfo.title, book.volumeInfo.subtitle].filter(Boolean).join(': '),
                        subtitle: book.volumeInfo.publishedDate,
                        imageUrl,
                      })}
                      asChild
                    >
                      <Link.Trigger>
                        <Pressable style={StyleSheet.flatten([styles.relatedCard, { backgroundColor: colors.tint + '15' }])}>
                          <Link.AppleZoom>
                            <ThumbnailImage imageUrl={imageUrl} style={styles.relatedImage} contentFit="cover" />
                          </Link.AppleZoom>
                          <View style={styles.relatedContent}>
                            {subtitle ? (
                              <ThemedText style={styles.relatedType} numberOfLines={1}>{subtitle}</ThemedText>
                            ) : null}
                            <ThemedText style={styles.relatedTitle} numberOfLines={2}>
                              {book.volumeInfo.title}
                            </ThemedText>
                          </View>
                        </Pressable>
                      </Link.Trigger>
                    </Link>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.sectionState}>
                <ThemedText>No books found for this author.</ThemedText>
              </View>
            )}
          </View>
        </>
      )}
    </ApiDetailPage>
  );
}

export default function PersonDetailsScreen() {
  const params = useLocalSearchParams<{
    provider: string;
  }>();

  if (params.provider === 'book-author') {
    return <BookAuthorDetails />;
  }

  return <PersonPlaceholder />;
}

const styles = StyleSheet.create({
  authorHeroWrap: {
    alignItems: 'center',
  },
  authorHero: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
  },
  headerBlock: {
    gap: 6,
  },
  logoImage: {
    width: 220,
    height: 140,
    borderRadius: 20,
  },
  meta: {
    opacity: 0.8,
    textAlign: 'center',
  },
  placeholder: {
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 32,
  },
  placeholderTitle: {
    textAlign: 'center',
  },
  posterImage: {
    width: 180,
    aspectRatio: 2 / 3,
    borderRadius: 20,
  },
  relatedCard: {
    width: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  relatedContent: {
    padding: 8,
  },
  relatedImage: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  relatedScroll: {
    gap: 12,
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  relatedType: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
    marginBottom: 2,
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
});
