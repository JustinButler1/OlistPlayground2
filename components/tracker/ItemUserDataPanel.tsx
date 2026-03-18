import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useItemUserData } from '@/contexts/lists-context';
import type { CustomField, EntryProgressUnit, EntryStatus, ItemUserData } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LIST_STATUS_OPTIONS } from '@/lib/list-config-options';
import {
  formatProgressLabel,
  formatRatingValue,
  normalizeProgress,
} from '@/lib/tracker-metadata';

interface ItemProgressConfig {
  label: string;
  unit: EntryProgressUnit;
  total?: number;
  allowCustomTotal?: boolean;
}

interface ItemStatusConfig {
  entryId: string;
  listId: string;
  currentStatus?: EntryStatus;
}

interface ItemUserDataPanelProps {
  itemKey: string;
  showRating?: boolean;
  progressConfig?: ItemProgressConfig;
  statusConfig?: ItemStatusConfig;
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

function getStatusLabel(status?: EntryStatus): string {
  if (!status) return '-';
  return LIST_STATUS_OPTIONS.find((o) => o.value === status)?.label.toUpperCase() ?? status.toUpperCase();
}

function getProgressUnitAbbrev(unit: EntryProgressUnit, customLabel?: string): string {
  if (customLabel?.trim()) {
    return customLabel.trim().substring(0, 2).toUpperCase();
  }
  switch (unit) {
    case 'episode': return 'EP';
    case 'chapter': return 'CH';
    case 'volume': return 'VL';
    case 'percent': return '%';
    case 'item':
    default: return 'IT';
  }
}

function formatProgressPillLabel(
  progress: ReturnType<typeof normalizeProgress>,
  config?: ItemProgressConfig
): string {
  if (!progress && !config) return '-';
  const unit = progress?.unit ?? config?.unit;
  const customLabel = progress?.label ?? config?.label;
  const abbrev = unit ? getProgressUnitAbbrev(unit, customLabel) : '';
  const current = progress?.current !== undefined ? String(progress.current) : '-';
  const total = progress?.total ?? config?.total;
  if (unit === 'percent') return `${current}%`;
  if (total !== undefined) return `${current}/${total} ${abbrev}`;
  if (progress?.current !== undefined) return `${current} ${abbrev}`;
  return `-/- ${abbrev}`;
}

export function ItemUserDataPanel({
  itemKey,
  showRating = false,
  progressConfig,
  statusConfig,
}: ItemUserDataPanelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { itemUserData, setItemUserData } = useItemUserData(itemKey);
  const [draft, setDraft] = useState<ItemUserData>(() => cloneItemUserData(itemUserData));
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
    if (!progressConfig) return;
    const progressTotal = draft.progress?.total ?? progressConfig.total;
    router.push({
      pathname: '/progress-sheet',
      params: {
        itemKey,
        label: progressConfig.label ?? effectiveProgress?.label ?? 'Progress',
        unit: progressConfig.unit,
        ...(progressTotal !== undefined ? { total: String(progressTotal) } : {}),
      },
    });
  };

  const openRatingSheet = () => {
    router.push({
      pathname: '/rating-sheet',
      params: { itemKey },
    });
  };

  const openStatusSheet = () => {
    if (!statusConfig) return;
    router.push({
      pathname: '/status-sheet',
      params: {
        entryId: statusConfig.entryId,
        listId: statusConfig.listId,
        currentStatus: statusConfig.currentStatus ?? '',
      },
    });
  };

  const progressTotal = draft.progress?.total ?? progressConfig?.total;
  const progressDisplayLabel =
    effectiveProgress !== undefined ? formatProgressLabel(effectiveProgress) : null;
  const canShowProgress =
    !!progressConfig && (progressTotal !== undefined || progressConfig.allowCustomTotal);

  const showStatusPill = !!statusConfig;
  const showProgressPill = canShowProgress;
  const showRatingPill = showRating;
  const showPillRow = showStatusPill || showProgressPill || showRatingPill;

  const pillStyle = (pressed: boolean) => [
    styles.pill,
    {
      borderColor: colors.icon + '28',
      backgroundColor: colors.icon + '10',
      opacity: pressed ? 0.7 : 1,
    },
  ];

  return (
    <View style={styles.container}>
      {showPillRow ? (
        <View style={styles.pillRow}>
          {showStatusPill ? (
            <View style={styles.pillCol}>
              <Pressable
                onPress={openStatusSheet}
                style={({ pressed }) => pillStyle(pressed)}
              >
                <ThemedText style={styles.pillText}>
                  {getStatusLabel(statusConfig!.currentStatus)}
                </ThemedText>
              </Pressable>
              <ThemedText style={[styles.pillLabel, { color: colors.icon }]}>STATUS</ThemedText>
            </View>
          ) : null}
          {showProgressPill ? (
            <View style={styles.pillCol}>
              <Pressable
                disabled={progressTotal === undefined && !progressConfig?.allowCustomTotal}
                onPress={openProgressSheet}
                style={({ pressed }) => [
                  ...pillStyle(pressed),
                  progressTotal === undefined && !progressConfig?.allowCustomTotal
                    ? { opacity: 0.5 }
                    : {},
                ]}
              >
                <ThemedText style={styles.pillText}>
                  {formatProgressPillLabel(effectiveProgress, progressConfig)}
                </ThemedText>
              </Pressable>
              <ThemedText style={[styles.pillLabel, { color: colors.icon }]}>PROGRESS</ThemedText>
            </View>
          ) : null}
          {showRatingPill ? (
            <View style={styles.pillCol}>
              <Pressable
                onPress={openRatingSheet}
                style={({ pressed }) => pillStyle(pressed)}
              >
                <ThemedText style={styles.pillText}>
                  {draft.rating ? `${formatRatingValue(draft.rating)}/5` : '-'}
                  {' '}
                </ThemedText>
                <Text style={{ color: colors.tint, fontSize: 12 }}>★</Text>
              </Pressable>
              <ThemedText style={[styles.pillLabel, { color: colors.icon }]}>RATING</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {progressConfig?.allowCustomTotal && progressConfig.total === undefined ? (
        <TextInput
          style={[
            styles.input,
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pillLabel: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  pill: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
});
