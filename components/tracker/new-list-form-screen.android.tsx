import { ContextMenu, ListItem, Picker } from '@expo/ui/jetpack-compose';
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { NewListImagePicker } from '@/components/tracker/new-list-image-picker';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { NewListFormController } from '@/components/tracker/use-new-list-form';
import { IconSymbol } from '@/components/ui/icon-symbol';
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

export function NewListFormScreen({
  form,
  openAddons,
  openAutomation,
  openCustomFields,
}: NewListFormScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <NewListImagePicker
          colors={colors}
          imageUrl={form.imageUrl}
          onPick={() => {
            void form.pickImage();
          }}
          onClear={form.clearImage}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Details</ThemedText>
        <FieldLabel>Title</FieldLabel>
        <TextInput
          autoFocus
          placeholder="Title"
          placeholderTextColor={colors.icon}
          style={[
            styles.textInput,
            { borderColor: colors.icon + '40', color: colors.text, backgroundColor: colors.background },
          ]}
          value={form.title}
          onChangeText={form.setTitle}
        />
        <FieldLabel>Description</FieldLabel>
        <TextInput
          multiline
          numberOfLines={3}
          placeholder="Description (optional)"
          placeholderTextColor={colors.icon}
          style={[
            styles.textInput,
            styles.multilineInput,
            { borderColor: colors.icon + '40', color: colors.text, backgroundColor: colors.background },
          ]}
          value={form.description}
          onChangeText={form.setDescription}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Source</ThemedText>
        <Picker
          options={['Scratch', 'Template']}
          selectedIndex={form.createMode === 'scratch' ? 0 : 1}
          onOptionSelected={({ nativeEvent }) =>
            form.setCreateMode(nativeEvent.index === 0 ? 'scratch' : 'template')
          }
          variant="segmented"
        />

        {form.createMode === 'template' ? (
          form.listTemplates.length ? (
            <SelectionRow
              title="Template"
              value={
                form.selectedTemplate
                  ? `${form.selectedTemplate.title} (${form.selectedTemplate.source})`
                  : 'Choose a template'
              }
              options={form.listTemplates.map((template) => ({
                label: `${template.title} (${template.source})`,
                onSelect: () => form.selectTemplate(template.id),
              }))}
            />
          ) : (
            <ThemedText style={styles.helpText}>No templates are available yet.</ThemedText>
          )
        ) : null}
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Setup</ThemedText>
        <SelectionRow
          title="Default item type"
          value={getListEntryTypeLabel(form.draftConfig.defaultEntryType)}
          options={LIST_ENTRY_TYPE_OPTIONS.map((option) => ({
            label: option.label,
            onSelect: () => form.setDefaultEntryType(option.value),
          }))}
          selectedIndex={LIST_ENTRY_TYPE_OPTIONS.findIndex(
            (option) => option.value === form.draftConfig.defaultEntryType
          )}
        />
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Customization</ThemedText>
        <View style={[styles.listSurface, { borderColor: colors.icon + '24', backgroundColor: colors.background }]}>
          <ListItem headline="Add-ons" onPress={openAddons}>
            <ListItem.Trailing>
              <View style={styles.trailingCluster}>
                <ThemedText style={styles.trailingCount}>
                  {String(form.draftConfig.addons.length)}
                </ThemedText>
                <IconSymbol name="chevron.right" size={18} color={colors.icon} />
              </View>
            </ListItem.Trailing>
          </ListItem>
          <ListItem headline="Programming" onPress={openAutomation}>
            <ListItem.Trailing>
              <View style={styles.trailingCluster}>
                <ThemedText style={styles.trailingCount}>
                  {String(form.draftConfig.automationBlocks.length)}
                </ThemedText>
                <IconSymbol name="chevron.right" size={18} color={colors.icon} />
              </View>
            </ListItem.Trailing>
          </ListItem>
          <ListItem headline="Custom fields" onPress={openCustomFields}>
            <ListItem.Trailing>
              <View style={styles.trailingCluster}>
                <ThemedText style={styles.trailingCount}>
                  {String(form.draftConfig.fieldDefinitions.length)}
                </ThemedText>
                <IconSymbol name="chevron.right" size={18} color={colors.icon} />
              </View>
            </ListItem.Trailing>
          </ListItem>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Template</ThemedText>
        <View style={[styles.listSurface, { borderColor: colors.icon + '24', backgroundColor: colors.background }]}>
          <ListItem headline="Save setup as template">
            <ListItem.Trailing>
              <Switch value={form.saveAsTemplate} onValueChange={form.setSaveAsTemplate} />
            </ListItem.Trailing>
          </ListItem>
        </View>

        {form.saveAsTemplate ? (
          <View style={styles.templateFields}>
            <FieldLabel>Template title</FieldLabel>
            <TextInput
              placeholderTextColor={colors.icon}
              style={[
                styles.textInput,
                { borderColor: colors.icon + '40', color: colors.text, backgroundColor: colors.background },
              ]}
              value={form.templateTitle}
              onChangeText={form.setTemplateTitle}
              placeholder="Template title"
            />
            <FieldLabel>Template description</FieldLabel>
            <TextInput
              placeholderTextColor={colors.icon}
              style={[
                styles.textInput,
                styles.multilineInput,
                { borderColor: colors.icon + '40', color: colors.text, backgroundColor: colors.background },
              ]}
              multiline
              numberOfLines={2}
              value={form.templateDescription}
              onChangeText={form.setTemplateDescription}
              placeholder="Template description"
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <ThemedText style={styles.fieldLabel}>{children}</ThemedText>;
}

function SelectionRow({
  title,
  value,
  options,
  selectedIndex = null,
}: {
  title: string;
  value: string;
  options: { label: string; onSelect: () => void }[];
  selectedIndex?: number | null;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <View style={[styles.listSurface, { borderColor: colors.icon + '24', backgroundColor: colors.background }]}>
          <ListItem headline={title} supportingText={value}>
            <ListItem.Trailing>
              <ThemedText style={styles.selectionAction}>Choose</ThemedText>
            </ListItem.Trailing>
          </ListItem>
        </View>
      </ContextMenu.Trigger>
      <ContextMenu.Items>
        <Picker
          options={options.map((option) => option.label)}
          selectedIndex={selectedIndex}
          variant="radio"
          onOptionSelected={({ nativeEvent }) => {
            options[nativeEvent.index]?.onSelect();
          }}
        />
      </ContextMenu.Items>
    </ContextMenu>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 20,
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
  fieldLabel: {
    opacity: 0.7,
  },
  textInput: {
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
  listSurface: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectionAction: {
    opacity: 0.65,
  },
  trailingCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  trailingCount: {
    opacity: 0.65,
  },
  fieldCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  templateFields: {
    gap: 10,
  },
  helpText: {
    opacity: 0.7,
  },
});

export default NewListFormScreen;
