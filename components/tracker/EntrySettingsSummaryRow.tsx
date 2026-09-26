import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { ListEntry } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface EntrySettingsSummaryRowProps {
  entry: ListEntry;
}

export function EntrySettingsSummaryRow({ entry }: EntrySettingsSummaryRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const typeLabel = entry.type[0].toUpperCase() + entry.type.slice(1);
  const sourceLabel =
    entry.sourceRef.source !== 'custom' && entry.sourceRef.source !== entry.type
      ? entry.sourceRef.source[0].toUpperCase() + entry.sourceRef.source.slice(1)
      : null;

  const hasLinkedList = !!entry.linkedListId || entry.detailPath?.startsWith('list/');
  const hasDetailPath = !!entry.detailPath && !hasLinkedList;

  const showDestination = hasLinkedList || hasDetailPath;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.chip, { backgroundColor: colors.icon + '14' }]}>
          <ThemedText style={[styles.chipText, { color: colors.icon }]}>
            {typeLabel}
          </ThemedText>
        </View>
        {sourceLabel ? (
          <View style={[styles.chip, { backgroundColor: colors.icon + '14' }]}>
            <ThemedText style={[styles.chipText, { color: colors.icon }]}>
              {sourceLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>
      {showDestination ? (
        <View style={[styles.destinationRow, { borderColor: colors.icon + '20' }]}>
          <IconSymbol
            name={hasLinkedList ? 'list.bullet' : 'arrow.up.right'}
            size={14}
            color={colors.icon}
          />
          <ThemedText style={[styles.destinationText, { color: colors.icon }]} numberOfLines={1}>
            {hasLinkedList ? 'Opens linked list' : 'Has detail view'}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  destinationText: {
    fontSize: 13,
    flex: 1,
  },
});
