import { useEffect, useId, useState } from 'react';
import { InputAccessoryView, Keyboard, Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRatingValue } from '@/lib/tracker-metadata';

const RATING_STEP = 0.25;
const isIos = process.env.EXPO_OS === 'ios';
const formatValue = (value: number | null) => (value === null ? '' : formatRatingValue(value));
const clampRating = (value: number) =>
  Math.min(Math.max(Math.round(value / RATING_STEP) * RATING_STEP, 0), 5);

type RatingInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  onEditingChange?: (editing: boolean) => void;
  /** Increment to discard pending text, even when the controlled value is unchanged. */
  resetKey?: number;
};

export function RatingInput({ value, onChange, onEditingChange, resetKey }: RatingInputProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const ratingInputAccessoryId = useId();
  const [ratingText, setRatingText] = useState(() => formatValue(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setRatingText(formatValue(value));
  }, [value]);

  useEffect(() => {
    setRatingText(formatValue(value));
    setEditing(false);
    onEditingChange?.(false);
    // Reset is an explicit signal, including when the value has not changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function changeEditing(next: boolean) {
    setEditing(next);
    onEditingChange?.(next);
  }

  function stepRating(delta: number) {
    const next = clampRating((value ?? 0) + delta) || null;
    setRatingText(formatValue(next));
    onChange(next);
  }

  function applyTypedRating() {
    const parsed = Number(ratingText);
    if (Number.isFinite(parsed)) {
      const next = clampRating(parsed) || null;
      setRatingText(formatValue(next));
      onChange(next);
    } else {
      setRatingText(formatValue(value));
    }
    changeEditing(false);
  }

  return (
    <>
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
          onPress={() => stepRating(-RATING_STEP)}
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
          onPress={() => changeEditing(true)}
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
              keyboardType="decimal-pad"
              inputAccessoryViewID={isIos ? ratingInputAccessoryId : undefined}
              returnKeyType="done"
              value={ratingText}
              onChangeText={setRatingText}
              onBlur={applyTypedRating}
              onSubmitEditing={applyTypedRating}
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: 40,
                lineHeight: 40,
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
              {value === null ? '-' : formatRatingValue(value)}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          onPress={() => stepRating(RATING_STEP)}
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

      {isIos && editing ? (
        <InputAccessoryView nativeID={ratingInputAccessoryId}>
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
                applyTypedRating();
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
