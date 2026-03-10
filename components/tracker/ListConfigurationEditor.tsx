import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import type { ListAddonId, ListConfig, ListFieldDefinition, ListFieldKind } from '@/data/mock-lists';
import { createListConfig } from '@/data/mock-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getListEntryTypeLabel,
  getListFieldKindLabel,
  LIST_ADDON_OPTIONS,
  LIST_ENTRY_TYPE_OPTIONS,
  LIST_FIELD_KIND_OPTIONS,
} from '@/lib/list-config-options';

interface ListConfigurationEditorProps {
  config: ListConfig;
  onChange: (config: ListConfig) => void;
}

export function ListConfigurationEditor({
  config,
  onChange,
}: ListConfigurationEditorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [menuVisible, setMenuVisible] = useState<null | 'entry-type' | `field-kind:${string}`>(
    null
  );

  const updateConfig = (updater: (current: ListConfig) => ListConfig) => {
    onChange(createListConfig(updater(config)));
  };

  const toggleAddon = (addonId: ListAddonId) => {
    updateConfig((current) => {
      const isEnabled = current.addons.includes(addonId);
      const addons = isEnabled
        ? current.addons.filter((item) => item !== addonId)
        : [...current.addons, addonId];
      return {
        ...current,
        addons,
      };
    });
  };

  const addField = () => {
    updateConfig((current) => ({
      ...current,
      addons: current.addons.includes('custom-fields')
        ? current.addons
        : [...current.addons, 'custom-fields'],
      fieldDefinitions: [
        ...current.fieldDefinitions,
        {
          id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: '',
          kind: 'text',
        },
      ],
    }));
  };

  const updateField = (
    fieldId: string,
    updates: Partial<ListFieldDefinition>
  ) => {
    updateConfig((current) => ({
      ...current,
      fieldDefinitions: current.fieldDefinitions.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    }));
  };

  const removeField = (fieldId: string) => {
    updateConfig((current) => ({
      ...current,
      fieldDefinitions: current.fieldDefinitions.filter((field) => field.id !== fieldId),
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Default item type</ThemedText>
        <Pressable
          onPress={() => setMenuVisible('entry-type')}
          style={[
            styles.selectionRow,
            {
              borderColor: colors.icon + '30',
              backgroundColor: colors.icon + '10',
            },
          ]}
        >
          <ThemedText>{getListEntryTypeLabel(config.defaultEntryType)}</ThemedText>
          <IconSymbol name="chevron.down" size={18} color={colors.icon} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Add-ons</ThemedText>
        <View style={styles.addonList}>
          {LIST_ADDON_OPTIONS.map((addon) => {
            const enabled = config.addons.includes(addon.id);
            return (
              <Pressable
                key={addon.id}
                onPress={() => toggleAddon(addon.id)}
                style={[
                  styles.addonRow,
                  {
                    borderColor: colors.icon + '25',
                    backgroundColor: enabled ? colors.tint + '12' : colors.background,
                  },
                ]}
              >
                <View style={styles.addonText}>
                  <ThemedText>{addon.label}</ThemedText>
                  <ThemedText style={[styles.addonHint, { color: colors.icon }]}>
                    {addon.description}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: enabled ? colors.tint : colors.icon + '40',
                      backgroundColor: enabled ? colors.tint : 'transparent',
                    },
                  ]}
                >
                  {enabled ? (
                    <IconSymbol name="checkmark" size={14} color={colors.background} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Custom fields</ThemedText>
          <Pressable onPress={addField}>
            <ThemedText style={{ color: colors.tint }}>Add field</ThemedText>
          </Pressable>
        </View>
        {config.fieldDefinitions.length ? (
          <View style={styles.fieldList}>
            {config.fieldDefinitions.map((field) => (
              <View
                key={field.id}
                style={[
                  styles.fieldCard,
                  {
                    borderColor: colors.icon + '25',
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.fieldInput,
                    {
                      color: colors.text,
                      borderColor: colors.icon + '25',
                      backgroundColor: colors.icon + '10',
                    },
                  ]}
                  placeholder="Field label"
                  placeholderTextColor={colors.icon}
                  value={field.label}
                  onChangeText={(value) => updateField(field.id, { label: value })}
                />
                <View style={styles.fieldActions}>
                  <Pressable
                    onPress={() => setMenuVisible(`field-kind:${field.id}`)}
                    style={[
                      styles.kindButton,
                      {
                        borderColor: colors.icon + '25',
                        backgroundColor: colors.icon + '10',
                      },
                    ]}
                  >
                    <ThemedText>{getListFieldKindLabel(field.kind)}</ThemedText>
                    <IconSymbol name="chevron.down" size={16} color={colors.icon} />
                  </Pressable>
                  <Pressable
                    onPress={() => removeField(field.id)}
                    style={styles.removeButton}
                  >
                    <IconSymbol name="trash" size={18} color="#cc3f3f" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <ThemedText style={{ color: colors.icon }}>
            Add structured fields if you want templates like recipes, projects, or books.
          </ThemedText>
        )}
      </View>

      <SelectionMenu
        visible={menuVisible === 'entry-type'}
        title="Default item type"
        options={LIST_ENTRY_TYPE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        selectedValue={config.defaultEntryType}
        onClose={() => setMenuVisible(null)}
        onSelect={(value) => {
          updateConfig((current) => ({
            ...current,
            defaultEntryType: value as ListConfig['defaultEntryType'],
          }));
          setMenuVisible(null);
        }}
      />

      {config.fieldDefinitions.map((field) => (
        <SelectionMenu
          key={field.id}
          visible={menuVisible === `field-kind:${field.id}`}
          title={`Field type: ${field.label || 'Untitled field'}`}
          options={LIST_FIELD_KIND_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          selectedValue={field.kind}
          onClose={() => setMenuVisible(null)}
          onSelect={(value) => {
            updateField(field.id, { kind: value as ListFieldKind });
            setMenuVisible(null);
          }}
        />
      ))}
    </View>
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
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [
                  styles.menuOption,
                  {
                    opacity: pressed ? 0.78 : 1,
                    backgroundColor:
                      selectedValue === option.value ? colors.tint + '12' : 'transparent',
                  },
                ]}
              >
                <ThemedText>{option.label}</ThemedText>
                {selectedValue === option.value ? (
                  <IconSymbol name="checkmark" size={18} color={colors.tint} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addonList: {
    gap: 10,
  },
  addonRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  addonText: {
    flex: 1,
    gap: 4,
  },
  addonHint: {
    fontSize: 13,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldList: {
    gap: 10,
  },
  fieldCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  kindButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  menuCard: {
    maxHeight: '70%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  menuScroll: {
    maxHeight: 320,
  },
  menuOption: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
