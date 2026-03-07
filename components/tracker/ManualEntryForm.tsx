import { useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type {
  EntryProgressUnit,
  EntryStatus,
  ListEntry,
  ListEntryType,
} from '@/data/mock-lists';
import type { EntryDraft } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ManualEntryFormProps {
  onSubmit: (draft: EntryDraft) => void;
  submitLabel?: string;
  initialEntry?: ListEntry | null;
}

const STATUS_OPTIONS: EntryStatus[] = ['planned', 'active', 'paused', 'completed', 'dropped'];
const TYPE_OPTIONS: ListEntryType[] = ['custom', 'book', 'anime', 'manga', 'movie', 'tv', 'link'];
const PROGRESS_UNIT_OPTIONS: EntryProgressUnit[] = [
  'item',
  'episode',
  'chapter',
  'volume',
  'percent',
];

export function ManualEntryForm({
  onSubmit,
  submitLabel = 'Add entry',
  initialEntry,
}: ManualEntryFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [type, setType] = useState<ListEntryType>(initialEntry?.type ?? 'custom');
  const [status, setStatus] = useState<EntryStatus>(initialEntry?.status ?? 'planned');
  const [notes, setNotes] = useState(initialEntry?.notes ?? '');
  const [tagsText, setTagsText] = useState(initialEntry?.tags.join(', ') ?? '');
  const [ratingText, setRatingText] = useState(
    initialEntry?.rating ? String(initialEntry.rating) : ''
  );
  const [currentText, setCurrentText] = useState(
    initialEntry?.progress?.current !== undefined ? String(initialEntry.progress.current) : ''
  );
  const [totalText, setTotalText] = useState(
    initialEntry?.progress?.total !== undefined ? String(initialEntry.progress.total) : ''
  );
  const [progressUnit, setProgressUnit] = useState<EntryProgressUnit>(
    initialEntry?.progress?.unit ?? 'item'
  );
  const [coverAssetUri, setCoverAssetUri] = useState(initialEntry?.coverAssetUri);
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
    setStatus(initialEntry.status);
    setNotes(initialEntry.notes ?? '');
    setTagsText(initialEntry.tags.join(', '));
    setRatingText(initialEntry.rating ? String(initialEntry.rating) : '');
    setCurrentText(
      initialEntry.progress?.current !== undefined ? String(initialEntry.progress.current) : ''
    );
    setTotalText(
      initialEntry.progress?.total !== undefined ? String(initialEntry.progress.total) : ''
    );
    setProgressUnit(initialEntry.progress?.unit ?? 'item');
    setCoverAssetUri(initialEntry.coverAssetUri);
  }, [initialEntry]);

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
      setCoverAssetUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const current = Number(currentText);
    const total = Number(totalText);
    const rating = Number(ratingText);
    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSubmit({
      title: trimmedTitle,
      type,
      status,
      notes: notes.trim() || undefined,
      tags,
      rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
      progress:
        currentText.trim() || totalText.trim()
          ? {
              current: Number.isFinite(current) ? current : 0,
              total: Number.isFinite(total) && total > 0 ? total : undefined,
              unit: progressUnit,
              updatedAt: Date.now(),
            }
          : undefined,
      reminderAt,
      coverAssetUri,
      sourceRef: {
        source: type === 'game' ? 'custom' : type,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.coverRow}>
        <ThumbnailImage imageUrl={coverAssetUri} style={styles.coverPreview} />
        <View style={styles.coverActions}>
          <ThemedText type="defaultSemiBold">Custom cover</ThemedText>
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
        </View>
      </View>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.icon + '28',
            backgroundColor: colors.icon + '10',
          },
        ]}
        placeholder="Title"
        placeholderTextColor={colors.icon}
        value={title}
        onChangeText={setTitle}
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
        multiline
        placeholder="Notes"
        placeholderTextColor={colors.icon}
        value={notes}
        onChangeText={setNotes}
      />

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Type</ThemedText>
        <View style={styles.chipWrap}>
          {TYPE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: type === option ? colors.tint : colors.icon + '10',
                },
              ]}
            >
              <ThemedText
                style={{
                  color: type === option ? colors.background : colors.text,
                }}
              >
                {option}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Status</ThemedText>
        <View style={styles.chipWrap}>
          {STATUS_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setStatus(option)}
              style={[
                styles.chip,
                {
                  backgroundColor: status === option ? colors.tint : colors.icon + '10',
                },
              ]}
            >
              <ThemedText
                style={{
                  color: status === option ? colors.background : colors.text,
                }}
              >
                {option}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Progress</ThemedText>
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
        <View style={styles.chipWrap}>
          {PROGRESS_UNIT_OPTIONS.map((unit) => (
            <Pressable
              key={unit}
              onPress={() => setProgressUnit(unit)}
              style={[
                styles.chip,
                {
                  backgroundColor: progressUnit === unit ? colors.tint : colors.icon + '10',
                },
              ]}
            >
              <ThemedText
                style={{
                  color: progressUnit === unit ? colors.background : colors.text,
                }}
              >
                {unit}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

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
        placeholder="Rating (optional)"
        placeholderTextColor={colors.icon}
        value={ratingText}
        onChangeText={setRatingText}
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
        placeholder="Tags, separated by commas"
        placeholderTextColor={colors.icon}
        value={tagsText}
        onChangeText={setTagsText}
      />

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Reminder</ThemedText>
        <View style={styles.chipWrap}>
          {[1, 3, 7].map((days) => (
            <Pressable
              key={days}
              onPress={() => setReminderDays(days)}
              style={[
                styles.chip,
                {
                  backgroundColor: reminderDays === days ? colors.tint : colors.icon + '10',
                },
              ]}
            >
              <ThemedText
                style={{
                  color: reminderDays === days ? colors.background : colors.text,
                }}
              >
                {days === 1 ? 'Tomorrow' : `${days} days`}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setReminderDays(null)}
            style={[
              styles.chip,
              {
                backgroundColor: reminderDays === null ? colors.tint : colors.icon + '10',
              },
            ]}
          >
            <ThemedText
              style={{
                color: reminderDays === null ? colors.background : colors.text,
              }}
            >
              None
            </ThemedText>
          </Pressable>
        </View>
      </View>

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
