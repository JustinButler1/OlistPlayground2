import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useLists } from '@/contexts/lists-context';
import type { ListPreset } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ListItem {
  id: string;
  title: string;
}

export default function MyListsScreen() {
  const { lists, createList } = useLists();
  const items: ListItem[] = lists.map((l) => ({ id: l.id, title: l.title }));
  const [sheetVisible, setSheetVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [listPreset, setListPreset] = useState<ListPreset>('blank');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const navigation = useNavigation();

  const openSheet = useCallback(() => {
    setTitleInput('');
    setListPreset('blank');
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setTitleInput('');
  }, []);

  const confirmCreate = useCallback(() => {
    const trimmed = titleInput.trim();
    if (!trimmed) return;
    createList(trimmed, listPreset);
    closeSheet();
  }, [titleInput, listPreset, closeSheet, createList]);

  const openListDetail = useCallback(
    (item: ListItem) => {
      router.push({
        pathname: `/list/${item.id}`,
        params: { title: item.title },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <Pressable
        onPress={() => openListDetail(item)}
        style={({ pressed }) => [
          styles.resultRow,
          { opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
      >
        <Image
          source={require('../../assets/images/placeholder-thumbnail.png')}
          style={styles.resultPoster}
          contentFit="cover"
        />
        <View style={styles.resultInfo}>
          <ThemedText style={styles.resultTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
        </View>
        <IconSymbol
          name="chevron.right"
          size={24}
          color={colors.icon}
          style={styles.resultChevron}
        />
      </Pressable>
    ),
    [colors.icon, openListDetail]
  );

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={openSheet}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add list"
        >
          <IconSymbol name="plus" size={26} color={colors.tint} />
        </Pressable>
      ),
    });
  }, [navigation, openSheet, colors.tint]);

  return (
    <ThemedView style={styles.container}>
      {items.length === 0 ? (
        <ThemedText style={styles.placeholder}>
          Tap + to create a new list.
        </ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.modalOverlay} onPress={closeSheet}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 24,
                height: Dimensions.get('window').height * 0.95,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.icon + '30' }]}>
              <Pressable
                onPress={closeSheet}
                style={({ pressed }) => [
                  styles.sheetHeaderButton,
                  styles.sheetHeaderButtonLeft,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </Pressable>
              <ThemedText type="subtitle" style={styles.sheetTitle}>
                New list
              </ThemedText>
              <Pressable
                onPress={confirmCreate}
                style={({ pressed }) => [
                  styles.sheetHeaderButton,
                  styles.sheetHeaderButtonRight,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create"
              >
                <IconSymbol name="checkmark" size={24} color={colors.tint} />
              </Pressable>
            </View>
            <View style={styles.sheetBody}>
              <TextInput
                style={[
                  styles.titleInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.icon + '18',
                    borderColor: colors.icon + '40',
                  },
                ]}
                placeholder="Title"
                placeholderTextColor={colors.icon}
                value={titleInput}
                onChangeText={setTitleInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmCreate}
              />
              <ThemedText style={[styles.presetLabel, { color: colors.icon }]}>
                Preset
              </ThemedText>
              <View style={styles.presetRow}>
                <Pressable
                  onPress={() => setListPreset('blank')}
                  style={[
                    styles.presetOption,
                    {
                      borderColor: colors.icon + '40',
                      backgroundColor: listPreset === 'blank' ? colors.tint + '20' : colors.icon + '12',
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: listPreset === 'blank' }}
                  accessibilityLabel="Blank list"
                >
                  <ThemedText style={[styles.presetOptionText, { color: colors.text }]}>
                    Blank
                  </ThemedText>
                  <ThemedText style={[styles.presetOptionHint, { color: colors.icon }]}>
                    Standard list
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setListPreset('tracking')}
                  style={[
                    styles.presetOption,
                    {
                      borderColor: colors.icon + '40',
                      backgroundColor: listPreset === 'tracking' ? colors.tint + '20' : colors.icon + '12',
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: listPreset === 'tracking' }}
                  accessibilityLabel="Tracking list - show progress for chapters, volumes, episodes"
                >
                  <ThemedText style={[styles.presetOptionText, { color: colors.text }]}>
                    Tracking
                  </ThemedText>
                  <ThemedText style={[styles.presetOptionHint, { color: colors.icon }]}>
                    0/X for ep, ch, vol
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  placeholder: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  resultPoster: {
    width: 56,
    height: 80,
    borderRadius: 6,
  },
  posterPlaceholder: {
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultChevron: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderButton: {
    padding: 8,
    minWidth: 40,
  },
  sheetHeaderButtonLeft: {
    alignItems: 'flex-start',
  },
  sheetHeaderButtonRight: {
    alignItems: 'flex-end',
  },
  sheetTitle: {
    flex: 1,
    textAlign: 'center',
  },
  sheetBody: {
    padding: 20,
  },
  titleInput: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetLabel: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  presetOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  presetOptionHint: {
    fontSize: 12,
    marginTop: 2,
  },
});
