import { useConvex, useMutation } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { RatingStars } from '@/components/tracker/RatingStars';
import { SelectionRow } from '@/components/tracker/selection-row';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type {
  EntryProgressUnit,
  EntryStatus,
  ListConfig,
  ListEntry,
  ListEntryType,
} from '@/data/mock-lists';
import type { EntryDraft } from '@/contexts/lists-context';
import { useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LIST_STATUS_OPTIONS } from '@/lib/list-config-options';
import { uploadImageToConvex, type UploadedStorageFile } from '@/lib/convex-upload';
import { normalizeProgress, normalizeRating } from '@/lib/tracker-metadata';

interface ManualEntryFormProps {
  onSubmit: (draft: EntryDraft) => Promise<void> | void;
  submitLabel?: string;
  initialEntry?: ListEntry | null;
  currentListId?: string;
  listConfig?: ListConfig;
  onRequestCreateLinkedList?: () => void;
  mode?: 'full' | 'addons';
}

const TYPE_OPTIONS: ListEntryType[] = ['custom', 'book', 'anime', 'manga', 'movie', 'tv', 'link', 'list'];
const PROGRESS_UNIT_OPTIONS: EntryProgressUnit[] = [
  'item',
  'episode',
  'chapter',
  'volume',
  'percent',
];
const ENTRY_SETTINGS_ADDONS = [
  'status',
  'progress',
  'rating',
  'tags',
  'notes',
  'reminders',
  'cover',
  'links',
] as const satisfies readonly ListConfig['addons'][number][];

export function ManualEntryForm({
  onSubmit,
  submitLabel = 'Add entry',
  initialEntry,
  currentListId,
  listConfig,
  onRequestCreateLinkedList,
  mode = 'full',
}: ManualEntryFormProps) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const attachEntryCover = useMutation(api.media.attachEntryCover);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [type, setType] = useState<ListEntryType>(
    initialEntry?.type ?? listConfig?.defaultEntryType ?? 'custom'
  );
  const [status, setStatus] = useState<EntryStatus | ''>(
    initialEntry?.status ?? (mode === 'addons' ? '' : 'planned')
  );
  const [notes, setNotes] = useState(initialEntry?.notes ?? '');
  const [productUrl, setProductUrl] = useState(initialEntry?.productUrl ?? '');
  const [tagsText, setTagsText] = useState(initialEntry?.tags.join(', ') ?? '');
  const [ratingValue, setRatingValue] = useState<number | undefined>(
    normalizeRating(initialEntry?.rating)
  );
  const [currentText, setCurrentText] = useState(
    initialEntry?.progress?.current !== undefined ? String(initialEntry.progress.current) : ''
  );
  const [totalText, setTotalText] = useState(
    initialEntry?.progress?.total !== undefined ? String(initialEntry.progress.total) : ''
  );
  const [progressUnit, setProgressUnit] = useState<EntryProgressUnit | ''>(
    initialEntry?.progress?.unit ?? (mode === 'addons' ? '' : 'item')
  );
  const [coverAssetUri, setCoverAssetUri] = useState(initialEntry?.coverAssetUri);
  const [uploadedCover, setUploadedCover] = useState<UploadedStorageFile | null>(null);
  const [selectedLinkedListId, setSelectedLinkedListId] = useState<string | null>(
    initialEntry?.linkedListId ?? null
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (listConfig?.fieldDefinitions ?? []).map((field) => [
        field.id,
        initialEntry?.customFields?.find((item) => item.title === field.label)?.value ?? '',
      ])
    )
  );
  const [reminderDays, setReminderDays] = useState<number | null>(
    initialEntry?.reminderAt
      ? Math.max(1, Math.round((initialEntry.reminderAt - Date.now()) / (24 * 60 * 60 * 1000)))
      : null
  );

  useEffect(() => {
    if (!initialEntry) {
      return;
    }

    setTitle(initialEntry.title);
    setType(initialEntry.type);
    setStatus(initialEntry.status ?? (mode === 'addons' ? '' : 'planned'));
    setNotes(initialEntry.notes ?? '');
    setProductUrl(initialEntry.productUrl ?? '');
    setTagsText(initialEntry.tags.join(', '));
    setRatingValue(normalizeRating(initialEntry.rating));
    setCurrentText(
      initialEntry.progress?.current !== undefined ? String(initialEntry.progress.current) : ''
    );
    setTotalText(
      initialEntry.progress?.total !== undefined ? String(initialEntry.progress.total) : ''
    );
    setProgressUnit(initialEntry.progress?.unit ?? (mode === 'addons' ? '' : 'item'));
    setCoverAssetUri(initialEntry.coverAssetUri);
    setUploadedCover(null);
    setSelectedLinkedListId(initialEntry.linkedListId ?? null);
    setCustomFieldValues(
      Object.fromEntries(
        (listConfig?.fieldDefinitions ?? []).map((field) => [
          field.id,
          initialEntry.customFields?.find((item) => item.title === field.label)?.value ?? '',
        ])
      )
    );
  }, [initialEntry, listConfig?.fieldDefinitions, mode]);

  useEffect(() => {
    if (!initialEntry && listConfig?.defaultEntryType) {
      setType(listConfig.defaultEntryType);
    }
  }, [initialEntry, listConfig?.defaultEntryType]);

  const addons =
    mode === 'addons'
      ? ENTRY_SETTINGS_ADDONS
      : (listConfig?.addons ?? [
          'status',
          'progress',
          'rating',
          'tags',
          'notes',
          'reminders',
          'cover',
          'custom-fields',
        ]);
  const hasAddon = (addon: string) => addons.includes(addon as never);
  const showCoreFields = mode === 'full';

  const blockedLinkedListIds = useMemo(() => {
    const blocked = new Set<string>();
    if (!currentListId) {
      return blocked;
    }

    const listById = new Map(activeLists.map((list) => [list.id, list]));
    let pointer: string | undefined = currentListId;
    while (pointer) {
      if (blocked.has(pointer)) {
        break;
      }
      blocked.add(pointer);
      pointer = listById.get(pointer)?.parentListId;
    }

    return blocked;
  }, [activeLists, currentListId]);

  const currentList = useMemo(
    () => activeLists.find((list) => list.id === currentListId) ?? null,
    [activeLists, currentListId]
  );

  const linkedListIdsInCurrentList = useMemo(
    () =>
      new Set(
        (currentList?.entries ?? [])
          .map((entry) => entry.linkedListId)
          .filter((linkedListId): linkedListId is string => !!linkedListId)
      ),
    [currentList?.entries]
  );

  const availableLinkedLists = useMemo(
    () =>
      [...activeLists]
        .filter((list) => {
          if (blockedLinkedListIds.has(list.id)) {
            return false;
          }

          if (linkedListIdsInCurrentList.has(list.id) && list.id !== selectedLinkedListId) {
            return false;
          }

          if (
            list.parentListId &&
            list.parentListId !== currentListId &&
            list.id !== selectedLinkedListId
          ) {
            return false;
          }

          return !list.archivedAt;
        })
        .sort((a, b) => a.title.localeCompare(b.title)),
    [activeLists, blockedLinkedListIds, currentListId, linkedListIdsInCurrentList, selectedLinkedListId]
  );

  const selectedLinkedList =
    activeLists.find((list) => list.id === selectedLinkedListId) ?? null;
  const typeOptions = TYPE_OPTIONS.map((option) => ({
    label: option[0].toUpperCase() + option.slice(1),
    value: option,
  }));
  const statusOptions = [
    { label: 'None', value: '' },
    ...LIST_STATUS_OPTIONS.map((option) => ({
      label: option.label,
      value: option.value,
    })),
  ] as const;
  const progressOptions = [
    { label: 'None', value: '' },
    ...PROGRESS_UNIT_OPTIONS.map((unit) => ({
      label: unit[0].toUpperCase() + unit.slice(1),
      value: unit,
    })),
  ] as const;
  const reminderOptions = [
    { label: 'None', value: 'none' },
    { label: 'Tomorrow', value: '1' },
    { label: '3 days', value: '3' },
    { label: '7 days', value: '7' },
  ] as const;
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === status)?.label ?? 'None';
  const selectedProgressLabel =
    progressOptions.find((option) => option.value === progressUnit)?.label ?? 'None';
  const selectedReminderValue = reminderDays ? String(reminderDays) : 'none';
  const selectedReminderLabel =
    reminderOptions.find((option) => option.value === selectedReminderValue)?.label ?? 'None';

  const reminderAt = useMemo(() => {
    if (!reminderDays) {
      return undefined;
    }
    return Date.now() + reminderDays * 24 * 60 * 60 * 1000;
  }, [reminderDays]);

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uploaded = await uploadImageToConvex({
        uri: result.assets[0].uri,
        generateUploadUrl: () => generateUploadUrl({}),
        resolveUrl: (storageId) => convex.query(api.media.getResolvedUrl, { storageId }),
      });

      if (initialEntry?.id) {
        const attached = await attachEntryCover({
          entryId: initialEntry.id,
          storageId: uploaded.storageId,
          mimeType: uploaded.mimeType,
          fileName: uploaded.fileName,
        });
        setUploadedCover(null);
        setCoverAssetUri(attached?.url ?? uploaded.url);
        return;
      }

      setUploadedCover(uploaded);
      setCoverAssetUri(uploaded.url);
    }
  };

  const clearCover = () => {
    setUploadedCover(null);
    setCoverAssetUri(undefined);
  };

  const handleSubmit = async () => {
    const linkedListDetailPath = selectedLinkedListId ? `list/${selectedLinkedListId}` : undefined;
    const trimmedTitle = type === 'list'
      ? (selectedLinkedList?.title.trim() ?? title.trim())
      : title.trim();

    if (!trimmedTitle || (type === 'list' && !selectedLinkedListId)) {
      return;
    }

    const current = Number(currentText);
    const total = Number(totalText);
    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const customFields =
      listConfig?.fieldDefinitions
        .map((field) => ({
          title: field.label.trim(),
          value: (customFieldValues[field.id] ?? '').trim(),
          format: field.kind === 'number' ? ('numbers' as const) : ('text' as const),
        }))
        .filter((field) => field.title && field.value) ?? [];

    await onSubmit({
      title: trimmedTitle,
      type,
      detailPath: linkedListDetailPath,
      linkedListId: type === 'list' ? selectedLinkedListId ?? undefined : undefined,
      status: hasAddon('status') ? status || undefined : undefined,
      notes: hasAddon('notes') ? notes.trim() || undefined : undefined,
      customFields: customFields.length ? customFields : undefined,
      tags: hasAddon('tags') ? tags : [],
      rating: hasAddon('rating') ? normalizeRating(ratingValue) : undefined,
      progress: hasAddon('progress') && progressUnit
        ? normalizeProgress({
            current: currentText.trim() && Number.isFinite(current) ? current : undefined,
            total: totalText.trim() && Number.isFinite(total) && total > 0 ? total : undefined,
            unit: progressUnit,
            updatedAt: Date.now(),
          })
        : undefined,
      reminderAt: hasAddon('reminders') ? reminderAt : undefined,
      coverAssetUri: hasAddon('cover') ? coverAssetUri : undefined,
      uploadedCover: hasAddon('cover') ? uploadedCover : undefined,
      productUrl:
        hasAddon('links') || type === 'link' ? productUrl.trim() || undefined : undefined,
      sourceRef: {
        source: type === 'game' || type === 'list' ? 'custom' : type,
        detailPath: linkedListDetailPath,
        canonicalUrl:
          hasAddon('links') || type === 'link' ? productUrl.trim() || undefined : undefined,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {hasAddon('cover') ? (
        <View style={styles.coverRow}>
          <ThumbnailImage imageUrl={coverAssetUri} style={styles.coverPreview} />
          <View style={styles.coverActions}>
            <ThemedText type="defaultSemiBold">Custom cover</ThemedText>
            <View style={styles.coverButtonRow}>
              <Pressable
                onPress={pickCover}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.tint + '14',
                    borderColor: colors.tint + '35',
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
              >
                <ThemedText style={{ color: colors.tint }}>Choose image</ThemedText>
              </Pressable>
              {coverAssetUri ? (
                <Pressable
                  onPress={clearCover}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.icon + '10',
                      borderColor: colors.icon + '35',
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <ThemedText style={{ color: colors.text }}>Remove</ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {showCoreFields ? (
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.icon + '28',
              backgroundColor: colors.icon + '10',
            },
          ]}
          placeholder={type === 'list' ? 'Linked list title' : 'Title'}
          placeholderTextColor={colors.icon}
          value={type === 'list' ? (selectedLinkedList?.title ?? title) : title}
          onChangeText={setTitle}
          editable={type !== 'list'}
        />
      ) : null}

      {hasAddon('notes') ? (
        <TextInput
          style={[
            styles.textArea,
            {
              color: colors.text,
              borderColor: colors.icon + '28',
              backgroundColor: colors.icon + '10',
            },
          ]}
          multiline
          placeholder="Notes"
          placeholderTextColor={colors.icon}
          value={notes}
          onChangeText={setNotes}
        />
      ) : null}

      {hasAddon('links') || type === 'link' ? (
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.icon + '28',
              backgroundColor: colors.icon + '10',
            },
          ]}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Link URL"
          placeholderTextColor={colors.icon}
          value={productUrl}
          onChangeText={setProductUrl}
        />
      ) : null}

      {showCoreFields ? (
          <SelectionRow
            title="Type"
            value={typeOptions.find((option) => option.value === type)?.label ?? 'Custom'}
            options={typeOptions}
            selectedValue={type}
            onValueChange={(value: string) => setType(value as ListEntryType)}
          />
      ) : null}

      {showCoreFields && type === 'list' ? (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Linked list</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            Pick a list to insert as a sublist entry. Its own title is used automatically.
          </ThemedText>
          {onRequestCreateLinkedList ? (
            <Pressable
              onPress={onRequestCreateLinkedList}
              style={[
                styles.createLinkedListButton,
                {
                  borderColor: colors.tint + '35',
                  backgroundColor: colors.tint + '12',
                },
              ]}
            >
              <View style={styles.linkedListText}>
                <ThemedText style={{ color: colors.tint }}>Create new sublist</ThemedText>
                <ThemedText style={{ color: colors.icon }}>
                  Start a new list that inherits this parent list&apos;s setup.
                </ThemedText>
              </View>
            </Pressable>
          ) : null}
          {availableLinkedLists.length ? (
            <View style={styles.linkedListOptions}>
              {availableLinkedLists.map((list) => {
                const selected = selectedLinkedListId === list.id;
                return (
                  <Pressable
                    key={list.id}
                    onPress={() => {
                      setSelectedLinkedListId(list.id);
                      setTitle(list.title);
                    }}
                    style={[
                      styles.linkedListOption,
                      {
                        borderColor: selected ? colors.tint : colors.icon + '28',
                        backgroundColor: selected ? colors.tint + '12' : colors.icon + '08',
                      },
                    ]}
                  >
                    <View style={styles.linkedListText}>
                      <ThemedText>{list.title}</ThemedText>
                      <ThemedText style={{ color: colors.icon }}>
                        {list.entries.length} item{list.entries.length === 1 ? '' : 's'}
                        {list.tags.length ? ` · ${list.tags.join(', ')}` : ''}
                      </ThemedText>
                    </View>
                    {selected ? (
                      <ThemedText style={{ color: colors.tint }}>Selected</ThemedText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <ThemedText style={{ color: colors.icon }}>
              No available lists can be linked here yet.
            </ThemedText>
          )}
        </View>
      ) : null}

      {hasAddon('status') ? (
        <View style={styles.section}>
          <SelectionRow
            title="Status"
            value={selectedStatusLabel}
            options={statusOptions}
            selectedValue={status}
            onValueChange={(value: string) => setStatus(value as EntryStatus | '')}
          />
        </View>
      ) : null}

      {hasAddon('progress') ? (
        <View style={styles.section}>
          <SelectionRow
            title="Progress"
            value={selectedProgressLabel}
            options={progressOptions}
            selectedValue={progressUnit}
            onValueChange={(value: string) => {
              setProgressUnit(value as EntryProgressUnit | '');
              if (!value) {
                setCurrentText('');
                setTotalText('');
              }
            }}
          />
          {progressUnit ? (
            <View style={styles.inlineFields}>
              <TextInput
                style={[
                  styles.smallInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '28',
                    backgroundColor: colors.icon + '10',
                  },
                ]}
                keyboardType="numeric"
                placeholder="Current"
                placeholderTextColor={colors.icon}
                value={currentText}
                onChangeText={setCurrentText}
              />
              <TextInput
                style={[
                  styles.smallInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '28',
                    backgroundColor: colors.icon + '10',
                  },
                ]}
                keyboardType="numeric"
                placeholder="Total"
                placeholderTextColor={colors.icon}
                value={totalText}
                onChangeText={setTotalText}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {hasAddon('rating') ? (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Rating</ThemedText>
          <RatingStars value={ratingValue} onChange={setRatingValue} showValue allowClear />
        </View>
      ) : null}

      {hasAddon('tags') ? (
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.icon + '28',
              backgroundColor: colors.icon + '10',
            },
          ]}
          placeholder="Tags, separated by commas"
          placeholderTextColor={colors.icon}
          value={tagsText}
          onChangeText={setTagsText}
        />
      ) : null}

      {listConfig?.fieldDefinitions.length ? (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Custom fields</ThemedText>
          {listConfig.fieldDefinitions.map((field) => (
            <TextInput
              key={field.id}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.icon + '28',
                  backgroundColor: colors.icon + '10',
                },
              ]}
              keyboardType={field.kind === 'number' ? 'numeric' : field.kind === 'url' ? 'url' : 'default'}
              placeholder={field.label}
              placeholderTextColor={colors.icon}
              value={customFieldValues[field.id] ?? ''}
              onChangeText={(value) =>
                setCustomFieldValues((current) => ({
                  ...current,
                  [field.id]: value,
                }))
              }
            />
          ))}
        </View>
      ) : null}

      {hasAddon('reminders') ? (
        <View style={styles.section}>
          <SelectionRow
            title="Reminder"
            value={selectedReminderLabel}
            options={reminderOptions}
            selectedValue={selectedReminderValue}
            onValueChange={(value: string) =>
              setReminderDays(value === 'none' ? null : Number(value))
            }
          />
        </View>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: colors.tint,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
          {submitLabel}
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
  },
  coverRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  coverPreview: {
    width: 92,
    height: 132,
    borderRadius: 20,
  },
  coverActions: {
    flex: 1,
    gap: 10,
  },
  coverButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  section: {
    gap: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  linkedListOptions: {
    gap: 10,
  },
  createLinkedListButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkedListOption: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkedListText: {
    flex: 1,
    gap: 4,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  smallInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
