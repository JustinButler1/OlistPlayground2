import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Animated, FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import type { TrackerList } from '@/data/mock-lists';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SortMode = 'updated-desc' | 'title-asc';
type FilterMode = 'all' | 'progress' | 'sublists';

export default function MyListsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists, listTemplates } = useListsQuery();
  const { deleteList } = useListActions();
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [menuVisible, setMenuVisible] = useState<null | 'sort' | 'filter'>(null);

  const items = useMemo(() => {
    const filtered = activeLists.filter((list) => {
      if (list.archivedAt) {
        return false;
      }
      if (filterMode === 'progress') {
        return list.config.addons.includes('progress');
      }
      if (filterMode === 'sublists') {
        return list.config.addons.includes('sublists');
      }
      return true;
    });

    const nextItems = [...filtered];
    if (sortMode === 'title-asc') {
      nextItems.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      nextItems.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return nextItems;
  }, [activeLists, filterMode, sortMode]);

  const openNewListRoute = useCallback(() => {
    router.push('/my-lists/new-list');
  }, [router]);

  const openListDetail = useCallback(
    (item: TrackerList) => {
      router.push({
        pathname: '/list/[id]',
        params: { id: item.id, title: item.title },
      });
    },
    [router]
  );

  const confirmDeleteList = useCallback(
    (item: TrackerList) => {
      const runDelete = () => deleteList(item.id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
          runDelete();
        }
        return;
      }

      Alert.alert('Delete list?', `Delete "${item.title}" and its items? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ]);
    },
    [deleteList]
  );

  const renderDeleteAction = useCallback(
    (progress: Animated.AnimatedInterpolation<number>, onDelete: () => void) => {
      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.rightActionContainer, { opacity }]}>
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [
              styles.deleteAction,
              { backgroundColor: '#C62828', opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <IconSymbol name="trash" size={18} color="#fff" />
            <ThemedText style={styles.deleteActionText}>Delete</ThemedText>
          </Pressable>
        </Animated.View>
      );
    },
    []
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={openNewListRoute}
          style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Add list"
        >
          <IconSymbol name="plus" size={26} color={colors.tint} />
        </Pressable>
      ),
    });
  }, [colors.tint, navigation, openNewListRoute]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setMenuVisible('sort')}
          style={({ pressed }) => [
            styles.toolbarButton,
            {
              borderColor: colors.icon + '35',
              backgroundColor: colors.background,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText>Sort</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {sortMode === 'updated-desc' ? 'Recent' : 'A-Z'}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setMenuVisible('filter')}
          style={({ pressed }) => [
            styles.toolbarButton,
            {
              borderColor: colors.icon + '35',
              backgroundColor: colors.background,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText>Filter</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {filterMode === 'all'
              ? 'All'
              : filterMode === 'progress'
                ? 'Progress'
                : 'Sublists'}
          </ThemedText>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <ThemedText style={styles.placeholder}>Tap + to create a new list.</ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const template = listTemplates.find((entry) => entry.id === item.templateId) ?? null;
            return (
              <Swipeable
                overshootRight={false}
                rightThreshold={40}
                renderRightActions={(progress) =>
                  renderDeleteAction(progress, () => confirmDeleteList(item))
                }
              >
                <Pressable
                  onPress={() => openListDetail(item)}
                  style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Image
                    source={require('../../../assets/images/placeholder-thumbnail.png')}
                    style={styles.resultPoster}
                    contentFit="cover"
                  />
                  <View style={styles.resultInfo}>
                    <ThemedText style={styles.resultTitle} numberOfLines={2}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={[styles.resultMeta, { color: colors.icon }]} numberOfLines={2}>
                      {template ? `${template.title} template` : `${item.config.addons.length} add-ons`}
                      {' | '}
                      {item.entries.length} item{item.entries.length === 1 ? '' : 's'}
                    </ThemedText>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={24}
                    color={colors.icon}
                    style={styles.resultChevron}
                  />
                </Pressable>
              </Swipeable>
            );
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        />
      )}

      <SelectionMenu
        visible={menuVisible === 'sort'}
        title="Sort lists"
        options={[
          { value: 'updated-desc', label: 'Recently updated' },
          { value: 'title-asc', label: 'Title A-Z' },
        ]}
        selectedValue={sortMode}
        onClose={() => setMenuVisible(null)}
        onSelect={(value) => {
          setSortMode(value as SortMode);
          setMenuVisible(null);
        }}
      />

      <SelectionMenu
        visible={menuVisible === 'filter'}
        title="Filter lists"
        options={[
          { value: 'all', label: 'All lists' },
          { value: 'progress', label: 'Lists with progress' },
          { value: 'sublists', label: 'Lists with sublists' },
        ]}
        selectedValue={filterMode}
        onClose={() => setMenuVisible(null)}
        onSelect={(value) => {
          setFilterMode(value as FilterMode);
          setMenuVisible(null);
        }}
      />
    </ThemedView>
  );
}

function SelectionMenu({
  visible,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.menuCard,
            {
              backgroundColor: colors.background,
              borderColor: colors.icon + '30',
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText type="subtitle">{title}</ThemedText>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.menuOption,
                {
                  opacity: pressed ? 0.75 : 1,
                  backgroundColor:
                    selectedValue === option.value ? colors.tint + '14' : 'transparent',
                },
              ]}
            >
              <ThemedText>{option.label}</ThemedText>
              {selectedValue === option.value ? (
                <IconSymbol name="checkmark" size={18} color={colors.tint} />
              ) : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: 8,
    padding: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  toolbarButton: {
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  placeholder: {
    flex: 1,
    opacity: 0.6,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  resultRow: {
    alignItems: 'center',
    borderBottomColor: 'rgba(128,128,128,0.3)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  resultPoster: {
    borderRadius: 6,
    height: 80,
    width: 56,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 13,
  },
  resultChevron: {
    marginLeft: 8,
  },
  rightActionContainer: {
    alignItems: 'stretch',
    justifyContent: 'center',
    width: 96,
  },
  deleteAction: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  menuOverlay: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  menuOption: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
