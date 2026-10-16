import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, Pressable, TouchableWithoutFeedback, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RatingInput } from '@/components/tracker/RatingInput';
import { Colors } from '@/constants/theme';
import { useItemUserData } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RatingSheet() {
  const params = useLocalSearchParams<{ itemKey: string; entryId?: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const itemKey = params.itemKey;
  const { itemUserData, setItemUserData } = useItemUserData(itemKey, params.entryId);

  const originalRating = itemUserData.rating ?? null;
  const [sheetRating, setSheetRating] = useState<number | null>(originalRating);
  const [resetKey, setResetKey] = useState(0);
  const [editing, setEditing] = useState(false);

  const hasChanged = sheetRating !== originalRating;

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
    setResetKey((current) => current + 1);
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

          <RatingInput
            value={sheetRating}
            onChange={setSheetRating}
            onEditingChange={setEditing}
            resetKey={resetKey}
          />

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
    </>
  );
}
