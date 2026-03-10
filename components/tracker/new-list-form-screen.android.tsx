import { ContextMenu, ListItem, Picker, Switch, TextButton } from '@expo/ui/jetpack-compose';
import { ScrollView, StyleSheet, TextInput, View, Alert } from 'react-native';

import type { NewListFormController } from '@/components/tracker/use-new-list-form';
import { ThemedText } from '@/components/themed-text';
import {
  getListEntryTypeLabel,
  getListFieldKindLabel,
  LIST_ADDON_OPTIONS,
  LIST_ENTRY_TYPE_OPTIONS,
  LIST_FIELD_KIND_OPTIONS,
} from '@/lib/list-config-options';

interface NewListFormScreenProps {
  form: NewListFormController;
}

export function NewListFormScreen({ form }: NewListFormScreenProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Details</ThemedText>
        <FieldLabel>Title</FieldLabel>
        <TextInput
          autoFocus
          placeholder="Title"
          style={styles.textInput}
          value={form.title}
          onChangeText={form.setTitle}
        />
        <FieldLabel>Description</FieldLabel>
        <TextInput
          multiline
          numberOfLines={3}
          placeholder="Description"
          style={[styles.textInput, styles.multilineInput]}
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
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Add-ons</ThemedText>
        </View>
        <View style={styles.listSurface}>
          {LIST_ADDON_OPTIONS.map((addon) => (
            <ListItem key={addon.id} headline={addon.label}>
              <ListItem.Leading>
                <TextButton onPress={() => Alert.alert(addon.label, addon.description)}>Info</TextButton>
              </ListItem.Leading>
              <ListItem.Trailing>
                <Switch
                  value={form.draftConfig.addons.includes(addon.id)}
                  onValueChange={() => form.toggleAddon(addon.id)}
                />
              </ListItem.Trailing>
            </ListItem>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Custom fields</ThemedText>
          <TextButton onPress={form.addField}>Add field</TextButton>
        </View>
        {form.draftConfig.fieldDefinitions.length ? (
          form.draftConfig.fieldDefinitions.map((field) => (
            <View key={field.id} style={styles.fieldCard}>
              <FieldLabel>Field label</FieldLabel>
              <TextInput
                style={styles.textInput}
                value={field.label}
                onChangeText={(value) => form.updateField(field.id, { label: value })}
                placeholder="Field label"
              />
              <SelectionRow
                title="Field kind"
                value={getListFieldKindLabel(field.kind)}
                options={LIST_FIELD_KIND_OPTIONS.map((option) => ({
                  label: option.label,
                  onSelect: () => form.updateFieldKind(field.id, option.value),
                }))}
                selectedIndex={LIST_FIELD_KIND_OPTIONS.findIndex(
                  (option) => option.value === field.kind
                )}
              />
              <TextButton onPress={() => form.removeField(field.id)}>Remove field</TextButton>
            </View>
          ))
        ) : (
          <ThemedText style={styles.helpText}>
            Add structured fields for setups like projects, books, or recipes.
          </ThemedText>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="defaultSemiBold">Template</ThemedText>
        <View style={styles.listSurface}>
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
              style={styles.textInput}
              value={form.templateTitle}
              onChangeText={form.setTemplateTitle}
              placeholder="Template title"
            />
            <FieldLabel>Template description</FieldLabel>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
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
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <View style={styles.listSurface}>
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
    borderColor: '#C7CBD1',
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
    borderColor: '#E0E3E8',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectionAction: {
    opacity: 0.65,
  },
  fieldCard: {
    borderColor: '#E0E3E8',
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
