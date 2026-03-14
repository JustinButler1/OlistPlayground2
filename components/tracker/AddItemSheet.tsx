import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatalogSearchPanel } from '@/components/tracker/CatalogSearchPanel';
import { LinkImportPanel } from '@/components/tracker/LinkImportPanel';
import { ListConfigurationEditor } from '@/components/tracker/ListConfigurationEditor';
import { ManualEntryForm } from '@/components/tracker/ManualEntryForm';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { createListConfig, type ListConfig } from '@/data/mock-lists';
import type { EntryDraft } from '@/contexts/lists-context';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AddItemSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddEntry: (draft: EntryDraft) => Promise<void> | void;
  listTitle: string;
  currentListId?: string;
  listConfig?: ListConfig;
}

type AddMode = 'manual' | 'catalog' | 'link';

const MODES: { id: AddMode; label: string }[] = [
  { id: 'manual', label: 'Manual' },
  { id: 'catalog', label: 'Catalog Search' },
  { id: 'link', label: 'Link Import (Beta)' },
];

export function AddItemSheet({
  visible,
  onClose,
  onAddEntry,
  listTitle,
  currentListId,
  listConfig,
}: AddItemSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { createList } = useListActions();
  const [mode, setMode] = useState<AddMode>('manual');
  const [newSublistVisible, setNewSublistVisible] = useState(false);
  const currentList = useMemo(
    () => activeLists.find((list) => list.id === currentListId) ?? null,
    [activeLists, currentListId]
  );
  const [newSublistTitle, setNewSublistTitle] = useState('');
  const [newSublistDescription, setNewSublistDescription] = useState('');
  const [newSublistConfig, setNewSublistConfig] = useState<ListConfig>(
    createListConfig(listConfig)
  );

  useEffect(() => {
    if (!visible) {
      setMode('manual');
      setNewSublistVisible(false);
      setNewSublistTitle('');
      setNewSublistDescription(currentList?.description ?? '');
      setNewSublistConfig(createListConfig(listConfig));
      return;
    }

    setNewSublistDescription(currentList?.description ?? '');
    setNewSublistConfig(createListConfig(listConfig));
  }, [currentList?.description, listConfig, visible]);

  const closeAllSheets = () => {
    setMode('manual');
    setNewSublistVisible(false);
    onClose();
  };

  const handleAdd = async (draft: EntryDraft) => {
    await onAddEntry(draft);
    closeAllSheets();
  };

  const handleCreateSublist = async () => {
    const trimmedTitle = newSublistTitle.trim();
    if (!trimmedTitle || !currentListId) {
      return;
    }

    const createdListId = await createList(trimmedTitle, {
      preset: currentList?.preset,
      config: newSublistConfig,
      description: newSublistDescription.trim() || undefined,
      templateId: currentList?.templateId,
      tags: currentList?.tags,
      showInMyLists: false,
      parentListId: currentListId,
    });
    if (!createdListId) {
      return;
    }

    await handleAdd({
      title: trimmedTitle,
      type: 'list',
      linkedListId: createdListId,
      detailPath: `list/${createdListId}`,
      sourceRef: {
        source: 'custom',
        detailPath: `list/${createdListId}`,
      },
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={closeAllSheets}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.overlay} onPress={closeAllSheets} />
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
            styles.baseSheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 24,
              height: Dimensions.get('window').height * 0.92,
            },
          ]}
        >
          <View style={[styles.header, { borderColor: colors.icon + '25' }]}>
            <View style={styles.headerText}>
              <ThemedText type="subtitle">Add to {listTitle}</ThemedText>
            </View>
            <Pressable onPress={closeAllSheets}>
              <ThemedText style={{ color: colors.tint }}>Close</ThemedText>
            </Pressable>
          </View>

          <View style={styles.modeRow}>
            {MODES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setMode(item.id)}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: mode === item.id ? colors.tint : colors.icon + '10',
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: mode === item.id ? colors.background : colors.text,
                  }}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {mode === 'catalog' ? (
            <View style={styles.catalogContent}>
              <CatalogSearchPanel
                onSelectItem={(item) =>
                  void handleAdd({
                    title: item.title,
                    type: item.type,
                    imageUrl: item.imageUrl,
                    detailPath: item.detailPath,
                    sourceRef: item.sourceRef,
                    rating: item.rating,
                    progress:
                      item.totalProgress && item.progressUnit
                        ? {
                            current: undefined,
                            total: item.totalProgress,
                            unit: item.progressUnit,
                            updatedAt: Date.now(),
                          }
                        : undefined,
                  })
                }
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {mode === 'manual' ? (
                <ManualEntryForm
                  onSubmit={handleAdd}
                  currentListId={currentListId}
                  listConfig={listConfig}
                  onRequestCreateLinkedList={
                    currentListId
                      ? () => {
                          setNewSublistTitle('');
                          setNewSublistDescription(currentList?.description ?? '');
                          setNewSublistConfig(createListConfig(currentList?.config ?? listConfig));
                          setNewSublistVisible(true);
                        }
                      : undefined
                  }
                />
              ) : null}
              {mode === 'link' ? (
                <LinkImportPanel onSubmit={(draft) => void handleAdd(draft)} />
              ) : null}
            </ScrollView>
          )}
        </Pressable>

        {newSublistVisible ? (
          <View style={styles.stackedLayer} pointerEvents="box-none">
            <Pressable
              style={styles.overlayStacked}
              onPress={() => setNewSublistVisible(false)}
            />
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={[
                styles.sheet,
                styles.baseSheet,
                styles.stackedSheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: insets.bottom + 24,
                  height: Dimensions.get('window').height * 0.88,
                },
              ]}
            >
              <View style={[styles.header, { borderColor: colors.icon + '25' }]}>
                <Pressable onPress={() => setNewSublistVisible(false)} style={styles.navButton}>
                  <IconSymbol name="chevron.left" size={18} color={colors.tint} />
                  <ThemedText style={{ color: colors.tint }}>Back</ThemedText>
                </Pressable>
                <View style={styles.headerTextCentered}>
                  <ThemedText type="subtitle">New sublist</ThemedText>
                  <ThemedText style={{ color: colors.icon }}>
                    Inherits the current list&apos;s template and config.
                  </ThemedText>
                </View>
                <Pressable onPress={() => void handleCreateSublist()} style={styles.navButtonRight}>
                  <ThemedText style={{ color: colors.tint }}>Add</ThemedText>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '28',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Sublist title"
                  placeholderTextColor={colors.icon}
                  value={newSublistTitle}
                  onChangeText={setNewSublistTitle}
                  autoFocus
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
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.icon}
                  value={newSublistDescription}
                  onChangeText={setNewSublistDescription}
                />
                <ListConfigurationEditor config={newSublistConfig} onChange={setNewSublistConfig} />
              </ScrollView>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  overlayStacked: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 20, 0.2)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  baseSheet: {
    width: '100%',
  },
  stackedLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  stackedSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerTextCentered: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  },
  navButton: {
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButtonRight: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  catalogContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
});
