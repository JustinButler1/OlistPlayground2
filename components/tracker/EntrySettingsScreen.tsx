import { useConvex, useMutation } from 'convex/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { api } from '@/convex/_generated/api';
import { EntrySettingsAddMore } from '@/components/tracker/EntrySettingsAddMore';
import { EntrySettingsSection } from '@/components/tracker/EntrySettingsSection';
import { EntrySettingsSummaryRow } from '@/components/tracker/EntrySettingsSummaryRow';
import { EntrySettingsTitleField } from '@/components/tracker/EntrySettingsTitleField';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SelectionRow } from '@/components/tracker/selection-row';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type {
  EntryProgressUnit,
  EntryStatus,
  ListConfig,
  ListEntry,
} from '@/data/mock-lists';
import type { EntryDraft } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LIST_STATUS_OPTIONS } from '@/lib/list-config-options';
import { uploadImageToConvex, type UploadedStorageFile } from '@/lib/convex-upload';
import {
  formatRatingValue,
  getInitialAdvancedSectionVisibility,
  normalizeProgress,
  normalizeRating,
  type AdvancedSectionId,
} from '@/lib/tracker-metadata';

interface EntrySettingsScreenProps {
  entry: ListEntry;
  listConfig: ListConfig;
  onSave: (draft: EntryDraft) => Promise<void> | void;
}

const PROGRESS_UNIT_OPTIONS: EntryProgressUnit[] = [
  'item',
  'episode',
  'chapter',
  'volume',
  'percent',
];

export function EntrySettingsScreen({
  entry,
  listConfig,
  onSave,
}: EntrySettingsScreenProps) {
  const convex = useConvex();
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const attachEntryCover = useMutation(api.media.attachEntryCover);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // ---- State: always-visible fields ----
  const [title, setTitle] = useState(entry.title);
  const [status, setStatus] = useState<EntryStatus | ''>(entry.status ?? '');
  const [progressUnit, setProgressUnit] = useState<EntryProgressUnit | ''>(
    entry.progress?.unit ?? ''
  );
  const [currentText, setCurrentText] = useState(
    entry.progress?.current !== undefined ? String(entry.progress.current) : ''
  );
  const [totalText, setTotalText] = useState(
    entry.progress?.total !== undefined ? String(entry.progress.total) : ''
  );
  const [ratingValue, setRatingValue] = useState<number | undefined>(
    normalizeRating(entry.rating)
  );
  const [reminderDays, setReminderDays] = useState<number | null>(
    entry.reminderAt
      ? Math.max(1, Math.round((entry.reminderAt - Date.now()) / (24 * 60 * 60 * 1000)))
      : null
  );

  // ---- State: advanced section visibility ----
  const [advancedVisibility, setAdvancedVisibility] = useState(() =>
    getInitialAdvancedSectionVisibility(entry, listConfig)
  );

  // ---- State: advanced fields ----
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [tagsText, setTagsText] = useState(entry.tags.join(', '));
  const [productUrl, setProductUrl] = useState(entry.productUrl ?? '');
  const [coverAssetUri, setCoverAssetUri] = useState(entry.coverAssetUri);
  const [uploadedCover, setUploadedCover] = useState<UploadedStorageFile | null>(null);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (listConfig.fieldDefinitions ?? []).map((field) => [
        field.id,
        entry.customFields?.find((item) => item.title === field.label)?.value ?? '',
      ])
    )
  );

  // Sync when entry changes externally
  useEffect(() => {
    setTitle(entry.title);
    setStatus(entry.status ?? '');
    setProgressUnit(entry.progress?.unit ?? '');
    setCurrentText(
      entry.progress?.current !== undefined ? String(entry.progress.current) : ''
    );
    setTotalText(
      entry.progress?.total !== undefined ? String(entry.progress.total) : ''
    );
    setRatingValue(normalizeRating(entry.rating));
    setNotes(entry.notes ?? '');
    setTagsText(entry.tags.join(', '));
    setProductUrl(entry.productUrl ?? '');
    setCoverAssetUri(entry.coverAssetUri);
    setUploadedCover(null);
    setCustomFieldValues(
      Object.fromEntries(
        (listConfig.fieldDefinitions ?? []).map((field) => [
          field.id,
          entry.customFields?.find((item) => item.title === field.label)?.value ?? '',
        ])
      )
    );
    setAdvancedVisibility(getInitialAdvancedSectionVisibility(entry, listConfig));
  }, [entry, listConfig]);

  // ---- Derived values ----
  const addons = listConfig.addons;
  const hasAddon = useCallback(
    (addon: string) => addons.includes(addon as never),
    [addons]
  );

  const availableSections = useMemo(() => {
    const set = new Set<AdvancedSectionId>();
    if (hasAddon('notes')) set.add('notes');
    if (hasAddon('tags')) set.add('tags');
    if (hasAddon('cover')) set.add('cover');
    if (hasAddon('links') || entry.type === 'link') set.add('link');
    if (listConfig.fieldDefinitions.length) set.add('customFields');
    return set;
  }, [hasAddon, entry.type, listConfig.fieldDefinitions.length]);

  const statusOptions = useMemo(
    () => [
      { label: 'None', value: '' },
      ...LIST_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    ],
    []
  );

  const progressOptions = useMemo(
    () => [
      { label: 'None', value: '' },
      ...PROGRESS_UNIT_OPTIONS.map((u) => ({
        label: u[0].toUpperCase() + u.slice(1),
        value: u,
      })),
    ],
    []
  );

  const reminderOptions = useMemo(
    () =>
      [
        { label: 'None', value: 'none' },
        { label: 'Tomorrow', value: '1' },
        { label: '3 days', value: '3' },
        { label: '7 days', value: '7' },
      ] as const,
    []
  );

  const selectedStatusLabel =
    statusOptions.find((o) => o.value === status)?.label ?? 'None';
  const selectedProgressLabel =
    progressOptions.find((o) => o.value === progressUnit)?.label ?? 'None';
  const selectedReminderValue = reminderDays ? String(reminderDays) : 'none';
  const selectedReminderLabel =
    reminderOptions.find((o) => o.value === selectedReminderValue)?.label ?? 'None';

  const reminderAt = useMemo(() => {
    if (!reminderDays) return undefined;
    return Date.now() + reminderDays * 24 * 60 * 60 * 1000;
  }, [reminderDays]);

  // ---- Actions ----
  const revealSection = (section: AdvancedSectionId) => {
    setAdvancedVisibility((prev) => ({ ...prev, [section]: true }));
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

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

      if (entry.id) {
        const attached = await attachEntryCover({
          entryId: entry.id,
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

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const current = Number(currentText);
    const total = Number(totalText);
    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const customFields =
      listConfig.fieldDefinitions
        .map((field) => ({
          title: field.label.trim(),
          value: (customFieldValues[field.id] ?? '').trim(),
          format: field.kind === 'number' ? ('numbers' as const) : ('text' as const),
        }))
        .filter((f) => f.title && f.value) ?? [];

    await onSave({
      title: trimmedTitle,
      type: entry.type,
      detailPath: entry.detailPath,
      linkedListId: entry.linkedListId,
      status: hasAddon('status') ? status || undefined : undefined,
      notes: hasAddon('notes') ? notes.trim() || undefined : undefined,
      customFields: customFields.length ? customFields : undefined,
      tags: hasAddon('tags') ? tags : [],
      rating: hasAddon('rating') ? normalizeRating(ratingValue) : undefined,
      progress:
        hasAddon('progress') && progressUnit
          ? normalizeProgress({
              current:
                currentText.trim() && Number.isFinite(current) ? current : undefined,
              total:
                totalText.trim() && Number.isFinite(total) && total > 0
                  ? total
                  : undefined,
              unit: progressUnit,
              updatedAt: Date.now(),
            })
          : undefined,
      reminderAt: hasAddon('reminders') ? reminderAt : undefined,
      coverAssetUri: hasAddon('cover') ? coverAssetUri : undefined,
      uploadedCover: hasAddon('cover') ? uploadedCover : undefined,
      productUrl:
        hasAddon('links') || entry.type === 'link'
          ? productUrl.trim() || undefined
          : undefined,
      sourceRef: {
        source:
          entry.type === 'game' || entry.type === 'list' ? 'custom' : entry.type,
        detailPath: entry.detailPath,
        canonicalUrl:
          hasAddon('links') || entry.type === 'link'
            ? productUrl.trim() || undefined
            : undefined,
      },
    });
  };

  // ---- Render ----
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ========== 1. IDENTITY (always visible) ========== */}
      <EntrySettingsSection>
        <EntrySettingsTitleField
          value={title}
          onChangeText={setTitle}
          editable={entry.type !== 'list'}
        />
        <EntrySettingsSummaryRow entry={entry} />
      </EntrySettingsSection>

      {/* ========== 2. TRACKING (always visible) ========== */}
      {hasAddon('status') ? (
        <SelectionRow
          title="Status"
          value={selectedStatusLabel}
          options={statusOptions}
          selectedValue={status}
          onValueChange={(value: string) => setStatus(value as EntryStatus | '')}
        />
      ) : null}

      {hasAddon('progress') ? (
        <EntrySettingsSection>
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
        </EntrySettingsSection>
      ) : null}

      {hasAddon('rating') ? (
        <EntrySettingsSection title="Rating">
          <View style={styles.ratingRow}>
            <Pressable
              onPress={() =>
                setRatingValue((cur) => {
                  if (!cur) return undefined;
                  const next = Math.round((cur - 0.25) * 4) / 4;
                  return next <= 0 ? undefined : next;
                })
              }
              style={[
                styles.ratingButton,
                {
                  borderColor: colors.icon + '28',
                  backgroundColor: colors.icon + '10',
                },
              ]}
            >
              <IconSymbol name="minus" size={18} color={colors.text} />
            </Pressable>
            <ThemedText style={styles.ratingValue}>
              {ratingValue ? formatRatingValue(ratingValue) : '-'}
            </ThemedText>
            <Pressable
              onPress={() =>
                setRatingValue((cur) => {
                  const base = cur ?? 0;
                  const next = Math.round((base + 0.25) * 4) / 4;
                  return Math.min(next, 5);
                })
              }
              style={[
                styles.ratingButton,
                {
                  borderColor: colors.icon + '28',
                  backgroundColor: colors.icon + '10',
                },
              ]}
            >
              <IconSymbol name="plus" size={18} color={colors.text} />
            </Pressable>
          </View>
        </EntrySettingsSection>
      ) : null}

      {hasAddon('reminders') ? (
        <SelectionRow
          title="Reminder"
          value={selectedReminderLabel}
          options={reminderOptions}
          selectedValue={selectedReminderValue}
          onValueChange={(value: string) =>
            setReminderDays(value === 'none' ? null : Number(value))
          }
        />
      ) : null}

      {/* ========== 3. ADD MORE ========== */}
      <EntrySettingsAddMore
        visibleSections={advancedVisibility}
        availableSections={availableSections}
        onReveal={revealSection}
      />

      {/* ========== 4. EXPANDED SECTIONS ========== */}
      {advancedVisibility.notes && hasAddon('notes') ? (
        <EntrySettingsSection title="Notes">
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
            placeholder="Write some notes..."
            placeholderTextColor={colors.icon}
            value={notes}
            onChangeText={setNotes}
          />
        </EntrySettingsSection>
      ) : null}

      {advancedVisibility.tags && hasAddon('tags') ? (
        <EntrySettingsSection title="Tags">
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
        </EntrySettingsSection>
      ) : null}

      {advancedVisibility.customFields && listConfig.fieldDefinitions.length ? (
        <EntrySettingsSection title="Custom fields">
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
              keyboardType={
                field.kind === 'number'
                  ? 'numeric'
                  : field.kind === 'url'
                    ? 'url'
                    : 'default'
              }
              placeholder={field.label}
              placeholderTextColor={colors.icon}
              value={customFieldValues[field.id] ?? ''}
              onChangeText={(value) =>
                setCustomFieldValues((cur) => ({ ...cur, [field.id]: value }))
              }
            />
          ))}
        </EntrySettingsSection>
      ) : null}

      {advancedVisibility.cover && hasAddon('cover') ? (
        <EntrySettingsSection title="Cover">
          <View style={styles.coverRow}>
            <ThumbnailImage imageUrl={coverAssetUri} style={styles.coverPreview} />
            <View style={styles.coverActions}>
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
        </EntrySettingsSection>
      ) : null}

      {advancedVisibility.link && (hasAddon('links') || entry.type === 'link') ? (
        <EntrySettingsSection title="Link">
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
            placeholder="https://..."
            placeholderTextColor={colors.icon}
            value={productUrl}
            onChangeText={setProductUrl}
          />
        </EntrySettingsSection>
      ) : null}

      {/* ========== SAVE ========== */}
      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: colors.tint,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
          Save settings
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
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
