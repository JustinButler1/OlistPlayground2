import { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CatalogSearchPanel } from '@/components/tracker/CatalogSearchPanel';
import { LinkImportPanel } from '@/components/tracker/LinkImportPanel';
import { ManualEntryForm } from '@/components/tracker/ManualEntryForm';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { EntryDraft } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AddItemSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddEntry: (draft: EntryDraft) => void;
  listTitle: string;
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
}: AddItemSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [mode, setMode] = useState<AddMode>('manual');

  const handleAdd = (draft: EntryDraft) => {
    onAddEntry(draft);
    onClose();
    setMode('manual');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.sheet,
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
              <ThemedText style={{ color: colors.icon }}>
                Choose a lightweight tracker flow and keep detail pages secondary.
              </ThemedText>
            </View>
            <Pressable onPress={onClose}>
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

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {mode === 'manual' ? <ManualEntryForm onSubmit={handleAdd} /> : null}
            {mode === 'catalog' ? (
              <CatalogSearchPanel
                onSelectItem={(item) =>
                  handleAdd({
                    title: item.title,
                    type: item.type,
                    imageUrl: item.imageUrl,
                    detailPath: item.detailPath,
                    sourceRef: item.sourceRef,
                    rating: item.rating,
                    progress:
                      item.totalProgress && item.progressUnit
                        ? {
                            current: 0,
                            total: item.totalProgress,
                            unit: item.progressUnit,
                            updatedAt: Date.now(),
                          }
                        : undefined,
                  })
                }
              />
            ) : null}
            {mode === 'link' ? <LinkImportPanel onSubmit={handleAdd} /> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    gap: 4,
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
});
