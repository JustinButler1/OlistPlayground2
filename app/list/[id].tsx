import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddItemSheet } from '@/components/tracker/AddItemSheet';
import { EntryGridCard } from '@/components/tracker/EntryGridCard';
import { EntryRow } from '@/components/tracker/EntryRow';
import { ManualEntryForm } from '@/components/tracker/ManualEntryForm';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import {
  useEntryActions,
  useListActions,
  useListPreferences,
  useListsQuery,
} from '@/contexts/lists-context';
import type { ListEntry } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getListStats, sortEntries } from '@/lib/tracker-selectors';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { markListOpened, setListPreferences } = useListActions();
  const {
    addEntryToList,
    archiveEntries,
    deleteEntryFromList,
    duplicateEntries,
    moveEntry,
    reorderEntries,
    setEntryStatus,
    updateEntry,
  } = useEntryActions();
  const list = activeLists.find((item) => item.id === id) ?? null;
  const { preferences } = useListPreferences(list?.id ?? '');
  const [isAddItemVisible, setIsAddItemVisible] = useState(false);
  const [selectionModeEnabled, setSelectionModeEnabled] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [editingEntry, setEditingEntry] = useState<ListEntry | null>(null);
  const [moveModalVisible, setMoveModalVisible] = useState(false);

  useEffect(() => {
    if (list?.id) {
      markListOpened(list.id);
    }
  }, [list?.id, markListOpened]);

  const visibleEntries = useMemo(() => {
    if (!list) {
      return [];
    }
    return sortEntries(list.entries, preferences);
  }, [list, preferences]);

  if (!list) {
    return (
      <>
        <Stack.Screen options={{ title: 'List' }} />
        <View style={[styles.centered, { paddingTop: insets.top + 24 }]}>
          <ThemedText>This list no longer exists.</ThemedText>
        </View>
      </>
    );
  }

  const listStats = getListStats(list);
  const isSelectionMode = selectionModeEnabled;

  const toggleSelection = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((idValue) => idValue !== entryId)
        : [...current, entryId]
    );
  };

  const selectedEntries = visibleEntries.filter((entry) => selectedEntryIds.includes(entry.id));

  return (
    <>
      <Stack.Screen options={{ title: list.title }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="title">{list.title}</ThemedText>
            {list.description ? (
              <ThemedText style={{ color: colors.icon }}>{list.description}</ThemedText>
            ) : null}
          </View>
          <Pressable
            onPress={() => setIsAddItemVisible(true)}
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.tint,
              },
            ]}
          >
            <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
              Add item
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <StatCard label="Active" value={listStats.active} />
          <StatCard label="Planned" value={listStats.planned} />
          <StatCard label="Done" value={listStats.completed} />
        </View>

        <View style={styles.toolbar}>
          <ChipGroup
            options={[
              { id: 'list', label: 'List' },
              { id: 'grid', label: 'Grid' },
            ]}
            value={preferences.viewMode}
            onChange={(value) => setListPreferences(list.id, { viewMode: value as 'list' | 'grid' })}
          />
          <ChipGroup
            options={[
              { id: 'updated-desc', label: 'Recent' },
              { id: 'title-asc', label: 'A-Z' },
              { id: 'rating-desc', label: 'Rating' },
              { id: 'status', label: 'Status' },
            ]}
            value={preferences.sortMode}
            onChange={(value) => setListPreferences(list.id, { sortMode: value as typeof preferences.sortMode })}
          />
          <ChipGroup
            options={[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'Completed' },
              { id: 'planned', label: 'Planned' },
            ]}
            value={preferences.filterMode}
            onChange={(value) =>
              setListPreferences(list.id, {
                filterMode: value as typeof preferences.filterMode,
              })
            }
          />
          <Pressable
            onPress={() =>
              setListPreferences(list.id, { showCompleted: !preferences.showCompleted })
            }
            style={[
              styles.secondaryChip,
              {
                backgroundColor: preferences.showCompleted ? colors.tint : colors.icon + '10',
              },
            ]}
          >
            <ThemedText
              style={{
                color: preferences.showCompleted ? colors.background : colors.text,
              }}
            >
              {preferences.showCompleted ? 'Hide done off' : 'Hide done on'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.bulkHeader}>
          <ThemedText type="subtitle">Entries</ThemedText>
          <Pressable
            onPress={() => {
              if (selectionModeEnabled) {
                setSelectionModeEnabled(false);
                setSelectedEntryIds([]);
              } else {
                setSelectionModeEnabled(true);
              }
            }}
            style={[
              styles.secondaryChip,
              {
                backgroundColor: selectionModeEnabled ? colors.tint : colors.icon + '10',
              },
            ]}
          >
            <ThemedText
              style={{
                color: selectionModeEnabled ? colors.background : colors.text,
              }}
            >
              {selectionModeEnabled ? 'Done selecting' : 'Select entries'}
            </ThemedText>
          </Pressable>
        </View>

        {isSelectionMode && selectedEntryIds.length ? (
          <View style={styles.bulkActions}>
            <Pressable
              onPress={() => {
                selectedEntries.forEach((entry) => setEntryStatus(list.id, entry.id, 'completed'));
                setSelectedEntryIds([]);
              }}
              style={[styles.bulkButton, { backgroundColor: colors.tint + '14' }]}
            >
              <ThemedText style={{ color: colors.tint }}>Mark complete</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                duplicateEntries(list.id, selectedEntryIds);
                setSelectedEntryIds([]);
              }}
              style={[styles.bulkButton, { backgroundColor: colors.icon + '10' }]}
            >
              <ThemedText>Duplicate</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setMoveModalVisible(true)}
              style={[styles.bulkButton, { backgroundColor: colors.icon + '10' }]}
            >
              <ThemedText>Move</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                archiveEntries(list.id, selectedEntryIds);
                setSelectedEntryIds([]);
              }}
              style={[styles.bulkButton, { backgroundColor: colors.icon + '10' }]}
            >
              <ThemedText>Archive</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                const orderedIds = [...visibleEntries]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((entry) => entry.id);
                reorderEntries(list.id, orderedIds);
                setSelectedEntryIds([]);
              }}
              style={[styles.bulkButton, { backgroundColor: colors.icon + '10' }]}
            >
              <ThemedText>Reorder A-Z</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {preferences.viewMode === 'grid' ? (
          <View style={styles.grid}>
            {visibleEntries.map((entry) => (
              <View key={entry.id} style={styles.gridItem}>
                <EntryGridCard
                  entry={entry}
                  selected={selectedEntryIds.includes(entry.id)}
                  onPress={() => {
                    if (isSelectionMode) {
                      toggleSelection(entry.id);
                    } else {
                      setEditingEntry(entry);
                    }
                  }}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {visibleEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                selected={selectedEntryIds.includes(entry.id)}
                selectionMode={isSelectionMode}
                onSelectToggle={() => toggleSelection(entry.id)}
                onPress={() => setEditingEntry(entry)}
                subtitle={entry.tags.length ? entry.tags.join(' | ') : undefined}
              />
            ))}
          </View>
        )}

        {!visibleEntries.length ? (
          <ThemedText style={styles.emptyText}>
            This list is empty. Add something manually, search the catalog, or try link import.
          </ThemedText>
        ) : null}
      </ScrollView>

      <AddItemSheet
        visible={isAddItemVisible}
        onClose={() => setIsAddItemVisible(false)}
        listTitle={list.title}
        onAddEntry={(draft) => addEntryToList(list.id, draft)}
      />

      <Modal visible={!!editingEntry} transparent animationType="slide" onRequestClose={() => setEditingEntry(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditingEntry(null)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 24,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Edit entry</ThemedText>
              <Pressable
                onPress={() => {
                  if (editingEntry) {
                    deleteEntryFromList(list.id, editingEntry.id);
                  }
                  setEditingEntry(null);
                }}
              >
                <ThemedText style={{ color: '#cc3f3f' }}>Delete</ThemedText>
              </Pressable>
            </View>
            <ManualEntryForm
              initialEntry={editingEntry}
              submitLabel="Save changes"
              onSubmit={(draft) => {
                if (!editingEntry) {
                  return;
                }
                updateEntry(list.id, editingEntry.id, {
                  title: draft.title,
                  type: draft.type,
                  notes: draft.notes,
                  status: draft.status,
                  tags: draft.tags,
                  rating: draft.rating,
                  progress: draft.progress,
                  reminderAt: draft.reminderAt,
                  coverAssetUri: draft.coverAssetUri,
                  imageUrl: draft.imageUrl ?? editingEntry.imageUrl,
                  detailPath: draft.detailPath ?? editingEntry.detailPath,
                  sourceRef: draft.sourceRef ?? editingEntry.sourceRef,
                  productUrl: draft.productUrl ?? editingEntry.productUrl,
                  price: draft.price ?? editingEntry.price,
                });
                setEditingEntry(null);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={moveModalVisible} transparent animationType="fade" onRequestClose={() => setMoveModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMoveModalVisible(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '20',
              },
            ]}
          >
            <ThemedText type="subtitle">Move to another list</ThemedText>
            <View style={styles.sectionContent}>
              {activeLists
                .filter((item) => item.id !== list.id && !item.archivedAt)
                .map((targetList) => (
                  <Pressable
                    key={targetList.id}
                    onPress={() => {
                      moveEntry(list.id, targetList.id, selectedEntryIds);
                      setSelectionModeEnabled(false);
                      setSelectedEntryIds([]);
                      setMoveModalVisible(false);
                    }}
                    style={[
                      styles.moveRow,
                      {
                        borderColor: colors.icon + '20',
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <ThemedText type="defaultSemiBold">{targetList.title}</ThemedText>
                    <ThemedText style={{ color: colors.tint }}>Move</ThemedText>
                  </Pressable>
                ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.statCard,
        {
          borderColor: colors.icon + '20',
          backgroundColor: colors.background,
        },
      ]}
    >
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
      <ThemedText style={{ color: colors.icon }}>{label}</ThemedText>
    </View>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipGroup}>
      {options.map((option) => (
        <Pressable
          key={option.id}
          onPress={() => onChange(option.id)}
          style={[
            styles.secondaryChip,
            {
              backgroundColor: value === option.id ? colors.tint : colors.icon + '10',
            },
          ]}
        >
          <ThemedText
            style={{
              color: value === option.id ? colors.background : colors.text,
            }}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 14,
  },
  headerText: {
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  toolbar: {
    gap: 10,
  },
  chipGroup: {
    gap: 8,
  },
  secondaryChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bulkActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: {
    gap: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },
  emptyText: {
    opacity: 0.7,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCard: {
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  sectionContent: {
    gap: 10,
  },
  moveRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
