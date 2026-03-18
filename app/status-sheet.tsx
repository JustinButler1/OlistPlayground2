import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { EntryStatus } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEntryActions } from '@/contexts/lists-context';
import { LIST_STATUS_OPTIONS } from '@/lib/list-config-options';

export default function StatusSheet() {
  const params = useLocalSearchParams<{
    entryId: string;
    listId: string;
    currentStatus: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { updateEntry } = useEntryActions();

  const entryId = params.entryId;
  const listId = params.listId;
  const originalStatus = (params.currentStatus as EntryStatus) || undefined;
  const [selected, setSelected] = useState<EntryStatus | undefined>(originalStatus);

  const hasChanged = selected !== originalStatus;

  const handleConfirm = useCallback(() => {
    if (!hasChanged || !entryId || !listId) return;
    updateEntry(listId, entryId, { status: selected });
    router.back();
  }, [hasChanged, entryId, listId, selected, updateEntry]);

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
        <ThemedText style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
          Status
        </ThemedText>

        <View style={{ width: '100%', gap: 8 }}>
          {LIST_STATUS_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setSelected(option.value)}
                style={({ pressed }) => ({
                  width: '100%',
                  minHeight: 56,
                  borderWidth: 1,
                  borderRadius: 16,
                  borderCurve: 'continuous',
                  borderColor: isSelected ? colors.tint : colors.icon + '28',
                  backgroundColor: isSelected ? colors.tint + '18' : colors.icon + '10',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <ThemedText
                  style={{
                    fontSize: 18,
                    fontWeight: isSelected ? '700' : '400',
                    color: isSelected ? colors.tint : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 56 }} />
      </View>
    </>
  );
}
