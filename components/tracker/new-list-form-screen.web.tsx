import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { NewListFormController } from '@/components/tracker/use-new-list-form';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getListEntryTypeLabel,
  LIST_ENTRY_TYPE_OPTIONS,
} from '@/lib/list-config-options';

interface NewListFormScreenProps {
  form: NewListFormController;
  openAddons?: () => void;
  openAutomation?: () => void;
  openCustomFields?: () => void;
}

type MenuKey = 'template' | 'entry-type' | `field-kind:${string}` | null;
type ThemeColors = (typeof Colors)[keyof typeof Colors];

export function NewListFormScreen({
  form,
  openAddons,
  openAutomation,
  openCustomFields,
}: NewListFormScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [expandedMenu, setExpandedMenu] = useState<MenuKey>(null);

  const templateOptions = useMemo(
    () =>
      form.listTemplates.map((template) => ({
        key: template.id,
        label: `${template.title} (${template.source})`,
        onPress: () => {
          form.selectTemplate(template.id);
          setExpandedMenu(null);
        },
      })),
    [form]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <TextField
          colors={colors}
          placeholder="Title"
          value={form.title}
          onChangeText={form.setTitle}
          autoFocus
        />
        <TextField
          colors={colors}
          placeholder="Description (optional)"
          value={form.description}
          onChangeText={form.setDescription}
          multiline
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Source</ThemedText>
        <View style={styles.segmentedRow}>
          <SegmentButton
            active={form.createMode === 'scratch'}
            colors={colors}
            label="Scratch"
            onPress={() => form.setCreateMode('scratch')}
          />
          <SegmentButton
            active={form.createMode === 'template'}
            colors={colors}
            label="Template"
            onPress={() => form.setCreateMode('template')}
          />
        </View>

        {form.createMode === 'template' ? (
          templateOptions.length ? (
            <SelectionBlock
              colors={colors}
              expanded={expandedMenu === 'template'}
              label="Template"
              value={
                form.selectedTemplate
                  ? `${form.selectedTemplate.title} (${form.selectedTemplate.source})`
                  : 'Choose a template'
              }
              options={templateOptions}
              onToggle={() =>
                setExpandedMenu((current) => (current === 'template' ? null : 'template'))
              }
            />
          ) : (
            <ThemedText style={{ color: colors.icon }}>No templates are available yet.</ThemedText>
          )
        ) : null}
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Setup</ThemedText>
        <SelectionBlock
          colors={colors}
          expanded={expandedMenu === 'entry-type'}
          label="Default item type"
          value={getListEntryTypeLabel(form.draftConfig.defaultEntryType)}
          options={LIST_ENTRY_TYPE_OPTIONS.map((option) => ({
            key: option.value,
            label: option.label,
            onPress: () => {
              form.setDefaultEntryType(option.value);
              setExpandedMenu(null);
            },
          }))}
          onToggle={() =>
            setExpandedMenu((current) => (current === 'entry-type' ? null : 'entry-type'))
          }
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Customization</ThemedText>
        <View style={[styles.card, { borderColor: colors.icon + '25', backgroundColor: colors.background }]}>
          <Pressable onPress={openAddons} style={styles.customizationRow}>
            <ThemedText>Add-ons</ThemedText>
            <View style={styles.customizationTrailing}>
              <ThemedText style={{ color: colors.icon }}>
                {String(form.draftConfig.addons.length)}
              </ThemedText>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </View>
          </Pressable>
          <Pressable onPress={openAutomation} style={styles.customizationRow}>
            <ThemedText>Programming</ThemedText>
            <View style={styles.customizationTrailing}>
              <ThemedText style={{ color: colors.icon }}>
                {String(form.draftConfig.automationBlocks.length)}
              </ThemedText>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </View>
          </Pressable>
          <Pressable onPress={openCustomFields} style={styles.customizationRow}>
            <ThemedText>Custom fields</ThemedText>
            <View style={styles.customizationTrailing}>
              <ThemedText style={{ color: colors.icon }}>
                {String(form.draftConfig.fieldDefinitions.length)}
              </ThemedText>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <ThemedText type="defaultSemiBold">Save setup as template</ThemedText>
          <Switch value={form.saveAsTemplate} onValueChange={form.setSaveAsTemplate} />
        </View>

        {form.saveAsTemplate ? (
          <View style={styles.section}>
            <TextField
              colors={colors}
              placeholder="Template title"
              value={form.templateTitle}
              onChangeText={form.setTemplateTitle}
            />
            <TextField
              colors={colors}
              placeholder="Template description"
              value={form.templateDescription}
              onChangeText={form.setTemplateDescription}
              multiline
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function TextField({
  colors,
  multiline,
  ...props
}: {
  colors: ThemeColors;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  multiline?: boolean;
}) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      placeholderTextColor={colors.icon}
      style={[
        styles.input,
        {
          backgroundColor: colors.icon + '10',
          borderColor: colors.icon + '30',
          color: colors.text,
        },
        multiline ? styles.multilineInput : null,
      ]}
    />
  );
}

function SegmentButton({
  active,
  colors,
  label,
  onPress,
}: {
  active: boolean;
  colors: ThemeColors;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        {
          backgroundColor: active ? colors.tint : colors.icon + '10',
        },
      ]}
    >
      <ThemedText style={{ color: active ? colors.background : colors.text }}>{label}</ThemedText>
    </Pressable>
  );
}

function SelectionBlock({
  colors,
  expanded,
  label,
  value,
  options,
  onToggle,
}: {
  colors: ThemeColors;
  expanded: boolean;
  label: string;
  value: string;
  options: { key: string; label: string; onPress: () => void }[];
  onToggle: () => void;
}) {
  return (
    <View style={styles.selectionBlock}>
      <Pressable
        onPress={onToggle}
        style={[
          styles.selectionRow,
          {
            borderColor: colors.icon + '25',
            backgroundColor: colors.icon + '10',
          },
        ]}
      >
        <View style={styles.selectionText}>
          <ThemedText>{label}</ThemedText>
          <ThemedText style={{ color: colors.icon }}>{value}</ThemedText>
        </View>
        <IconSymbol name={expanded ? 'chevron.up' : 'chevron.down'} size={18} color={colors.icon} />
      </Pressable>

      {expanded ? (
        <View
          style={[
            styles.selectionOptions,
            {
              borderColor: colors.icon + '25',
              backgroundColor: colors.background,
            },
          ]}
        >
          {options.map((option) => (
            <Pressable key={option.key} onPress={option.onPress} style={styles.selectionOption}>
              <ThemedText>{option.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    paddingVertical: 11,
  },
  selectionBlock: {
    gap: 8,
  },
  selectionRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectionText: {
    flex: 1,
    gap: 2,
  },
  selectionOptions: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 8,
  },
  selectionOption: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  customizationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  customizationTrailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  fieldCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default NewListFormScreen;
