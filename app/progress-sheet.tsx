import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useItemUserData } from '@/contexts/lists-context';
import type { EntryProgressUnit } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getProgressUnitLabel,
  normalizeProgress,
} from '@/lib/tracker-metadata';

function clampTrackedValue(value: number, total?: number): number {
  const rounded = Math.round(value);
  const upperBound = total ?? Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(rounded, 0), upperBound);
}

const isIos = process.env.EXPO_OS === 'ios';
const progressInputAccessoryId = 'progress-sheet-current-input-accessory';

export default function ProgressSheet() {
  const params = useLocalSearchParams<{
    itemKey: string;
    entryId?: string;
    label: string;
    unit: EntryProgressUnit;
    total: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const itemKey = params.itemKey;
  const label = params.label || 'Episodes';
  const unit = (params.unit as EntryProgressUnit) || 'episode';
  const total = params.total ? Number(params.total) : undefined;

  const { itemUserData, setItemUserData } = useItemUserData(itemKey, params.entryId);

  const effectiveProgress = useMemo(
    () =>
      normalizeProgress({
        current: itemUserData.progress?.current,
        total: itemUserData.progress?.total ?? total,
        unit: itemUserData.progress?.unit ?? unit,
        label: itemUserData.progress?.label ?? label,
        updatedAt: itemUserData.progress?.updatedAt ?? Date.now(),
      }),
    [itemUserData.progress, label, total, unit]
  );

  const originalCurrent = effectiveProgress?.current ?? null;
  const [sheetCurrent, setSheetCurrent] = useState<number | null>(originalCurrent);
  const [sheetCurrentText, setSheetCurrentText] = useState(
    originalCurrent !== null ? String(originalCurrent) : ''
  );
  const [editing, setEditing] = useState(false);

  const hasChanged = sheetCurrent !== originalCurrent;

  const totalLabel = getProgressUnitLabel(unit, 'long', label);

  const applyTypedCurrent = useCallback(() => {
    if (!sheetCurrentText.trim()) {
      setSheetCurrent(null);
      setEditing(false);
      return;
    }
    const parsed = Number(sheetCurrentText);
    if (!Number.isFinite(parsed)) {
      setSheetCurrentText(sheetCurrent !== null ? String(sheetCurrent) : '');
      setEditing(false);
      return;
    }
    const clamped = clampTrackedValue(parsed, total);
    setSheetCurrent(clamped);
    setSheetCurrentText(String(clamped));
    setEditing(false);
  }, [sheetCurrentText, sheetCurrent, total]);

  const handleConfirm = useCallback(() => {
    if (!hasChanged) return;
    setItemUserData({
      ...itemUserData,
      progress: normalizeProgress({
        current: sheetCurrent ?? undefined,
        total: itemUserData.progress?.total ?? total,
        unit: unit,
        label: label,
        updatedAt: Date.now(),
      }),
      updatedAt: Date.now(),
    });
    router.back();
  }, [hasChanged, itemUserData, setItemUserData, sheetCurrent, total, unit, label]);

  const handleReset = useCallback(() => {
    setSheetCurrent(originalCurrent);
    setSheetCurrentText(originalCurrent !== null ? String(originalCurrent) : '');
    setEditing(false);
  }, [originalCurrent]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <ThemedText style={{ fontSize: 24, fontWeight: '600' }}>{'\u2715'}</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleConfirm}
              disabled={!hasChanged}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <ThemedText
                style={{
                  fontSize: 24,
                  fontWeight: '600',
                  color: hasChanged ? colors.text : colors.icon + '40',
                }}
              >
                {'\u2713'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: editing ? 'flex-start' : 'space-evenly',
            paddingHorizontal: 24,
            paddingTop: editing ? 96 : 0,
            paddingBottom: editing ? 24 : 0,
            gap: editing ? 32 : 0,
          }}
        >
          <View style={{ alignItems: 'center', gap: 12 }}>
            <ThemedText style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
              {label}
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                fontWeight: '400',
                letterSpacing: 2,
                color: colors.icon,
                textAlign: 'center',
              }}
            >
              TOTAL {totalLabel.toUpperCase()}: {total ?? '-'}
            </ThemedText>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              width: '100%',
            }}
          >
            <Pressable
              onPress={() =>
                setSheetCurrent((current) => {
                  const nextValue =
                    current === null ? null : clampTrackedValue(current - 1, total);
                  setSheetCurrentText(nextValue !== null ? String(nextValue) : '');
                  return nextValue;
                })
              }
              style={{
                width: 76,
                height: 76,
                borderWidth: 1,
                borderRadius: 56,
                borderColor: colors.icon + '28',
                backgroundColor: colors.icon + '10',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSymbol name="minus" size={32} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={() => setEditing(true)}
              style={{
                flex: 1,
                minHeight: 72,
                borderWidth: 1,
                borderRadius: 20,
                borderColor: colors.icon + '28',
                backgroundColor: colors.icon + '10',
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
              }}
            >
              {editing ? (
                <TextInput
                  autoFocus
                  keyboardType="numeric"
                  inputAccessoryViewID={isIos ? progressInputAccessoryId : undefined}
                  returnKeyType="done"
                  value={sheetCurrentText}
                  onChangeText={setSheetCurrentText}
                  onBlur={applyTypedCurrent}
                  onSubmitEditing={applyTypedCurrent}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 40,
                    lineHeight: 42,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                    color: colors.text,
                    paddingVertical: 0,
                  }}
                  placeholder="-"
                  placeholderTextColor={colors.icon}
                />
              ) : (
                <ThemedText
                  style={{
                    fontSize: 40,
                    lineHeight: 40,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {sheetCurrent === null ? '-' : sheetCurrent}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                setSheetCurrent((current) => {
                  const baseValue = current ?? 0;
                  const nextValue = clampTrackedValue(baseValue + 1, total);
                  setSheetCurrentText(String(nextValue));
                  return nextValue;
                })
              }
              style={{
                width: 76,
                height: 76,
                borderWidth: 1,
                borderRadius: 56,
                borderColor: colors.icon + '28',
                backgroundColor: colors.icon + '10',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconSymbol name="plus" size={32} color={colors.text} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleReset}
            style={({ pressed }) => ({
              width: '100%',
              minHeight: 56,
              borderRadius: 16,
              borderCurve: 'continuous',
              backgroundColor: hasChanged ? colors.icon + '18' : colors.icon + '08',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ThemedText
              style={{
                fontWeight: '300',
                fontSize: 20,
                lineHeight: 20,
                color: hasChanged ? colors.text : colors.icon + '40',
              }}
            >
              Reset
            </ThemedText>
          </Pressable>
        </View>
      </TouchableWithoutFeedback>
      {isIos && editing ? (
        <InputAccessoryView nativeID={progressInputAccessoryId}>
          <View
            style={{
              alignItems: 'flex-end',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderTopWidth: 1,
              borderColor: colors.icon + '20',
              backgroundColor: colors.background,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                applyTypedCurrent();
                Keyboard.dismiss();
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ThemedText style={{ color: colors.tint, fontSize: 17, fontWeight: '600' }}>
                Done
              </ThemedText>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
}
