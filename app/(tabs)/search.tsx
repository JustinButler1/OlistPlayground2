import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useEntryActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  catalogAdapters,
  searchCatalog,
  type CatalogCategory,
  type CatalogSearchItem,
} from '@/services/catalog';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { buildSeededDetailHref } from '@/lib/detail-navigation';
import {
  CatalogSearchResultRow,
  CATALOG_SEARCH_RESULT_ROW_GAP,
} from '@/components/tracker/catalog-search-result-row';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeLists } = useListsQuery();
  const { addEntryToList } = useEntryActions();
  const [category, setCategory] = useState<CatalogCategory>('anime');
  const [query, setQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(query);
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingItem, setPendingItem] = useState<CatalogSearchItem | null>(null);

  useEffect(() => {
    const trimmed = deferredSearchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const timeout = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      void searchCatalog(category, trimmed)
        .then((items) => {
          if (!active) {
            return;
          }

          setResults(items);
        })
        .catch((searchError) => {
          if (!active) {
            return;
          }

          if (
            searchError instanceof Error &&
            searchError.message === 'missing_tmdb_api_key'
          ) {
            setError('TMDB is not configured in this build environment.');
          } else {
            setError('Search failed. Check your connection and try again.');
          }
          setResults([]);
        })
        .finally(() => {
          if (active) {
            setIsLoading(false);
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [category, deferredSearchQuery]);

  const visibleLists = useMemo(
    () => activeLists.filter((list) => !list.archivedAt),
    [activeLists]
  );

  const categoryLabel =
    catalogAdapters.find((adapter) => adapter.id === category)?.label ?? 'Anime';

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.searchBar,
            {
              borderColor: colors.icon + '30',
              backgroundColor: colors.icon + '12',
            },
          ]}
        >
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.icon}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [
            styles.categoryButton,
            {
              borderColor: colors.icon + '30',
              backgroundColor: colors.background,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <View>
            <ThemedText style={styles.categoryLabel}>Source</ThemedText>
            <ThemedText style={{ color: colors.icon }}>{categoryLabel}</ThemedText>
          </View>
          <IconSymbol name="chevron.down" size={18} color={colors.icon} />
        </Pressable>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        ) : null}
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        {!query.trim() && !isLoading ? (
          <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
            Search anime, manga, books, TV, or movies.
          </ThemedText>
        ) : null}

        {query.trim() && !isLoading && !error && results.length === 0 ? (
          <ThemedText style={[styles.placeholder, { color: colors.icon }]}>
            No results for &quot;{query}&quot;.
          </ThemedText>
        ) : null}

        <View style={styles.results}>
          {results.map((item) => (
            <CatalogSearchResultRow
              key={`${item.type}-${item.id}`}
              item={item}
              href={
                item.detailPath
                  ? buildSeededDetailHref(item.detailPath, {
                      title: item.title,
                      subtitle: item.subtitle,
                      imageUrl: item.imageUrl,
                      imageVariant: 'poster',
                    })
                  : undefined
              }
              rightAccessory={
                <Pressable
                  onPress={() => setPendingItem(item)}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      borderColor: colors.tint,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.title} to list`}
                >
                  <IconSymbol name="plus" size={22} color={colors.tint} />
                </Pressable>
              }
            />
          ))}
        </View>
      </ScrollView>

      <SelectionMenu
        visible={pickerVisible}
        title="Search source"
        options={catalogAdapters.map((adapter) => ({
          value: adapter.id,
          label: adapter.label,
        }))}
        selectedValue={category}
        onClose={() => setPickerVisible(false)}
        onSelect={(value) => {
          setCategory(value as CatalogCategory);
          setPickerVisible(false);
        }}
      />

      <Modal
        visible={!!pendingItem}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingItem(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPendingItem(null)}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + '20',
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText type="subtitle">Choose a list</ThemedText>
            <View style={styles.modalContent}>
              {visibleLists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => {
                    if (!pendingItem) {
                      return;
                    }
                    addEntryToList(list.id, {
                      title: pendingItem.title,
                      type: pendingItem.type,
                      imageUrl: pendingItem.imageUrl,
                      detailPath: pendingItem.detailPath,
                      sourceRef: pendingItem.sourceRef,
                      rating: pendingItem.rating,
                      progress:
                        pendingItem.totalProgress && pendingItem.progressUnit
                          ? {
                              current: undefined,
                              total: pendingItem.totalProgress,
                              unit: pendingItem.progressUnit,
                              updatedAt: Date.now(),
                            }
                          : undefined,
                    });
                    setPendingItem(null);
                  }}
                  style={({ pressed }) => [
                    styles.listOption,
                    {
                      borderColor: colors.icon + '20',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.listOptionText}>
                    <ThemedText type="defaultSemiBold">{list.title}</ThemedText>
                    <ThemedText style={{ color: colors.icon }}>
                      {list.entries.filter((entry) => !entry.archivedAt).length} items
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: colors.tint }}>Use</ThemedText>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SelectionMenu({
  visible,
  title,
  options,
  selectedValue,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.menuCard,
            {
              backgroundColor: colors.background,
              borderColor: colors.icon + '30',
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText type="subtitle">{title}</ThemedText>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.menuOption,
                {
                  opacity: pressed ? 0.75 : 1,
                  backgroundColor:
                    selectedValue === option.value ? colors.tint + '14' : 'transparent',
                },
              ]}
            >
              <ThemedText>{option.label}</ThemedText>
              {selectedValue === option.value ? (
                <IconSymbol name="checkmark" size={18} color={colors.tint} />
              ) : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: 12,
  },
  categoryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  placeholder: {
    fontSize: 15,
  },
  errorText: {
    color: '#cc3f3f',
  },
  results: {
    gap: CATALOG_SEARCH_RESULT_ROW_GAP,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  menuOption: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(8, 12, 20, 0.45)',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalContent: {
    gap: 10,
  },
  listOption: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  listOptionText: {
    flex: 1,
    gap: 3,
  },
});
