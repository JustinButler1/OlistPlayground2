import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SelectionRow } from '@/components/tracker/selection-row';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import type { ListPrivacy } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PRIVACY_OPTIONS: { label: string; value: ListPrivacy }[] = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Password', value: 'password' },
];

export default function ListSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { updateList } = useListActions();
  const list = activeLists.find((item) => item.id === id) ?? null;
  const privacy = list?.privacy ?? 'public';
  const selectedPrivacy = PRIVACY_OPTIONS.find((option) => option.value === privacy);

  return (
    <>
      <Stack.Screen options={{ title: list ? `${list.title} Settings` : 'List Settings' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText type="subtitle">Privacy</ThemedText>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '20',
              },
            ]}
          >
            {list ? (
              <SelectionRow
                title="Privacy"
                value={selectedPrivacy?.label ?? 'Public'}
                options={PRIVACY_OPTIONS}
                selectedValue={privacy}
                onValueChange={(value) => {
                  void updateList(list.id, { privacy: value as ListPrivacy });
                }}
              />
            ) : (
              <ThemedText style={{ color: colors.icon }}>This list could not be found.</ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    gap: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  section: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
});
