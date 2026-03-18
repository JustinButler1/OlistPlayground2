import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ItemDetailTabId = 'details' | 'my-data';

interface ItemDetailTabsProps {
  activeTab: ItemDetailTabId;
  onChange: (tab: ItemDetailTabId) => void;
}

const TABS: { id: ItemDetailTabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'my-data', label: 'My Data' },
];

export function ItemDetailTabs({ activeTab, onChange }: ItemDetailTabsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: colors.icon + '20',
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              styles.tab,
              active && {
                borderBottomColor: colors.tint,
              },
            ]}
          >
            <ThemedText
              type={active ? 'defaultSemiBold' : 'default'}
              style={{ color: active ? colors.tint : colors.icon }}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
});
