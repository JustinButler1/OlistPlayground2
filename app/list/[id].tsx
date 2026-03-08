import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemSheet } from '@/components/tracker/AddItemSheet';
import { ListConfigurationEditor } from '@/components/tracker/ListConfigurationEditor';
import { RatingStars } from '@/components/tracker/RatingStars';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useEntryActions, useListActions, useListPreferences, useListsQuery } from '@/contexts/lists-context';
import type { ItemUserData, ListEntry, ListFilterMode, ListPreset, ListSortMode, ListViewMode } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEffectiveEntryRating } from '@/lib/tracker-metadata';
import { formatProgressLabel, sortEntries } from '@/lib/tracker-selectors';

const TIER_COLORS = ['#E8A598', '#FFCC80', '#FFF59D', '#AED581', '#81C784', '#4DD0E1', '#64B5F6'];

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists, itemUserDataByKey } = useListsQuery();
  const {
    createList,
    convertSublistToTag,
    convertTagToSublist,
    markListOpened,
    saveListAsTemplate,
    updateList,
  } = useListActions();
  const { addEntryToList, deleteEntryFromList, setEntryStatus } = useEntryActions();
  const list = activeLists.find((item) => item.id === id) ?? null;
  const { preferences, setListPreferences } = useListPreferences(id ?? '');
  const [addItemVisible, setAddItemVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<null | 'view' | 'sort' | 'filter' | 'tag-to-sublist'>(null);
  const [newSublistVisible, setNewSublistVisible] = useState(false);
  const [sublistTitle, setSublistTitle] = useState('');
  const [sublistPreset, setSublistPreset] = useState<ListPreset>('blank');
  const [configVisible, setConfigVisible] = useState(false);
  const [templateVisible, setTemplateVisible] = useState(false);
  const [draftConfig, setDraftConfig] = useState(list?.config);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    if (list?.id) {
      markListOpened(list.id);
    }
  }, [list?.id, markListOpened]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtonsRow}>
          <Pressable
            onPress={() => setAddItemVisible(true)}
            style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="plus" size={24} color={colors.tint} />
          </Pressable>
          <Pressable
            onPress={() => setMenuVisible('view')}
            style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <IconSymbol name="ellipsis.circle" size={24} color={colors.tint} />
          </Pressable>
        </View>
      ),
    });
  }, [colors.tint, navigation]);

  const visibleEntries = useMemo(() => {
    if (!list) {
      return [];
    }
    return sortEntries(list.entries, preferences, itemUserDataByKey);
  }, [itemUserDataByKey, list, preferences]);

  useEffect(() => {
    setDraftConfig(list?.config);
  }, [list?.config]);

  const tierRows = useMemo(
    () =>
      (list?.entries ?? [])
        .filter((entry) => !!entry.linkedListId || entry.detailPath?.startsWith('list/'))
        .map((entry, index) => {
          const sublistId = entry.linkedListId ?? entry.detailPath?.split('/').pop();
          return {
            id: entry.id,
            title: entry.title,
            color: TIER_COLORS[index % TIER_COLORS.length],
            list: activeLists.find((item) => item.id === sublistId) ?? null,
          };
        }),
    [activeLists, list?.entries]
  );

  const tagConversionOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const entry of list?.entries ?? []) {
      for (const tag of entry.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({
        value: tag,
        label: `${tag} (${count})`,
      }));
  }, [list?.entries]);

  const openEntry = (entry: ListEntry) => {
    const pathname = entry.linkedListId
      ? `/list/${entry.linkedListId}`
      : entry.detailPath
      ? `/${entry.detailPath}`
      : `/list-entry/${entry.id}`;
    router.push(pathname as never);
  };

  const confirmDeleteEntry = (entry: ListEntry) => {
    if (!list) {
      return;
    }

    const runDelete = () => deleteEntryFromList(list.id, entry.id);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Delete "${entry.title}"?`)) {
        runDelete();
      }
      return;
    }

    Alert.alert('Delete item?', `Delete "${entry.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);
  };

  const renderDeleteAction = (progress: Animated.AnimatedInterpolation<number>, entry: ListEntry) => {
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.rightActionContainer, { opacity }]}>
        <Pressable
          onPress={() => confirmDeleteEntry(entry)}
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
  };

  if (!list) {
    return (
      <>
        <Stack.Screen options={{ title: 'List' }} />
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <ThemedText>This list no longer exists.</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: list.title }} />
      <ThemedView style={styles.container}>
        <View style={styles.toolbar}>
          <ToolbarButton label="Sort" value={labelForSort(preferences.sortMode)} onPress={() => setMenuVisible('sort')} />
          <ToolbarButton label="Filter" value={labelForFilter(preferences.filterMode)} onPress={() => setMenuVisible('filter')} />
        </View>

        {list.tags.length ? (
          <View style={styles.listTagSection}>
            <ThemedText style={[styles.listTagLabel, { color: colors.icon }]}>List tags</ThemedText>
            <View style={styles.listTagWrap}>
              {list.tags.map((tag) => (
                <View key={tag} style={[styles.listTagChip, { backgroundColor: colors.tint + '16' }]}>
                  <ThemedText style={{ color: colors.tint }}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {preferences.viewMode === 'compare' ? (
          <CompareView entries={visibleEntries} />
        ) : preferences.viewMode === 'tier' ? (
          <TierView tierRows={tierRows} onOpenEntry={openEntry} />
        ) : preferences.viewMode === 'grid' ? (
          <ScrollView contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.grid}>
              {visibleEntries.map((entry) => (
                <Pressable key={entry.id} onPress={() => openEntry(entry)} style={styles.gridCard}>
                  <ThumbnailImage imageUrl={entry.imageUrl} style={styles.gridImage} />
                  <ThemedText style={styles.gridTitle} numberOfLines={2}>{entry.title}</ThemedText>
                  {formatProgressLabel(entry, itemUserDataByKey) ? (
                    <ThemedText style={[styles.gridMeta, { color: colors.icon }]}>
                      {formatProgressLabel(entry, itemUserDataByKey)}
                    </ThemedText>
                  ) : null}
                  {getEffectiveEntryRating(entry, itemUserDataByKey) ? (
                    <RatingStars value={getEffectiveEntryRating(entry, itemUserDataByKey)} size={12} />
                  ) : null}
                </Pressable>
              ))}
            </View>
            {!visibleEntries.length ? <ThemedText style={[styles.placeholder, { color: colors.icon }]}>This list is empty.</ThemedText> : null}
          </ScrollView>
        ) : (
          <FlatList
            data={visibleEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Swipeable overshootRight={false} rightThreshold={40} renderRightActions={(progress) => renderDeleteAction(progress, item)}>
                <View style={[styles.row, { borderBottomColor: colors.icon + '28' }]}>
                  <Pressable
                    onPress={() => setEntryStatus(list.id, item.id, item.status === 'completed' ? 'planned' : 'completed')}
                    style={[
                      styles.checkbox,
                      {
                        borderColor: item.status === 'completed' ? colors.tint : colors.icon + '45',
                        backgroundColor: item.status === 'completed' ? colors.tint : 'transparent',
                      },
                    ]}
                  >
                    {item.status === 'completed' ? <IconSymbol name="checkmark" size={14} color={colors.background} /> : null}
                  </Pressable>
                  <Pressable onPress={() => openEntry(item)} style={styles.rowMain}>
                    <ThumbnailImage imageUrl={item.imageUrl} style={styles.rowImage} />
                    <View style={styles.rowInfo}>
                      <ThemedText style={styles.rowTitle} numberOfLines={2}>{item.title}</ThemedText>
                      <View style={styles.rowMetaWrap}>
                        <ThemedText style={[styles.rowMeta, { color: colors.icon }]} numberOfLines={2}>
                          {buildEntryMeta(item, itemUserDataByKey)}
                        </ThemedText>
                        {getEffectiveEntryRating(item, itemUserDataByKey) ? (
                          <RatingStars value={getEffectiveEntryRating(item, itemUserDataByKey)} size={12} />
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
              </Swipeable>
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            ListEmptyComponent={<ThemedText style={[styles.placeholder, { color: colors.icon }]}>This list is empty.</ThemedText>}
          />
        )}

        <AddItemSheet
          visible={addItemVisible}
          onClose={() => setAddItemVisible(false)}
          onAddEntry={(draft) => {
            if (draft.type === 'list' && draft.linkedListId) {
              updateList(draft.linkedListId, { parentListId: list.id });
            }
            addEntryToList(list.id, draft);
          }}
          listTitle={list.title}
          currentListId={list.id}
          listConfig={list.config}
        />

        <SelectionMenu
          visible={menuVisible === 'view'}
          title="View"
          options={[
            { value: 'list', label: 'List view' },
            { value: 'grid', label: 'Grid view' },
            ...(list.config.addons.includes('compare')
              ? [{ value: 'compare', label: 'Compare view' }]
              : []),
            ...(list.config.addons.includes('tier')
              ? [{ value: 'tier', label: 'Tier view' }]
              : []),
            ...(list.config.addons.includes('sublists')
              ? [{ value: 'sublist', label: 'Create sublist' }]
              : []),
            ...(tagConversionOptions.length
              ? [{ value: 'tag-to-sublist', label: 'Convert tag to sublist' }]
              : []),
            ...(list.parentListId
              ? [{ value: 'sublist-to-tag', label: 'Convert this sublist to tag' }]
              : []),
            { value: 'configure', label: 'Configure list' },
            { value: 'save-template', label: 'Save as template' },
          ]}
          selectedValue={preferences.viewMode}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            if (value === 'sublist') {
              setMenuVisible(null);
              setSublistTitle('');
              setSublistPreset('blank');
              setNewSublistVisible(true);
              return;
            }
            if (value === 'configure') {
              setMenuVisible(null);
              setDraftConfig(list.config);
              setConfigVisible(true);
              return;
            }
            if (value === 'tag-to-sublist') {
              setMenuVisible('tag-to-sublist');
              return;
            }
            if (value === 'sublist-to-tag') {
              const runConversion = () => {
                const convertedTag = convertSublistToTag(list.id);
                if (convertedTag && list.parentListId) {
                  router.replace(`/list/${list.parentListId}` as never);
                }
              };

              setMenuVisible(null);
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (window.confirm(`Convert "${list.title}" into the "${list.title}" tag on its parent list?`)) {
                  runConversion();
                }
                return;
              }

              Alert.alert(
                'Convert sublist to tag?',
                `All items in "${list.title}" will move to the parent list and be tagged "${list.title}".`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Convert', onPress: runConversion },
                ]
              );
              return;
            }
            if (value === 'save-template') {
              setMenuVisible(null);
              setTemplateTitle(`${list.title} Template`);
              setTemplateDescription(list.description ?? '');
              setTemplateVisible(true);
              return;
            }
            setListPreferences({ viewMode: value as ListViewMode });
            setMenuVisible(null);
          }}
        />
        <SelectionMenu
          visible={menuVisible === 'tag-to-sublist'}
          title="Convert tag to sublist"
          options={tagConversionOptions}
          selectedValue=""
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            convertTagToSublist(list.id, value);
            setMenuVisible(null);
          }}
        />
        <SelectionMenu
          visible={menuVisible === 'sort'}
          title="Sort items"
          options={[
            { value: 'updated-desc', label: 'Recently updated' },
            { value: 'title-asc', label: 'Title A-Z' },
            { value: 'rating-desc', label: 'Rating' },
            { value: 'status', label: 'Status' },
          ]}
          selectedValue={preferences.sortMode}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            setListPreferences({ sortMode: value as ListSortMode });
            setMenuVisible(null);
          }}
        />
        <SelectionMenu
          visible={menuVisible === 'filter'}
          title="Filter items"
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'planned', label: 'Planned' },
            { value: 'completed', label: 'Completed' },
            { value: 'paused', label: 'Paused' },
            { value: 'dropped', label: 'Dropped' },
            { value: 'archived', label: 'Archived' },
          ]}
          selectedValue={preferences.filterMode}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            setListPreferences({ filterMode: value as ListFilterMode });
            setMenuVisible(null);
          }}
        />

        <Modal visible={newSublistVisible} transparent animationType="slide" onRequestClose={() => setNewSublistVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setNewSublistVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.5,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setNewSublistVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>New sublist</ThemedText>
                <View style={styles.sheetHeaderButton} />
              </View>
              <View style={styles.sheetBody}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Title"
                  placeholderTextColor={colors.icon}
                  value={sublistTitle}
                  onChangeText={setSublistTitle}
                />
                <View style={styles.sublistPresetRow}>
                  <SublistPresetButton label="Blank" active={sublistPreset === 'blank'} onPress={() => setSublistPreset('blank')} />
                  <SublistPresetButton label="Tracking" active={sublistPreset === 'tracking'} onPress={() => setSublistPreset('tracking')} />
                </View>
                <Pressable
                  onPress={() => {
                    const trimmed = sublistTitle.trim();
                    if (!trimmed) {
                      return;
                    }
                    const sublistId = createList(trimmed, sublistPreset, { parentListId: list.id });
                    if (!sublistId) {
                      return;
                    }
                    addEntryToList(list.id, {
                      title: trimmed,
                      type: 'list',
                      detailPath: `list/${sublistId}`,
                      linkedListId: sublistId,
                      sourceRef: { source: 'custom', detailPath: `list/${sublistId}` },
                    });
                    setNewSublistVisible(false);
                    setSublistTitle('');
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.84 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>Create sublist</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={configVisible} transparent animationType="slide" onRequestClose={() => setConfigVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setConfigVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.9,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setConfigVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>Configure list</ThemedText>
                <Pressable
                  onPress={() => {
                    if (!draftConfig) {
                      return;
                    }
                    updateList(list.id, { config: draftConfig });
                    setConfigVisible(false);
                  }}
                  style={styles.sheetHeaderButton}
                >
                  <IconSymbol name="checkmark" size={24} color={colors.tint} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {draftConfig ? (
                  <ListConfigurationEditor config={draftConfig} onChange={setDraftConfig} />
                ) : null}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={templateVisible} transparent animationType="slide" onRequestClose={() => setTemplateVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setTemplateVisible(false)}>
            <Pressable
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.45,
                },
              ]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
                <Pressable onPress={() => setTemplateVisible(false)} style={styles.sheetHeaderButton}>
                  <IconSymbol name="xmark" size={24} color={colors.text} />
                </Pressable>
                <ThemedText type="subtitle" style={styles.sheetTitle}>Save as template</ThemedText>
                <View style={styles.sheetHeaderButton} />
              </View>
              <View style={styles.sheetBody}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Template title"
                  placeholderTextColor={colors.icon}
                  value={templateTitle}
                  onChangeText={setTemplateTitle}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Template description"
                  placeholderTextColor={colors.icon}
                  value={templateDescription}
                  onChangeText={setTemplateDescription}
                />
                <Pressable
                  onPress={() => {
                    if (!templateTitle.trim()) {
                      return;
                    }
                    saveListAsTemplate(list.id, {
                      title: templateTitle.trim(),
                      description: templateDescription.trim() || `${list.title} setup`,
                    });
                    setTemplateVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: colors.tint, opacity: pressed ? 0.84 : 1 },
                  ]}
                >
                  <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>Save template</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    </>
  );
}

function ToolbarButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolbarButton,
        {
          borderColor: colors.icon + '35',
          backgroundColor: colors.background,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <ThemedText>{label}</ThemedText>
      <ThemedText style={{ color: colors.icon }}>{value}</ThemedText>
    </Pressable>
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
          style={[styles.menuCard, { backgroundColor: colors.background, borderColor: colors.icon + '30' }]}
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
                  backgroundColor: selectedValue === option.value ? colors.tint + '14' : 'transparent',
                },
              ]}
            >
              <ThemedText>{option.label}</ThemedText>
              {selectedValue === option.value ? <IconSymbol name="checkmark" size={18} color={colors.tint} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CompareView({ entries }: { entries: ListEntry[] }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const fieldTitles = Array.from(new Set(entries.flatMap((entry) => (entry.customFields ?? []).map((field) => field.title.trim())))).filter(Boolean);
  if (!entries.length || !fieldTitles.length) {
    return (
      <View style={styles.centered}>
        <ThemedText style={{ color: colors.icon }}>No items with custom fields to compare.</ThemedText>
      </View>
    );
  }
  return (
    <ScrollView horizontal style={styles.compareContainer}>
      <View style={[styles.compareTable, { borderColor: colors.icon + '35' }]}>
        <View style={[styles.compareRow, styles.compareHeaderRow, { borderBottomColor: colors.icon + '35' }]}>
          <View style={[styles.compareCell, styles.compareTitleColumn]}>
            <ThemedText style={styles.compareHeaderText}>Title</ThemedText>
          </View>
          {fieldTitles.map((title) => (
            <View key={title} style={styles.compareCell}>
              <ThemedText style={styles.compareHeaderText}>{title}</ThemedText>
            </View>
          ))}
        </View>
        {entries.map((entry) => (
          <View key={entry.id} style={[styles.compareRow, { borderBottomColor: colors.icon + '25' }]}>
            <View style={[styles.compareCell, styles.compareTitleColumn]}>
              <ThemedText numberOfLines={2}>{entry.title}</ThemedText>
            </View>
            {fieldTitles.map((fieldTitle) => (
              <View key={fieldTitle} style={styles.compareCell}>
                <ThemedText numberOfLines={2}>
                  {entry.customFields?.find((field) => field.title.trim() === fieldTitle)?.value || '—'}
                </ThemedText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function TierView({
  tierRows,
  onOpenEntry,
}: {
  tierRows: { id: string; title: string; color: string; list: { entries: ListEntry[] } | null }[];
  onOpenEntry: (entry: ListEntry) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  if (!tierRows.length) {
    return (
      <View style={styles.centered}>
        <ThemedText style={{ color: colors.icon }}>No sublists to show as tiers. Create one from the view menu.</ThemedText>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.tierContent}>
      {tierRows.map((tier) => (
        <View key={tier.id} style={[styles.tierRow, { borderBottomColor: colors.icon + '25' }]}>
          <View style={[styles.tierLabel, { backgroundColor: tier.color, borderRightColor: colors.icon + '25' }]}>
            <ThemedText style={styles.tierLabelText}>{tier.title}</ThemedText>
          </View>
          <ScrollView horizontal contentContainerStyle={styles.tierItems} showsHorizontalScrollIndicator={false}>
            {(tier.list?.entries ?? []).map((entry) => (
              <Pressable key={entry.id} onPress={() => onOpenEntry(entry)} style={styles.tierItem}>
                <ThumbnailImage imageUrl={entry.imageUrl} style={styles.tierImage} />
                <ThemedText numberOfLines={2} style={styles.tierItemTitle}>{entry.title}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

function SublistPresetButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sublistPresetButton,
        {
          borderColor: colors.icon + '30',
          backgroundColor: active ? colors.tint + '18' : colors.icon + '10',
        },
      ]}
    >
      <ThemedText style={{ color: active ? colors.tint : colors.text }}>{label}</ThemedText>
    </Pressable>
  );
}

function labelForSort(value: ListSortMode) {
  return value === 'updated-desc' ? 'Recent' : value === 'title-asc' ? 'A-Z' : value === 'rating-desc' ? 'Rating' : 'Status';
}

function labelForFilter(value: ListFilterMode) {
  return value === 'all' ? 'All' : value === 'completed' ? 'Completed' : value === 'active' ? 'Active' : value === 'planned' ? 'Planned' : value === 'paused' ? 'Paused' : value === 'dropped' ? 'Dropped' : 'Archived';
}

function buildEntryMeta(
  entry: ListEntry,
  itemUserDataByKey?: Record<string, ItemUserData>
) {
  const parts = [entry.type === 'list' ? 'List' : entry.type, entry.status];
  const progress = formatProgressLabel(entry, itemUserDataByKey);
  if (progress) {
    parts.splice(1, 0, progress);
  }
  if (false && typeof entry.rating === 'number') {
    parts.push(`★ ${entry.rating}`);
  }
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerButtonsRow: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { padding: 6, marginRight: 6 },
  toolbar: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  toolbarButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  listTagSection: { paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  listTagLabel: { fontSize: 13 },
  listTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listTagChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowImage: { width: 56, height: 80, borderRadius: 6 },
  rowInfo: { flex: 1, marginLeft: 14 },
  rowTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  rowMetaWrap: { gap: 6 },
  rowMeta: { fontSize: 13 },
  rightActionContainer: { width: 96, justifyContent: 'center', alignItems: 'stretch' },
  deleteAction: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  gridContent: { paddingHorizontal: 14, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '48%' },
  gridImage: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  gridTitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  gridMeta: { fontSize: 12, marginTop: 3 },
  placeholder: { paddingTop: 24, fontSize: 15 },
  compareContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  compareTable: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 24 },
  compareRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  compareHeaderRow: { borderBottomWidth: 1 },
  compareCell: { minWidth: 140, paddingHorizontal: 14, paddingVertical: 12 },
  compareTitleColumn: { minWidth: 180 },
  compareHeaderText: { fontSize: 14, fontWeight: '700' },
  tierContent: { paddingTop: 8, paddingBottom: 24 },
  tierRow: { flexDirection: 'row', minHeight: 112, borderBottomWidth: StyleSheet.hairlineWidth },
  tierLabel: { width: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRightWidth: StyleSheet.hairlineWidth },
  tierLabelText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  tierItems: { gap: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  tierItem: { width: 72 },
  tierImage: { width: 72, height: 102, borderRadius: 6 },
  tierItemTitle: { fontSize: 12, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 12, 20, 0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetHeaderButton: { minWidth: 44, padding: 8, alignItems: 'center' },
  sheetTitle: { flex: 1, textAlign: 'center' },
  sheetBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  sublistPresetRow: { flexDirection: 'row', gap: 10 },
  sublistPresetButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { fontSize: 16, fontWeight: '700' },
  menuOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.28)' },
  menuCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 10 },
  menuOption: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
