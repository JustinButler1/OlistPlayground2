import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { Colors } from '@/constants/theme';
import { useEntryActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExistingListSheetScreen() {
  const { targetListId, query } = useLocalSearchParams<{ targetListId?: string; query?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { addEntryToList } = useEntryActions();
  const [searchText, setSearchText] = useState(query ?? '');
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);

  const currentList = useMemo(
    () => activeLists.find((list) => list.id === targetListId) ?? null,
    [activeLists, targetListId]
  );

  const blockedLinkedListIds = useMemo(() => {
    const blocked = new Set<string>();
    if (!targetListId) {
      return blocked;
    }

    const listById = new Map(activeLists.map((list) => [list.id, list]));
    let pointer: string | undefined = targetListId;
    while (pointer) {
      if (blocked.has(pointer)) {
        break;
      }

      blocked.add(pointer);
      pointer = listById.get(pointer)?.parentListId;
    }

    return blocked;
  }, [activeLists, targetListId]);

  const linkedListIdsInCurrentList = useMemo(
    () =>
      new Set(
        (currentList?.entries ?? [])
          .map((entry) => entry.linkedListId)
          .filter((linkedListId): linkedListId is string => !!linkedListId)
      ),
    [currentList?.entries]
  );

  const availableLists = useMemo(
    () =>
      [...activeLists]
        .filter((list) => {
          if (!targetListId || list.archivedAt) {
            return false;
          }

          if (blockedLinkedListIds.has(list.id)) {
            return false;
          }

          if (linkedListIdsInCurrentList.has(list.id)) {
            return false;
          }

          if (list.parentListId && list.parentListId !== targetListId) {
            return false;
          }

          return true;
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    [activeLists, blockedLinkedListIds, linkedListIdsInCurrentList, targetListId]
  );

  const visibleLists = useMemo(() => {
    const trimmedQuery = searchText.trim().toLowerCase();
    if (!trimmedQuery) {
      return availableLists;
    }

    return availableLists.filter((list) => {
      const haystacks = [list.title, list.description ?? '', ...(list.tags ?? [])];
      return haystacks.some((value) => value.toLowerCase().includes(trimmedQuery));
    });
  }, [availableLists, searchText]);

  const handleSelectList = async (linkedListId: string, title: string) => {
    if (!targetListId || isSubmittingId) {
      return;
    }

    setIsSubmittingId(linkedListId);
    try {
      await addEntryToList(targetListId, {
        title,
        type: 'list',
        detailPath: `list/${linkedListId}`,
        linkedListId,
        sourceRef: { source: 'custom', detailPath: `list/${linkedListId}` },
      });
      router.back();
    } finally {
      setIsSubmittingId(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Existing List' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View
          style={[
            styles.searchCard,
            {
              borderColor: colors.icon + '26',
              backgroundColor: colors.background,
            },
          ]}
        >
          <ThemedText style={[styles.searchLabel, { color: colors.icon }]}>Choose a list</ThemedText>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search your lists"
            placeholderTextColor={colors.icon}
            style={[
              styles.searchInput,
              {
                color: colors.text,
                borderColor: colors.icon + '22',
                backgroundColor: colors.icon + '10',
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {visibleLists.length ? (
          <View style={styles.listGroup}>
            {visibleLists.map((list) => (
              <Pressable
                key={list.id}
                onPress={() => void handleSelectList(list.id, list.title)}
                disabled={!!isSubmittingId}
                style={({ pressed }) => [
                  styles.listCard,
                  {
                    borderColor: colors.icon + '22',
                    backgroundColor: colors.background,
                    opacity: pressed || (isSubmittingId !== null && isSubmittingId !== list.id) ? 0.82 : 1,
                  },
                ]}
              >
                <ThumbnailImage imageUrl={list.imageUrl} style={styles.image} />
                <View style={styles.listText}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {list.title}
                  </ThemedText>
                  {list.description ? (
                    <ThemedText numberOfLines={2} style={{ color: colors.icon }}>
                      {list.description}
                    </ThemedText>
                  ) : (
                    <ThemedText style={{ color: colors.icon }}>
                      {(list.entries?.length ?? 0).toLocaleString()} items
                    </ThemedText>
                  )}
                </View>
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
              {availableLists.length ? 'No lists match that search.' : 'No linkable lists yet.'}
            </ThemedText>
            <ThemedText style={{ color: colors.icon }}>
              {availableLists.length
                ? 'Try a different search term.'
                : 'Create another list first, then link it here.'}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
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
});
