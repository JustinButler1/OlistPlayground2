import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useItemUserData } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRatingValue } from '@/lib/tracker-metadata';

const RATING_STEP = 0.25;
const RATING_MAX = 5;

function clampRating(value: number): number {
  const stepped = Math.round(value / RATING_STEP) * RATING_STEP;
  return Math.min(Math.max(stepped, 0), RATING_MAX);
}

export default function RatingSheet() {
  const params = useLocalSearchParams<{ itemKey: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const itemKey = params.itemKey;
  const { itemUserData, setItemUserData } = useItemUserData(itemKey);

  const originalRating = itemUserData.rating ?? null;
  const [sheetRating, setSheetRating] = useState<number | null>(originalRating);
  const [sheetRatingText, setSheetRatingText] = useState(
    originalRating !== null ? formatRatingValue(originalRating) : ''
  );
  const [editing, setEditing] = useState(false);

  const hasChanged = sheetRating !== originalRating;

  const applyTypedRating = useCallback(() => {
    if (!sheetRatingText.trim()) {
      setSheetRating(null);
      setEditing(false);
      return;
    }
    const parsed = Number(sheetRatingText);
    if (!Number.isFinite(parsed)) {
      setSheetRatingText(sheetRating !== null ? formatRatingValue(sheetRating) : '');
      setEditing(false);
      return;
    }
    const clamped = clampRating(parsed);
    setSheetRating(clamped === 0 ? null : clamped);
    setSheetRatingText(clamped === 0 ? '' : formatRatingValue(clamped));
    setEditing(false);
  }, [sheetRatingText, sheetRating]);

  const handleConfirm = useCallback(() => {
    if (!hasChanged) return;
    setItemUserData({
      ...itemUserData,
      rating: sheetRating ?? undefined,
      updatedAt: Date.now(),
    });
    router.back();
  }, [hasChanged, itemUserData, setItemUserData, sheetRating]);

  const handleReset = useCallback(() => {
    setSheetRating(originalRating);
    setSheetRatingText(originalRating !== null ? formatRatingValue(originalRating) : '');
    setEditing(false);
  }, [originalRating]);

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
              <ThemedText style={{ fontSize: 24, fontWeight: '600' }}>✕</ThemedText>
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
                ✓
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingHorizontal: 24,
        }}
      >
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ThemedText style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
            Rating
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
            MAX: 5
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
              setSheetRating((current) => {
                const base = current ?? 0;
                const next = clampRating(base - RATING_STEP);
                const value = next <= 0 ? null : next;
                setSheetRatingText(value !== null ? formatRatingValue(value) : '');
                return value;
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
                keyboardType="decimal-pad"
                value={sheetRatingText}
                onChangeText={setSheetRatingText}
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
                style={{ fontSize: 40, lineHeight: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}
              >
                {sheetRating === null ? '-' : formatRatingValue(sheetRating)}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setSheetRating((current) => {
                const base = current ?? 0;
                const next = clampRating(base + RATING_STEP);
                setSheetRatingText(formatRatingValue(next));
                return next;
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
          <ThemedText style={{ fontWeight: '300', fontSize: 20, lineHeight: 20, color: hasChanged ? colors.text : colors.icon + '40' }}>Reset</ThemedText>
        </Pressable>
      </View>
    </>
  );
}
