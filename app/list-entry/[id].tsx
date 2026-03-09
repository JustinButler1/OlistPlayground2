import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemDetailTabs, type ItemDetailTabId } from '@/components/tracker/ItemDetailTabs';
import { ItemUserDataPanel } from '@/components/tracker/ItemUserDataPanel';
import { ManualEntryForm } from '@/components/tracker/ManualEntryForm';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEntryActions, useListsQuery } from '@/contexts/lists-context';
import type { EntryDraft } from '@/contexts/lists-context';
import type { EntryProgressUnit, ListEntry } from '@/data/mock-lists';
import { getEntryItemKey, getEffectiveEntryRating } from '@/lib/tracker-metadata';
import { findEntryLocation, formatProgressLabel } from '@/lib/tracker-selectors';

export default function ListEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { activeLists, itemUserDataByKey } = useListsQuery();
  const { updateEntry } = useEntryActions();
  const [activeTab, setActiveTab] = useState<ItemDetailTabId>('details');

  const result = useMemo(() => {
    if (!id) {
      return null;
    }

    return findEntryLocation(activeLists, id);
  }, [activeLists, id]);

  const itemKey = result ? getEntryItemKey(result.entry) : null;
  const showMyDataTab = !!itemKey;
  const progressConfig = result ? buildProgressConfig(result.entry) : undefined;
  const effectiveRating = result
    ? getEffectiveEntryRating(result.entry, itemUserDataByKey)
    : undefined;
  const effectiveProgress = result
    ? formatProgressLabel(result.entry, itemUserDataByKey)
    : null;

  const handleSave = (draft: EntryDraft) => {
    if (!result) {
      return;
    }

    updateEntry(result.list.id, result.entry.id, mapDraftToEntryUpdates(draft, result.entry));
  };

  return (
    <>
      <Stack.Screen options={{ title: result?.entry.title ?? 'Entry Info' }} />
      <ThemedView style={styles.container}>
        {!result ? (
          <View style={styles.centered}>
            <ThemedText>This entry could not be found.</ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <ThumbnailImage
                imageUrl={result.entry.coverAssetUri ?? result.entry.imageUrl}
                style={styles.cover}
              />
              <View style={styles.summaryText}>
                <ThemedText type="title" numberOfLines={2}>
                  {result.entry.title}
                </ThemedText>
                <ThemedText style={styles.metaText}>{result.list.title}</ThemedText>
                <ThemedText style={styles.metaText}>Type: {result.entry.type}</ThemedText>
                <ThemedText style={styles.metaText}>Status: {result.entry.status}</ThemedText>
                {effectiveProgress ? (
                  <ThemedText style={styles.metaText}>Progress: {effectiveProgress}</ThemedText>
                ) : null}
                {effectiveRating ? (
                  <ThemedText style={styles.metaText}>Rating: {effectiveRating}</ThemedText>
                ) : null}
              </View>
            </View>

            {showMyDataTab ? (
              <ItemDetailTabs activeTab={activeTab} onChange={setActiveTab} />
            ) : null}

            {showMyDataTab && activeTab === 'my-data' && itemKey ? (
              <ScrollView
                contentContainerStyle={[
                  styles.panelContent,
                  { paddingBottom: insets.bottom + 24 },
                ]}
                showsVerticalScrollIndicator={false}
              >
                <ThemedText style={styles.sectionCopy}>
                  Changes here apply to this catalog item anywhere it appears.
                </ThemedText>
                <ItemUserDataPanel
                  itemKey={itemKey}
                  showRating={result.list.config.addons.includes('rating') || !!effectiveRating}
                  progressConfig={progressConfig}
                />
              </ScrollView>
            ) : (
              <ManualEntryForm
                submitLabel="Save changes"
                initialEntry={result.entry}
                currentListId={result.list.id}
                listConfig={result.list.config}
                onSubmit={handleSave}
              />
            )}
          </>
        )}
      </ThemedView>
    </>
  );
}

function mapDraftToEntryUpdates(draft: EntryDraft, currentEntry: ListEntry): Partial<ListEntry> {
  const canonicalUrl =
    draft.sourceRef?.canonicalUrl ??
    draft.productUrl ??
    (draft.type === 'link' ? draft.productUrl : undefined);

  return {
    title: draft.title.trim(),
    type: draft.type,
    detailPath: draft.detailPath,
    linkedListId: draft.linkedListId,
    status: draft.status ?? currentEntry.status,
    notes: draft.notes,
    customFields: draft.customFields,
    tags: draft.tags ?? [],
    rating: draft.rating,
    progress: draft.progress,
    reminderAt: draft.reminderAt,
    coverAssetUri: draft.coverAssetUri,
    productUrl: draft.productUrl,
    sourceRef: {
      ...currentEntry.sourceRef,
      ...draft.sourceRef,
      source: draft.type === 'game' || draft.type === 'list' ? 'custom' : draft.type,
      detailPath: draft.detailPath,
      canonicalUrl,
    },
  };
}

function buildProgressConfig(entry: ListEntry) {
  const total =
    entry.progress?.total ??
    entry.totalEpisodes ??
    entry.totalChapters ??
    entry.totalVolumes;
  const unit = getEntryProgressUnit(entry);

  if (!unit) {
    return undefined;
  }

  return {
    label: entry.progress?.label ?? 'Progress',
    unit,
    total,
    allowCustomTotal: total === undefined,
  };
}

function getEntryProgressUnit(entry: ListEntry): EntryProgressUnit | null {
  if (entry.progress?.unit) {
    return entry.progress.unit;
  }
  if (entry.totalEpisodes !== undefined) {
    return 'episode';
  }
  if (entry.totalChapters !== undefined) {
    return 'chapter';
  }
  if (entry.totalVolumes !== undefined) {
    return 'volume';
  }
  if (entry.type === 'book') {
    return 'percent';
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  summary: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  cover: {
    width: 88,
    height: 132,
    borderRadius: 18,
  },
  summaryText: {
    flex: 1,
    gap: 4,
  },
  metaText: {
    opacity: 0.75,
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  sectionCopy: {
    opacity: 0.75,
  },
});
