import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RatingStars } from '@/components/tracker/RatingStars';
import { ThemedText } from '@/components/themed-text';
import { useItemUserData } from '@/contexts/lists-context';
import type { CustomField, EntryProgressUnit, ItemUserData } from '@/data/mock-lists';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatProgressLabel,
  getProgressUnitLabel,
  normalizeProgress,
} from '@/lib/tracker-metadata';

interface ItemProgressConfig {
  label: string;
  unit: EntryProgressUnit;
  total?: number;
  allowCustomTotal?: boolean;
}

interface ItemUserDataPanelProps {
  itemKey: string;
  showRating?: boolean;
  progressConfig?: ItemProgressConfig;
}

function cloneItemUserData(value: ItemUserData): ItemUserData {
  return {
    tags: [...value.tags],
    notes: value.notes,
    rating: value.rating,
    progress: value.progress ? { ...value.progress } : undefined,
    customFields: value.customFields.map((field) => ({ ...field })),
    updatedAt: value.updatedAt,
  };
}

function normalizeItemUserDataDraft(value: ItemUserData): ItemUserData {
  return {
    tags: value.tags
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: value.notes?.trim() || undefined,
    rating: value.rating,
    progress: normalizeProgress(value.progress),
    customFields: value.customFields
      .map((field) => ({
        title: field.title.trim(),
        value: field.value.trim(),
        format: field.format === 'numbers' ? ('numbers' as const) : ('text' as const),
      }))
      .filter((field) => field.title || field.value),
    updatedAt: Date.now(),
  };
}

function getItemUserDataSignature(value: ItemUserData): string {
  return JSON.stringify({
    tags: value.tags,
    notes: value.notes ?? '',
    rating: value.rating ?? null,
    progress: value.progress
      ? {
          current: value.progress.current ?? null,
          total: value.progress.total ?? null,
          unit: value.progress.unit,
          label: value.progress.label ?? '',
        }
      : null,
    customFields: value.customFields.map((field) => ({
      title: field.title,
      value: field.value,
      format: field.format ?? 'text',
    })),
  });
}

function createBlankCustomField(): CustomField {
  return {
    title: '',
    value: '',
    format: 'text',
  };
}

function clampTrackedValue(value: number, total?: number): number {
  const rounded = Math.round(value);
  const upperBound = total ?? Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(rounded, 0), upperBound);
}

export function ItemUserDataPanel({
  itemKey,
  showRating = false,
  progressConfig,
}: ItemUserDataPanelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { itemUserData, setItemUserData } = useItemUserData(itemKey);
  const [draft, setDraft] = useState<ItemUserData>(() => cloneItemUserData(itemUserData));
  const [progressSheetVisible, setProgressSheetVisible] = useState(false);
  const [sheetCurrent, setSheetCurrent] = useState<number | null>(null);
  const [sheetCurrentText, setSheetCurrentText] = useState('');
  const [editingSheetCurrent, setEditingSheetCurrent] = useState(false);
  const lastPersistedSignatureRef = useRef(getItemUserDataSignature(itemUserData));

  useEffect(() => {
    const storedSignature = getItemUserDataSignature(itemUserData);
    if (storedSignature !== lastPersistedSignatureRef.current) {
      lastPersistedSignatureRef.current = storedSignature;
      setDraft(cloneItemUserData(itemUserData));
    }
  }, [itemKey, itemUserData]);

  useEffect(() => {
    const normalized = normalizeItemUserDataDraft(draft);
    const nextSignature = getItemUserDataSignature(normalized);
    if (nextSignature === lastPersistedSignatureRef.current) {
      return;
    }

    const timeout = setTimeout(() => {
      lastPersistedSignatureRef.current = nextSignature;
      setItemUserData(normalized);
    }, 250);

    return () => clearTimeout(timeout);
  }, [draft, setItemUserData]);

  const effectiveProgress = useMemo(
    () =>
      normalizeProgress({
        current: draft.progress?.current,
        total: draft.progress?.total ?? progressConfig?.total,
        unit: draft.progress?.unit ?? progressConfig?.unit,
        label: draft.progress?.label ?? progressConfig?.label,
        updatedAt: draft.progress?.updatedAt ?? Date.now(),
      }),
    [draft.progress, progressConfig?.label, progressConfig?.total, progressConfig?.unit]
  );

  const openProgressSheet = () => {
    setSheetCurrent(effectiveProgress?.current ?? null);
    setSheetCurrentText(
      effectiveProgress?.current !== undefined ? String(effectiveProgress.current) : ''
    );
    setEditingSheetCurrent(false);
    setProgressSheetVisible(true);
  };

  const applyTypedCurrent = () => {
    if (!sheetCurrentText.trim()) {
      setSheetCurrent(null);
      setEditingSheetCurrent(false);
      return;
    }

    const parsed = Number(sheetCurrentText);
    if (!Number.isFinite(parsed)) {
      setSheetCurrentText(sheetCurrent !== null ? String(sheetCurrent) : '');
      setEditingSheetCurrent(false);
      return;
    }

    const clamped = clampTrackedValue(parsed, effectiveProgress?.total);
    setSheetCurrent(clamped);
    setSheetCurrentText(String(clamped));
    setEditingSheetCurrent(false);
  };

  const updateTrackedProgress = () => {
    setDraft((current) => ({
      ...current,
      progress: normalizeProgress({
        current: sheetCurrent ?? undefined,
        total: current.progress?.total ?? progressConfig?.total,
        unit: progressConfig?.unit ?? current.progress?.unit ?? 'item',
        label: progressConfig?.label ?? current.progress?.label,
        updatedAt: Date.now(),
      }),
    }));
    setProgressSheetVisible(false);
  };

  const progressTotal = draft.progress?.total ?? progressConfig?.total;
  const progressTotalLabel = getProgressUnitLabel(
    progressConfig?.unit ?? draft.progress?.unit ?? 'item',
    'long',
    progressConfig?.label ?? draft.progress?.label
  );
  const progressDisplayLabel =
    effectiveProgress !== undefined ? formatProgressLabel(effectiveProgress) : null;
  const canShowProgress =
    !!progressConfig && (progressTotal !== undefined || progressConfig.allowCustomTotal);

  return (
    <View style={styles.container}>
      {showRating ? (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold">Rating</ThemedText>
          <RatingStars
            value={draft.rating}
            onChange={(nextValue) =>
              setDraft((current) => ({
                ...current,
                rating: nextValue,
              }))
            }
            showValue
            allowClear
          />
        </View>
      ) : null}

      {canShowProgress ? (
        <View style={styles.section}>
          <View style={styles.progressHeader}>
            <ThemedText type="defaultSemiBold">Progress</ThemedText>
            {progressConfig?.allowCustomTotal && progressConfig.total === undefined ? (
              <TextInput
                style={[
                  styles.totalInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '28',
                    backgroundColor: colors.icon + '10',
                  },
                ]}
                keyboardType="numeric"
                placeholder={`Total ${progressConfig.label}`}
                placeholderTextColor={colors.icon}
                value={progressTotal !== undefined ? String(progressTotal) : ''}
                onChangeText={(value) => {
                  const nextTotal = Number(value);
                  setDraft((current) => ({
                    ...current,
                    progress: normalizeProgress({
                      current: current.progress?.current,
                      total:
                        value.trim() && Number.isFinite(nextTotal) && nextTotal > 0
                          ? nextTotal
                          : undefined,
                      unit: progressConfig.unit,
                      label: progressConfig.label,
                      updatedAt: Date.now(),
                    }),
                  }));
                }}
              />
            ) : null}
          </View>
          <Pressable
            disabled={progressTotal === undefined}
            onPress={openProgressSheet}
            style={({ pressed }) => [
              styles.progressCard,
              {
                borderColor: colors.icon + '28',
                backgroundColor: colors.icon + '10',
                opacity: progressTotal === undefined ? 0.55 : pressed ? 0.82 : 1,
              },
            ]}
          >
            <View style={styles.progressCardText}>
              <ThemedText type="defaultSemiBold">
                {progressConfig?.label ?? effectiveProgress?.label ?? 'Progress'}
              </ThemedText>
              <ThemedText style={{ color: colors.icon }}>
                {progressDisplayLabel ?? `-/${progressTotal ?? '-'}`}
              </ThemedText>
            </View>
            <ThemedText style={{ color: colors.tint }}>
              {progressTotal === undefined ? 'Set total' : 'Update'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.icon + '28',
            backgroundColor: colors.icon + '10',
          },
        ]}
        placeholder="Tags, comma separated"
        placeholderTextColor={colors.icon}
        value={draft.tags.join(', ')}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            tags: value.split(','),
          }))
        }
      />

      <TextInput
        style={[
          styles.textArea,
          {
            color: colors.text,
            borderColor: colors.icon + '28',
            backgroundColor: colors.icon + '10',
          },
        ]}
        placeholder="Notes"
        placeholderTextColor={colors.icon}
        multiline
        textAlignVertical="top"
        value={draft.notes ?? ''}
        onChangeText={(value) =>
          setDraft((current) => ({
            ...current,
            notes: value,
          }))
        }
      />

      <View style={styles.fieldsHeader}>
        <ThemedText type="defaultSemiBold">Custom fields</ThemedText>
        <Pressable
          onPress={() =>
            setDraft((current) => ({
              ...current,
              customFields: [...current.customFields, createBlankCustomField()],
            }))
          }
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: colors.tint + '14',
              borderColor: colors.tint + '30',
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <ThemedText style={{ color: colors.tint }}>Add field</ThemedText>
        </Pressable>
      </View>

      <View style={styles.fieldList}>
        {draft.customFields.length ? (
          draft.customFields.map((field, index) => (
            <View key={`${itemKey}-${index}`} style={styles.fieldRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.fieldTitleInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '28',
                    backgroundColor: colors.icon + '10',
                  },
                ]}
                placeholder="Field"
                placeholderTextColor={colors.icon}
                value={field.title}
                onChangeText={(value) =>
                  setDraft((current) => ({
                    ...current,
                    customFields: current.customFields.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            title: value,
                          }
                        : item
                    ),
                  }))
                }
              />
              <TextInput
                style={[
                  styles.input,
                  styles.fieldValueInput,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '28',
                    backgroundColor: colors.icon + '10',
                  },
                ]}
                placeholder="Value"
                placeholderTextColor={colors.icon}
                value={field.value}
                onChangeText={(value) =>
                  setDraft((current) => ({
                    ...current,
                    customFields: current.customFields.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            value,
                          }
                        : item
                    ),
                  }))
                }
              />
              <Pressable
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    customFields: current.customFields.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
                style={({ pressed }) => [
                  styles.removeButton,
                  {
                    borderColor: colors.icon + '28',
                    backgroundColor: colors.icon + '10',
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <ThemedText style={{ color: colors.icon }}>X</ThemedText>
              </Pressable>
            </View>
          ))
        ) : (
          <ThemedText style={{ color: colors.icon }}>No custom fields yet.</ThemedText>
        )}
      </View>

      <Modal
        visible={progressSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProgressSheetVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProgressSheetVisible(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.progressSheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 18,
                height: Math.max(220, Dimensions.get('window').height * 0.25),
              },
            ]}
          >
            <View style={styles.progressSheetBody}>
              <ThemedText style={{ color: colors.icon }}>
                Total {progressTotalLabel}: {progressTotal ?? '-'}
              </ThemedText>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() =>
                    setSheetCurrent((current) => {
                      const nextValue =
                        current === null ? null : clampTrackedValue(current - 1, progressTotal);
                      setSheetCurrentText(nextValue !== null ? String(nextValue) : '');
                      return nextValue;
                    })
                  }
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.icon + '28', backgroundColor: colors.icon + '10' },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">-</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setEditingSheetCurrent(true)}
                  style={[
                    styles.stepperValue,
                    { borderColor: colors.icon + '28', backgroundColor: colors.icon + '10' },
                  ]}
                >
                  {editingSheetCurrent ? (
                    <TextInput
                      autoFocus
                      keyboardType="numeric"
                      value={sheetCurrentText}
                      onChangeText={setSheetCurrentText}
                      onBlur={applyTypedCurrent}
                      onSubmitEditing={applyTypedCurrent}
                      style={[styles.stepperValueInput, { color: colors.text }]}
                      placeholder="-"
                      placeholderTextColor={colors.icon}
                    />
                  ) : (
                    <ThemedText type="defaultSemiBold">
                      {sheetCurrent === null ? '-' : sheetCurrent}
                    </ThemedText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() =>
                    setSheetCurrent((current) => {
                      const baseValue = current ?? 0;
                      const nextValue = clampTrackedValue(baseValue + 1, progressTotal);
                      setSheetCurrentText(String(nextValue));
                      return nextValue;
                    })
                  }
                  style={[
                    styles.stepperButton,
                    { borderColor: colors.icon + '28', backgroundColor: colors.icon + '10' },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">+</ThemedText>
                </Pressable>
              </View>
              <Pressable
                onPress={updateTrackedProgress}
                style={({ pressed }) => [
                  styles.updateButton,
                  {
                    backgroundColor: colors.tint,
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
              >
                <ThemedText style={{ color: colors.background, fontWeight: '700' }}>
                  Update
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 10,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  totalInput: {
    minWidth: 132,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressCardText: {
    gap: 4,
  },
  fieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fieldList: {
    gap: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldTitleInput: {
    flex: 1,
  },
  fieldValueInput: {
    flex: 1.25,
  },
  removeButton: {
    minWidth: 40,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  progressSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  progressSheetBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 18,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  stepperValueInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 0,
  },
  updateButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
