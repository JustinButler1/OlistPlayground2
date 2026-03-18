import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useEntryActions, useListActions, useListsQuery } from '@/contexts/lists-context';
import type { TrackerList } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

function listReferencesTarget(
  lists: TrackerList[],
  listId: string,
  targetListId: string | undefined
): boolean {
  if (!targetListId) {
    return false;
  }

  const parentById = new Map(lists.map((list) => [list.id, list.parentListId]));
  let pointer: string | undefined = targetListId;
  while (pointer) {
    if (pointer === listId) {
      return true;
    }
    pointer = parentById.get(pointer);
  }

  return false;
}

export default function MoveToSheetScreen() {
  const {
    browseListId,
    entryId,
    itemTitle,
    listId,
    mode,
    sourceListId,
  } = useLocalSearchParams<{
    browseListId?: string;
    entryId?: string;
    itemTitle?: string;
    listId?: string;
    mode?: 'entry' | 'list';
    sourceListId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { moveEntry } = useEntryActions();
  const { moveList } = useListActions();
  const [searchText, setSearchText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentList = useMemo(
    () => (browseListId ? activeLists.find((list) => list.id === browseListId) ?? null : null),
    [activeLists, browseListId]
  );

  const movingList = useMemo(
    () => (mode === 'list' && listId ? activeLists.find((list) => list.id === listId) ?? null : null),
    [activeLists, listId, mode]
  );

  const availableLists = useMemo(() => {
    const baseLists = browseListId
      ? activeLists.filter((list) => list.parentListId === browseListId && !list.archivedAt)
      : activeLists.filter((list) => list.showInMyLists && !list.archivedAt);

    return [...baseLists].sort((a, b) => a.title.localeCompare(b.title));
  }, [activeLists, browseListId]);

  const visibleLists = useMemo(() => {
    const normalizedQuery = searchText.trim().toLowerCase();
    if (!normalizedQuery) {
      return availableLists;
    }

    return availableLists.filter((list) =>
      [list.title, list.description ?? '', ...list.tags].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [availableLists, searchText]);

  const selectionState = useMemo(() => {
    if (!currentList) {
      return {
        canSelect: false,
        helperText: 'Open a list or sublist to choose it.',
      };
    }

    if (mode === 'entry') {
      if (!entryId || !sourceListId || currentList.id === sourceListId) {
        return {
          canSelect: false,
          helperText: 'Choose a different list than the current one.',
        };
      }

      return {
        canSelect: true,
        helperText: `Move "${itemTitle ?? 'item'}" here.`,
      };
    }

    if (!listId || !movingList) {
      return {
        canSelect: false,
        helperText: 'This list is no longer available.',
      };
    }

    if (currentList.id === listId) {
      return {
        canSelect: false,
        helperText: 'A list cannot be moved into itself.',
      };
    }

    if (movingList.parentListId === currentList.id) {
      return {
        canSelect: false,
        helperText: `"${movingList.title}" is already inside this list.`,
      };
    }

    if (listReferencesTarget(activeLists, listId, currentList.id)) {
      return {
        canSelect: false,
        helperText: 'A list cannot be moved into one of its descendants.',
      };
    }

    return {
      canSelect: true,
      helperText: `Move "${movingList.title}" here.`,
    };
  }, [activeLists, currentList, entryId, itemTitle, listId, mode, movingList, sourceListId]);

  const handleOpenList = (nextListId: string) => {
    router.push({
      pathname: '/move-to-sheet',
      params: {
        browseListId: nextListId,
        entryId,
        itemTitle,
        listId,
        mode,
        sourceListId,
      },
    });
  };

  const handleSelectCurrentList = async () => {
    if (!currentList || !selectionState.canSelect || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'entry' && sourceListId && entryId) {
        await moveEntry(sourceListId, currentList.id, [entryId]);
      } else if (mode === 'list' && listId) {
        await moveList(listId, currentList.id);
      }

      router.dismissAll();
    } finally {
      setIsSubmitting(false);
    }
  };

  const pathItems = useMemo(() => {
    if (!currentList) {
      return [] as TrackerList[];
    }

    const listById = new Map(activeLists.map((list) => [list.id, list]));
    const segments: TrackerList[] = [];
    let pointer: TrackerList | null = currentList;
    while (pointer) {
      segments.unshift(pointer);
      pointer = pointer.parentListId ? listById.get(pointer.parentListId) ?? null : null;
    }
    return segments;
  }, [activeLists, currentList]);

  return (
    <>
      <Stack.Screen options={{ title: currentList?.title ?? 'Move to' }} />
      <View style={styles.container}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + 120,
            },
          ]}
        >
          <View
            style={[
              styles.searchCard,
              {
                borderColor: colors.icon + '24',
                backgroundColor: colors.background,
              },
            ]}
          >
            <ThemedText style={[styles.searchLabel, { color: colors.icon }]}>
              {browseListId ? 'Browse sublists' : 'Browse your lists'}
            </ThemedText>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchText}
              placeholder={browseListId ? 'Search this level' : 'Search your lists'}
              placeholderTextColor={colors.icon}
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  borderColor: colors.icon + '22',
                  backgroundColor: colors.icon + '10',
                },
              ]}
              value={searchText}
            />
            {pathItems.length ? (
              <View style={styles.pathRow}>
                {pathItems.map((item, index) => (
                  <ThemedText key={item.id} style={[styles.pathText, { color: colors.icon }]}>
                    {index > 0 ? ' / ' : ''}
                    {item.title}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </View>

          {currentList ? (
            <View
              style={[
                styles.currentListCard,
                {
                  borderColor: colors.icon + '22',
                  backgroundColor: colors.background,
                },
              ]}
            >
              <ThumbnailImage imageUrl={currentList.imageUrl} style={styles.currentListImage} />
              <View style={styles.currentListText}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {currentList.title}
                </ThemedText>
                <ThemedText numberOfLines={2} style={{ color: colors.icon }}>
                  {selectionState.helperText}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {visibleLists.length ? (
            <View style={styles.listGroup}>
              {visibleLists.map((list) => (
                <Pressable
                  key={list.id}
                  accessibilityRole="button"
                  onPress={() => handleOpenList(list.id)}
                  style={({ pressed }) => [
                    styles.listCard,
                    {
                      borderColor: colors.icon + '22',
                      backgroundColor: colors.background,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <ThumbnailImage imageUrl={list.imageUrl} style={styles.image} />
                  <View style={styles.listText}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {list.title}
                    </ThemedText>
                    <ThemedText numberOfLines={2} style={{ color: colors.icon }}>
                      {list.childListIds.length
                        ? `${list.childListIds.length} sublists`
                        : `${list.entries.length.toLocaleString()} items`}
                    </ThemedText>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color={colors.icon} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                {
                  borderColor: colors.icon + '22',
                  backgroundColor: colors.background,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold">
                {availableLists.length ? 'No lists match that search.' : 'No deeper lists here yet.'}
              </ThemedText>
              <ThemedText style={{ color: colors.icon }}>
                {availableLists.length
                  ? 'Try a different search term.'
                  : 'Select this list or go back and choose another branch.'}
              </ThemedText>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.icon + '16',
              backgroundColor: colors.background + 'F4',
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            disabled={!selectionState.canSelect || isSubmitting}
            onPress={() => void handleSelectCurrentList()}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
                opacity:
                  !selectionState.canSelect || isSubmitting ? 0.45 : pressed ? 0.84 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
              Select list
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  searchCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  searchLabel: {
    fontSize: 13,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  pathRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pathText: {
    fontSize: 12,
  },
  currentListCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentListImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  currentListText: {
    flex: 1,
    gap: 4,
  },
  listGroup: {
    gap: 12,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  listText: {
    flex: 1,
    gap: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    gap: 6,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
