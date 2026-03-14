import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Stack, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Alert, Animated, FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabRootBackground } from '@/components/tab-root-background';
import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { FilterSortControlRow } from '@/components/tracker/filter-sort-control-row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import type { TrackerList } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SortMode = 'updated-desc' | 'title-asc';
type FilterMode = 'all' | 'progress' | 'sublists';
type ViewMode = 'rows' | 'grid';

export default function MyListsScreen() {
  const router = useRouter();
  const isIos = process.env.EXPO_OS === 'ios';
  const supportsLiquidGlass = isIos && isGlassEffectAPIAvailable();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { deleteList } = useListActions();
  const [sortMode, setSortMode] = useState<SortMode>('updated-desc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [menuVisible, setMenuVisible] = useState<null | 'header' | 'sort' | 'filter'>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);

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
    router.push({
      pathname: '/my-lists/new-list',
      params: { sessionId: `${Date.now()}` },
    });
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

  const enterEditMode = useCallback(() => {
    setMenuVisible(null);
    setSelectedListIds([]);
    setIsEditMode(true);
  }, []);

  const exitEditMode = useCallback(() => {
    setMenuVisible(null);
    setSelectedListIds([]);
    setIsEditMode(false);
  }, []);

  const toggleListSelection = useCallback((listId: string) => {
    setSelectedListIds((current) =>
      current.includes(listId)
        ? current.filter((currentId) => currentId !== listId)
        : [...current, listId]
    );
  }, []);

  const confirmDeleteList = useCallback(
    (item: TrackerList) => {
      const runDelete = () => {
        void deleteList(item.id);
      };
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

  const confirmDeleteSelectedLists = useCallback(() => {
    const selectedLists = activeLists.filter((list) => selectedListIds.includes(list.id));
    if (!selectedLists.length) {
      return;
    }

    const runDelete = async () => {
      await Promise.all(selectedLists.map((list) => deleteList(list.id)));
      exitEditMode();
    };

    const title =
      selectedLists.length === 1 ? 'Delete selected list?' : `Delete ${selectedLists.length} lists?`;
    const message =
      selectedLists.length === 1
        ? `Delete "${selectedLists[0]?.title}" and its items? This cannot be undone.`
        : `Delete ${selectedLists.length} selected lists and their items? This cannot be undone.`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void runDelete();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  }, [activeLists, deleteList, exitEditMode, selectedListIds]);

  const renderDeleteAction = useCallback(
    (progress: Animated.AnimatedInterpolation<number>, onDelete: () => void) => {
      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View style={[styles.rightActionContainer, { opacity }]}>
          <SwipeActionButton
            backgroundColor="#C62828"
            icon="trash.fill"
            iconColor="#fff"
            isIos={isIos}
            onPress={onDelete}
          />
        </Animated.View>
      );
    },
    [isIos]
  );

  const selectedSortLabel = sortMode === 'updated-desc' ? 'Recent' : 'A-Z';
  const selectedFilterLabel =
    filterMode === 'all' ? 'All Lists' : filterMode === 'progress' ? 'Progress' : 'Sublists';
  const isGridView = viewMode === 'grid';
  const selectedListIdSet = useMemo(() => new Set(selectedListIds), [selectedListIds]);
  const hasSelectedLists = selectedListIds.length > 0;

  return (
    <TabRootBackground>
      <Stack.Screen
        options={{
          headerLeft:
            isIos || !isEditMode
              ? undefined
              : () => (
                <Pressable
                  accessibilityLabel="Delete selected lists"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !hasSelectedLists }}
                  disabled={!hasSelectedLists}
                  hitSlop={8}
                  onPress={confirmDeleteSelectedLists}
                  style={({ pressed }) => [
                    styles.headerLeftButton,
                    {
                      opacity: !hasSelectedLists ? 0.35 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <ThemedText style={[styles.headerLeftButtonText, { color: '#C62828' }]}>
                    Delete
                  </ThemedText>
                </Pressable>
              ),
          headerRight: isIos
            ? undefined
            : () => (
                <View style={styles.headerRightActions}>
                  <Pressable
                    onPress={openNewListRoute}
                    style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Add list"
                  >
                    <IconSymbol name="plus" size={26} color={colors.tint} />
                  </Pressable>
                  <Pressable
                    onPress={isEditMode ? exitEditMode : () => setMenuVisible('header')}
                    style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={isEditMode ? 'Done editing lists' : 'Open lists menu'}
                  >
                    <IconSymbol
                      name={isEditMode ? 'checkmark' : 'ellipsis'}
                      size={24}
                      color={colors.tint}
                    />
                  </Pressable>
                </View>
              ),
        }}
      />
      {isIos ? (
        <>
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              hidden={!isEditMode}
              disabled={!hasSelectedLists}
              tintColor="#C62828"
              onPress={confirmDeleteSelectedLists}
            >
              Delete
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button icon="plus" onPress={openNewListRoute} />
            <Stack.Toolbar.Menu hidden={isEditMode} icon="ellipsis">
              <Stack.Toolbar.MenuAction
                key="rows-view"
                isOn={viewMode === 'rows'}
                onPress={() => setViewMode('rows')}
              >
                Row view
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                key="grid-view"
                isOn={viewMode === 'grid'}
                onPress={() => setViewMode('grid')}
              >
                Grid view
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction key="edit-lists" onPress={enterEditMode}>
                Edit lists
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Button hidden={!isEditMode} icon="checkmark" onPress={exitEditMode} />
          </Stack.Toolbar>
        </>
      ) : null}
      <FlatList
        key={viewMode}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.container}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={isGridView ? 2 : 1}
        columnWrapperStyle={isGridView ? styles.gridColumn : undefined}
        renderItem={({ item }) => {
          const isSelected = selectedListIdSet.has(item.id);

          if (isGridView) {
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isEditMode ? { selected: isSelected } : undefined}
                onLongPress={isEditMode ? undefined : () => confirmDeleteList(item)}
                onPress={() => (isEditMode ? toggleListSelection(item.id) : openListDetail(item))}
                style={({ pressed }) => [
                  styles.gridCard,
                  isEditMode ? styles.gridCardEditMode : null,
                  {
                    opacity: pressed ? 0.84 : 1,
                    borderColor: isEditMode && isSelected ? colors.tint : 'transparent',
                  },
                ]}
              >
                <GridCardSurface colors={colors} supportsLiquidGlass={supportsLiquidGlass}>
                  {isEditMode ? (
                    <View style={styles.selectionIndicatorFloating}>
                      <SelectionIndicator color={colors.tint} selected={isSelected} />
                    </View>
                  ) : null}
                  <ThumbnailImage imageUrl={item.imageUrl} style={styles.gridPoster} />
                  <View style={styles.gridFooter}>
                    <ThemedText style={styles.gridTitle} numberOfLines={2}>
                      {item.title}
                    </ThemedText>
                    <View style={styles.countChevronGroup}>
                      <ThemedText
                        style={[styles.itemCount, { color: colors.icon }]}
                        numberOfLines={1}
                      >
                        {item.entries.length}
                      </ThemedText>
                      {!isEditMode ? (
                        <IconSymbol name="chevron.right" size={20} color={colors.icon} />
                      ) : null}
                    </View>
                  </View>
                </GridCardSurface>
              </Pressable>
            );
          }

          if (isEditMode) {
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => toggleListSelection(item.id)}
                style={({ pressed }) => [
                  styles.resultRow,
                  styles.resultRowEditMode,
                  {
                    opacity: pressed ? 0.8 : 1,
                    borderColor: isSelected ? colors.tint : colors.icon + '20',
                    backgroundColor: isSelected ? colors.tint + '12' : colors.background + '72',
                  },
                ]}
              >
                <SelectionIndicator color={colors.tint} selected={isSelected} />
                <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultPoster} />
                <View style={styles.resultInfo}>
                  <ThemedText style={styles.resultTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.itemCount, { color: colors.icon }]} numberOfLines={1}>
                  {item.entries.length}
                </ThemedText>
              </Pressable>
            );
          }

          return (
            <Swipeable
              containerStyle={styles.swipeableContainer}
              childrenContainerStyle={styles.swipeableChildren}
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
                <ThumbnailImage imageUrl={item.imageUrl} style={styles.resultPoster} />
                <View style={styles.resultInfo}>
                  <ThemedText style={styles.resultTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                </View>
                <View style={styles.countChevronGroup}>
                  <ThemedText style={[styles.itemCount, { color: colors.icon }]} numberOfLines={1}>
                    {item.entries.length}
                  </ThemedText>
                  <IconSymbol
                    name="chevron.right"
                    size={24}
                    color={colors.icon}
                    style={styles.resultChevron}
                  />
                </View>
              </Pressable>
            </Swipeable>
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <FilterSortControlRow
              alignRight
              colors={colors}
              filterLabel={selectedFilterLabel}
              filterOptions={[
                { value: 'all', label: 'All lists' },
                { value: 'progress', label: 'Lists with progress' },
                { value: 'sublists', label: 'Lists with sublists' },
              ]}
              filterValue={filterMode}
              onFilterChange={(value) => setFilterMode(value as FilterMode)}
              onOpenFilter={() => setMenuVisible('filter')}
              onOpenSort={() => setMenuVisible('sort')}
              sortLabel={selectedSortLabel}
              sortOptions={[
                { value: 'updated-desc', label: 'Recently updated' },
                { value: 'title-asc', label: 'Title A-Z' },
              ]}
              sortValue={sortMode}
              onSortChange={(value) => setSortMode(value as SortMode)}
            />
          </View>
        }
        ListEmptyComponent={
          <ThemedText style={styles.placeholder}>Tap + in the header to create a new list.</ThemedText>
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {!isIos ? (
        <>
          <SelectionMenu
            visible={menuVisible === 'header'}
            title="List actions"
            options={[
              { value: 'rows', label: 'Row view' },
              { value: 'grid', label: 'Grid view' },
              { value: 'edit', label: 'Edit lists' },
            ]}
            selectedValue={viewMode}
            onClose={() => setMenuVisible(null)}
            onSelect={(value) => {
              if (value === 'edit') {
                enterEditMode();
                return;
              }
              setViewMode(value as ViewMode);
              setMenuVisible(null);
            }}
          />

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
        </>
      ) : null}
    </TabRootBackground>
  );
}

function GridCardSurface({
  children,
  colors,
  supportsLiquidGlass,
}: {
  children: ReactNode;
  colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  supportsLiquidGlass: boolean;
}) {
  return (
    <>
      {supportsLiquidGlass ? (
        <GlassView glassEffectStyle="regular" style={styles.gridCardSurfaceFill} />
      ) : (
        <BlurView
          intensity={85}
          tint="systemMaterial"
          style={[
            styles.gridCardSurfaceFill,
            {
              backgroundColor: colors.background + 'B8',
            },
          ]}
        />
      )}
      <View
        pointerEvents="none"
        style={[
          styles.gridCardSurfaceBorder,
          {
            borderColor: colors.icon + '20',
          },
        ]}
      />
      <View style={styles.gridCardContent}>{children}</View>
    </>
  );
}

function SelectionIndicator({
  color,
  selected,
}: {
  color: string;
  selected: boolean;
}) {
  return (
    <View
      style={[
        styles.selectionIndicator,
        {
          borderColor: color,
          backgroundColor: selected ? color : 'transparent',
        },
      ]}
    >
      {selected ? <IconSymbol name="checkmark" size={14} color="#fff" /> : null}
    </View>
  );
}

function SwipeActionButton({
  backgroundColor,
  icon,
  iconColor,
  isIos,
  onPress,
}: {
  backgroundColor: string;
  icon: 'trash.fill';
  iconColor: string;
  isIos: boolean;
  onPress: () => void;
}) {
  const circle = (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.swipeActionPressable, { opacity: pressed ? 0.78 : 1 }]}
    >
      <View style={[styles.swipeActionFill, { backgroundColor }]}>
        <IconSymbol name={icon} size={20} color={iconColor} />
      </View>
    </Pressable>
  );

  if (!isIos) {
    return circle;
  }

  if (isGlassEffectAPIAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive style={styles.swipeActionSurface}>
        {circle}
      </GlassView>
    );
  }

  return (
    <View style={styles.swipeActionSurface}>
      <BlurView intensity={75} tint="systemMaterial" style={styles.swipeActionBlur}>
        {circle}
      </BlurView>
    </View>
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
    backgroundColor: 'transparent',
  },
  headerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeftButton: {
    justifyContent: 'center',
    minHeight: 32,
  },
  headerLeftButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listHeader: {
    paddingBottom: 14,
  },
  placeholder: {
    paddingTop: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
  },
  resultPoster: {
    borderRadius: 6,
    height: 96,
    width: 67,
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultRowEditMode: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  resultChevron: {
    marginLeft: 2,
  },
  countChevronGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  itemCount: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'right',
    lineHeight: 15,
  },
  selectionIndicator: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  gridColumn: {
    gap: 12,
    justifyContent: 'space-between',
  },
  gridCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    marginBottom: 12,
    maxWidth: '48%',
    overflow: 'hidden',
    position: 'relative',
  },
  gridCardEditMode: {
    borderWidth: 2,
  },
  gridCardSurfaceFill: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCardSurfaceBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
  },
  gridCardContent: {
    padding: 10,
  },
  gridPoster: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    width: '100%',
  },
  gridFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 28,
    marginTop: 4,
  },
  selectionIndicatorFloating: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 2,
  },
  gridTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 15,
  },
  swipeableContainer: {
    overflow: 'visible',
  },
  swipeableChildren: {
    overflow: 'visible',
  },
  rightActionContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    width: 72,
  },
  swipeActionSurface: {
    borderRadius: 999,
    height: 54,
    overflow: 'hidden',
    width: 54,
  },
  swipeActionBlur: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  swipeActionPressable: {
    alignItems: 'center',
    borderRadius: 999,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  swipeActionFill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
