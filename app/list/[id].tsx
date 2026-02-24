import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useLists } from '@/contexts/lists-context';
import type { ListEntry, ListEntryType } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ENTRY_TYPE_LABELS: Record<ListEntryType, string> = {
  anime: 'Anime',
  manga: 'Manga',
  movie: 'Movie',
  tv: 'TV',
  book: 'Book',
  game: 'Game',
};

export default function ListDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { lists } = useLists();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const list = id ? lists.find((l) => l.id === id) : null;
  const headerTitle = title ?? list?.title ?? 'List';
  const entries = list?.entries ?? [];

  const openEntry = useCallback(
    (entry: ListEntry) => {
      if (entry.detailPath) {
        router.push({ pathname: `/${entry.detailPath}` as any });
      }
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => (
      <Pressable
        onPress={() => openEntry(item)}
        style={({ pressed }) => [
          styles.resultRow,
          { opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
      >
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : require('../../assets/images/placeholder-thumbnail.png')}
          style={styles.resultPoster}
          contentFit="cover"
        />
        <View style={styles.resultInfo}>
          <ThemedText style={styles.resultTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <View style={[styles.typeChip, { backgroundColor: colors.icon + '25' }]}>
            <ThemedText style={[styles.typeChipText, { color: colors.tint }]}>
              {ENTRY_TYPE_LABELS[item.type]}
            </ThemedText>
          </View>
        </View>
        {item.detailPath ? (
          <IconSymbol
            name="chevron.right"
            size={24}
            color={colors.icon}
            style={styles.resultChevron}
          />
        ) : null}
      </Pressable>
    ),
    [colors.icon, colors.tint, openEntry]
  );

  const keyExtractor = useCallback((item: ListEntry) => item.id, []);

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        {entries.length === 0 ? (
          <ThemedText style={styles.placeholder}>
            This list is empty. Add items from Search.
          </ThemedText>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  resultPoster: {
    width: 56,
    height: 80,
    borderRadius: 6,
  },
  posterPlaceholder: {
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  typeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultChevron: {
    marginLeft: 8,
  },
});
