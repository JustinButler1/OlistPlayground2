import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListConfigurationEditor } from '@/components/tracker/ListConfigurationEditor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { createListConfig, DEFAULT_LIST_CONFIG, type ListConfig, type TrackerList } from '@/data/mock-lists';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SortMode = 'updated-desc' | 'title-asc';
type FilterMode = 'all' | 'progress' | 'sublists';
type CreateMode = 'scratch' | 'template';

export default function MyListsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists, listTemplates } = useListsQuery();
  const { createList, createListFromTemplate, deleteList, saveListAsTemplate, updateList } =
    useListActions();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [createMode, setCreateMode] = useState<CreateMode>('scratch');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<ListConfig>(createListConfig(DEFAULT_LIST_CONFIG));
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templatePickerExpanded, setTemplatePickerExpanded] = useState(false);
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

  const selectedTemplate =
    listTemplates.find((template) => template.id === selectedTemplateId) ?? null;

  const resetSheet = useCallback(() => {
    setTitleInput('');
    setDescriptionInput('');
    setCreateMode('scratch');
    setSelectedTemplateId(null);
    setDraftConfig(createListConfig(DEFAULT_LIST_CONFIG));
    setSaveAsTemplate(false);
    setTemplateTitle('');
    setTemplateDescription('');
    setTemplatePickerExpanded(false);
  }, []);

  const openSheet = useCallback(() => {
    resetSheet();
    setSheetVisible(true);
  }, [resetSheet]);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    resetSheet();
  }, [resetSheet]);

  const selectTemplate = useCallback(
    (templateId: string) => {
      const template = listTemplates.find((item) => item.id === templateId);
      if (!template) {
        return;
      }
      setCreateMode('template');
      setSelectedTemplateId(template.id);
      setDraftConfig(createListConfig(template.config));
      setTemplatePickerExpanded(false);
      if (!titleInput.trim()) {
        setTitleInput(template.title);
      }
      if (!descriptionInput.trim()) {
        setDescriptionInput(template.description);
      }
    },
    [descriptionInput, listTemplates, titleInput]
  );

  const confirmCreate = useCallback(() => {
    const trimmedTitle = titleInput.trim();
    if (!trimmedTitle) {
      return;
    }

    const trimmedDescription = descriptionInput.trim() || undefined;
    if (createMode === 'template' && !selectedTemplateId) {
      return;
    }

    const createdListId =
      createMode === 'template' && selectedTemplateId
        ? createListFromTemplate(selectedTemplateId, {
            title: trimmedTitle,
            description: trimmedDescription,
          })
        : createList(trimmedTitle, {
            config: draftConfig,
            description: trimmedDescription,
            templateId: selectedTemplateId ?? undefined,
          });

    if (createdListId && createMode === 'template') {
      updateList(createdListId, {
        config: draftConfig,
      });
    }

    if (createdListId && saveAsTemplate && templateTitle.trim()) {
      saveListAsTemplate(createdListId, {
        title: templateTitle.trim(),
        description: templateDescription.trim() || `${trimmedTitle} setup`,
      });
    }

    closeSheet();
  }, [
    closeSheet,
    createList,
    createListFromTemplate,
    createMode,
    descriptionInput,
    draftConfig,
    saveAsTemplate,
    saveListAsTemplate,
    selectedTemplateId,
    templateDescription,
    templateTitle,
    titleInput,
    updateList,
  ]);

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

      Alert.alert(
        'Delete list?',
        `Delete "${item.title}" and its items? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: runDelete },
        ]
      );
    },
    [deleteList]
  );

  const renderDeleteAction = useCallback(
    (progress: Animated.AnimatedInterpolation<number>, onDelete: () => void, label: string) => {
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
          onPress={openSheet}
          style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Add list"
        >
          <IconSymbol name="plus" size={26} color={colors.tint} />
        </Pressable>
      ),
    });
  }, [colors.tint, navigation, openSheet]);

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
                  renderDeleteAction(progress, () => confirmDeleteList(item), `Delete ${item.title}`)
                }
              >
                <Pressable
                  onPress={() => openListDetail(item)}
                  style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Image
                    source={require('../../assets/images/placeholder-thumbnail.png')}
                    style={styles.resultPoster}
                    contentFit="cover"
                  />
                  <View style={styles.resultInfo}>
                    <ThemedText style={styles.resultTitle} numberOfLines={2}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={[styles.resultMeta, { color: colors.icon }]} numberOfLines={2}>
                      {template ? `${template.title} template` : `${item.config.addons.length} add-ons`}
                      {' · '}
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

      <Modal visible={sheetVisible} animationType="slide" transparent onRequestClose={closeSheet}>
        <Pressable style={styles.modalOverlay} onPress={closeSheet}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 24,
                height: Dimensions.get('window').height * 0.95,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
              <Pressable
                onPress={closeSheet}
                style={({ pressed }) => [
                  styles.sheetHeaderButton,
                  styles.sheetHeaderButtonLeft,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </Pressable>
              <ThemedText type="subtitle" style={styles.sheetTitle}>
                New list
              </ThemedText>
              <Pressable
                onPress={confirmCreate}
                style={({ pressed }) => [
                  styles.sheetHeaderButton,
                  styles.sheetHeaderButtonRight,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <IconSymbol name="checkmark" size={24} color={colors.tint} />
              </Pressable>
            </View>

            <FlatList
              data={[{ key: 'form' }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={styles.sheetBody}>
                  <TextInput
                    style={[
                      styles.titleInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.icon + '18',
                        borderColor: colors.icon + '40',
                      },
                    ]}
                    placeholder="Title"
                    placeholderTextColor={colors.icon}
                    value={titleInput}
                    onChangeText={setTitleInput}
                    autoFocus
                  />
                  <TextInput
                    style={[
                      styles.titleInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.icon + '18',
                        borderColor: colors.icon + '40',
                      },
                    ]}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors.icon}
                    value={descriptionInput}
                    onChangeText={setDescriptionInput}
                  />

                  <View style={styles.modeRow}>
                    <ModeButton
                      label="Scratch"
                      active={createMode === 'scratch'}
                      onPress={() => {
                        setCreateMode('scratch');
                        setSelectedTemplateId(null);
                        setDraftConfig(createListConfig(DEFAULT_LIST_CONFIG));
                        setTemplatePickerExpanded(false);
                      }}
                    />
                    <ModeButton
                      label="Template"
                      active={createMode === 'template'}
                      onPress={() => {
                        setCreateMode('template');
                        setTemplatePickerExpanded((current) => !current || !selectedTemplateId);
                      }}
                    />
                  </View>

                  {createMode === 'template' ? (
                    <View style={styles.templatePickerSection}>
                      <Pressable
                        onPress={() => setTemplatePickerExpanded((current) => !current)}
                        style={[
                          styles.selectionRow,
                          {
                            borderColor: colors.icon + '30',
                            backgroundColor: colors.icon + '10',
                          },
                        ]}
                      >
                        <View style={styles.selectionText}>
                          <ThemedText>Template</ThemedText>
                          <ThemedText style={{ color: colors.icon }}>
                            {selectedTemplate
                              ? `${selectedTemplate.title} (${selectedTemplate.source})`
                              : 'Choose a template'}
                          </ThemedText>
                        </View>
                        <IconSymbol
                          name={templatePickerExpanded ? 'chevron.up' : 'chevron.down'}
                          size={18}
                          color={colors.icon}
                        />
                      </Pressable>

                      {templatePickerExpanded ? (
                        <View
                          style={[
                            styles.templateOptionList,
                            {
                              borderColor: colors.icon + '30',
                              backgroundColor: colors.background,
                            },
                          ]}
                        >
                          {listTemplates.length ? (
                            listTemplates.map((template) => {
                              const selected = selectedTemplateId === template.id;
                              return (
                                <Pressable
                                  key={template.id}
                                  onPress={() => selectTemplate(template.id)}
                                  style={[
                                    styles.templateOptionRow,
                                    {
                                      backgroundColor: selected ? colors.tint + '14' : 'transparent',
                                    },
                                  ]}
                                >
                                  <View style={styles.templateOptionText}>
                                    <ThemedText>{template.title}</ThemedText>
                                    <ThemedText style={{ color: colors.icon }}>
                                      {template.source} template
                                    </ThemedText>
                                  </View>
                                  {selected ? (
                                    <IconSymbol name="checkmark" size={18} color={colors.tint} />
                                  ) : null}
                                </Pressable>
                              );
                            })
                          ) : (
                            <ThemedText style={{ color: colors.icon }}>
                              No templates are available yet.
                            </ThemedText>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <ListConfigurationEditor config={draftConfig} onChange={setDraftConfig} />

                  <View style={styles.saveTemplateRow}>
                    <ThemedText type="defaultSemiBold">Save setup as template</ThemedText>
                    <Pressable
                      onPress={() => setSaveAsTemplate((current) => !current)}
                      style={[
                        styles.toggle,
                        {
                          backgroundColor: saveAsTemplate ? colors.tint : colors.icon + '20',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          saveAsTemplate && styles.toggleThumbActive,
                          { backgroundColor: colors.background },
                        ]}
                      />
                    </Pressable>
                  </View>

                  {saveAsTemplate ? (
                    <View style={styles.templateFields}>
                      <TextInput
                        style={[
                          styles.titleInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.icon + '18',
                            borderColor: colors.icon + '40',
                          },
                        ]}
                        placeholder="Template title"
                        placeholderTextColor={colors.icon}
                        value={templateTitle}
                        onChangeText={setTemplateTitle}
                      />
                      <TextInput
                        style={[
                          styles.titleInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.icon + '18',
                            borderColor: colors.icon + '40',
                          },
                        ]}
                        placeholder="Template description"
                        placeholderTextColor={colors.icon}
                        value={templateDescription}
                        onChangeText={setTemplateDescription}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

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

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeButton,
        {
          backgroundColor: active ? colors.tint : colors.icon + '10',
        },
      ]}
    >
      <ThemedText style={{ color: active ? colors.background : colors.text }}>
        {label}
      </ThemedText>
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
              key={option.value || 'empty-template-option'}
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
    padding: 8,
    marginRight: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  toolbarButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
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
    width: 96,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  deleteAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderButton: {
    padding: 8,
    minWidth: 40,
  },
  sheetHeaderButtonLeft: {
    alignItems: 'flex-start',
  },
  sheetHeaderButtonRight: {
    alignItems: 'flex-end',
  },
  sheetTitle: {
    flex: 1,
    textAlign: 'center',
  },
  sheetBody: {
    gap: 16,
    padding: 20,
  },
  titleInput: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectionRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionText: {
    flex: 1,
    gap: 2,
  },
  templatePickerSection: {
    gap: 10,
  },
  templateOptionList: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    gap: 4,
  },
  templateOptionRow: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  templateOptionText: {
    flex: 1,
    gap: 2,
  },
  saveTemplateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 4,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  templateFields: {
    gap: 10,
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  menuOption: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
