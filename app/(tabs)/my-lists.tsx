import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import type { ListPreset, TrackerList } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getListStats } from '@/lib/tracker-selectors';

type SortMode = 'recent' | 'title';

export default function MyListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { pinnedLists, recentLists, archivedLists, listTemplates } = useListsQuery();
  const { createList, createListFromTemplate, restoreArchivedList } = useListActions();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [showArchived, setShowArchived] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [preset, setPreset] = useState<ListPreset>('tracking');

  const filteredRecentLists = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const lists = recentLists.filter((list) =>
      normalizedQuery ? list.title.toLowerCase().includes(normalizedQuery) : true
    );

    return [...lists].sort((a, b) =>
      sortMode === 'title' ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt
    );
  }, [recentLists, searchQuery, sortMode]);

  const handleCreate = () => {
    const nextListId = createList(titleInput, preset);
    if (!nextListId) {
      return;
    }
    setTitleInput('');
    setPreset('tracking');
    setShowCreateModal(false);
    router.push(`/list/${nextListId}`);
  };

  return (
    <>
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
          <ThemedText type="title">My Lists</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            Pin the long-term trackers, keep the recent ones searchable, and use templates when you
            need a new structure fast.
          </ThemedText>
        </View>

        <View style={styles.toolbar}>
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.text,
                borderColor: colors.icon + '24',
                backgroundColor: colors.icon + '10',
              },
            ]}
            placeholder="Search lists"
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.toolbarRow}>
            {(['recent', 'title'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setSortMode(option)}
                style={[
                  styles.toolbarChip,
                  {
                    backgroundColor:
                      sortMode === option ? colors.tint : colors.icon + '10',
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: sortMode === option ? colors.background : colors.text,
                  }}
                >
                  {option === 'recent' ? 'Recent' : 'A-Z'}
                </ThemedText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowArchived((value) => !value)}
              style={[
                styles.toolbarChip,
                {
                  backgroundColor: showArchived ? colors.tint : colors.icon + '10',
                },
              ]}
            >
              <ThemedText
                style={{
                  color: showArchived ? colors.background : colors.text,
                }}
              >
                Archived
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => setShowCreateModal(true)}
          style={[
            styles.createCard,
            {
              backgroundColor: colors.tint,
            },
          ]}
        >
          <ThemedText style={[styles.createEyebrow, { color: colors.background }]}>
            New List
          </ThemedText>
          <ThemedText style={[styles.createTitle, { color: colors.background }]}>
            Make list creation obvious
          </ThemedText>
          <ThemedText style={{ color: colors.background }}>
            Start a blank tracker or make a fast import bucket without hiding creation in the
            header.
          </ThemedText>
        </Pressable>

        <Section title="Pinned">
          {pinnedLists.length ? (
            pinnedLists.map((list) => (
              <ListCard key={list.id} list={list} onPress={() => router.push(`/list/${list.id}`)} />
            ))
          ) : (
            <ThemedText style={styles.emptyText}>Pin a list to keep it here.</ThemedText>
          )}
        </Section>

        <Section title="Recent">
          {filteredRecentLists.map((list) => (
            <ListCard key={list.id} list={list} onPress={() => router.push(`/list/${list.id}`)} />
          ))}
        </Section>

        <Section title="Templates">
          {listTemplates.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => {
                const nextListId = createListFromTemplate(template.id);
                if (nextListId) {
                  router.push(`/list/${nextListId}`);
                }
              }}
              style={[
                styles.templateCard,
                {
                  borderColor: colors.icon + '20',
                  backgroundColor: colors.background,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold">{template.title}</ThemedText>
              <ThemedText style={{ color: colors.icon }}>{template.description}</ThemedText>
            </Pressable>
          ))}
        </Section>

        {showArchived ? (
          <Section title="Archived">
            {archivedLists.length ? (
              archivedLists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  actionLabel="Restore"
                  onActionPress={() => restoreArchivedList(list.id)}
                  onPress={() => router.push(`/list/${list.id}`)}
                />
              ))
            ) : (
              <ThemedText style={styles.emptyText}>No archived lists yet.</ThemedText>
            )}
          </Section>
        ) : null}
      </ScrollView>

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateModal(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '18',
              },
            ]}
          >
            <ThemedText type="subtitle">Create a new list</ThemedText>
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  borderColor: colors.icon + '24',
                  backgroundColor: colors.icon + '10',
                },
              ]}
              placeholder="List title"
              placeholderTextColor={colors.icon}
              value={titleInput}
              onChangeText={setTitleInput}
              autoFocus
            />
            <View style={styles.toolbarRow}>
              {(['tracking', 'blank'] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setPreset(option)}
                  style={[
                    styles.toolbarChip,
                    {
                      backgroundColor: preset === option ? colors.tint : colors.icon + '10',
                    },
                  ]}
                >
                  <ThemedText
                    style={{
                      color: preset === option ? colors.background : colors.text,
                    }}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleCreate}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.tint,
                },
              ]}
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
                Create list
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function ListCard({
  list,
  onPress,
  actionLabel,
  onActionPress,
}: {
  list: TrackerList;
  onPress: () => void;
  actionLabel?: string;
  onActionPress?: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const stats = getListStats(list);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listCard,
        {
          borderColor: colors.icon + '20',
          backgroundColor: colors.background,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={styles.listCardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="defaultSemiBold">{list.title}</ThemedText>
          {list.description ? (
            <ThemedText style={{ color: colors.icon }}>{list.description}</ThemedText>
          ) : null}
        </View>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress}>
            <ThemedText style={{ color: colors.tint }}>{actionLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.statRow}>
        <Stat label="Active" value={stats.active} />
        <Stat label="Planned" value={stats.planned} />
        <Stat label="Done" value={stats.completed} />
      </View>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.statCard}>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
      <ThemedText style={{ color: colors.icon }}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 22,
  },
  header: {
    gap: 8,
  },
  toolbar: {
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolbarChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  createCard: {
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  createEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionContent: {
    gap: 10,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  listCardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    gap: 2,
  },
  templateCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  emptyText: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(8, 12, 20, 0.5)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
