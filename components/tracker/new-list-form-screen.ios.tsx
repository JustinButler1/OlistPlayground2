import { Form, Host, Picker, Section, Text, TextField, Toggle } from '@expo/ui/swift-ui';
import { pickerStyle, tag, textFieldStyle } from '@expo/ui/swift-ui/modifiers';

import type { NewListFormController } from '@/components/tracker/use-new-list-form';
import {
  LIST_ADDON_OPTIONS,
  LIST_ENTRY_TYPE_OPTIONS,
} from '@/lib/list-config-options';

const EMPTY_TEMPLATE_VALUE = '__empty-template__';

interface NewListFormScreenProps {
  form: NewListFormController;
}

export function NewListFormScreen({ form }: NewListFormScreenProps) {
  const templateSelection = form.selectedTemplateId ?? EMPTY_TEMPLATE_VALUE;

  return (
    <Host style={{ flex: 1 }}>
      <Form>
        <Section>
          <TextField
            key={`title-${form.formRevision}`}
            autoFocus
            defaultValue={form.title}
            onChangeText={form.setTitle}
            placeholder="Title"
            modifiers={[textFieldStyle('roundedBorder')]}
          />
          <TextField
            key={`description-${form.formRevision}`}
            defaultValue={form.description}
            onChangeText={form.setDescription}
            placeholder="Description"
            multiline
            numberOfLines={3}
            modifiers={[textFieldStyle('roundedBorder')]}
          />
        </Section>

        <Section title="Source">
          <Picker
            selection={form.createMode}
            onSelectionChange={(value) => form.setCreateMode(value as 'scratch' | 'template')}
            modifiers={[pickerStyle('segmented')]}
          >
            <Text modifiers={[tag('scratch')]}>Scratch</Text>
            <Text modifiers={[tag('template')]}>Template</Text>
          </Picker>

          {form.createMode === 'template' ? (
            <Picker
              label="Template"
              selection={templateSelection}
              onSelectionChange={(value) => {
                if (typeof value === 'string' && value !== EMPTY_TEMPLATE_VALUE) {
                  form.selectTemplate(value);
                }
              }}
              modifiers={[pickerStyle('menu')]}
            >
              <Text modifiers={[tag(EMPTY_TEMPLATE_VALUE)]}>Choose a template</Text>
              {form.listTemplates.map((template) => (
                <Text key={template.id} modifiers={[tag(template.id)]}>
                  {template.title} ({template.source})
                </Text>
              ))}
            </Picker>
          ) : (
            <Text>Choose scratch for a blank list, or switch to a template.</Text>
          )}
        </Section>

        <Section title="Setup">
          <Picker
            label="Default item type"
            selection={form.draftConfig.defaultEntryType}
            onSelectionChange={(value) =>
              form.setDefaultEntryType(value as typeof form.draftConfig.defaultEntryType)
            }
            modifiers={[pickerStyle('menu')]}
          >
            {LIST_ENTRY_TYPE_OPTIONS.map((option) => (
              <Text key={option.value} modifiers={[tag(option.value)]}>
                {option.label}
              </Text>
            ))}
          </Picker>
        </Section>

        <Section title="Add-ons">
          {LIST_ADDON_OPTIONS.map((addon) => (
            <Toggle
              key={addon.id}
              isOn={form.draftConfig.addons.includes(addon.id)}
              onIsOnChange={() => form.toggleAddon(addon.id)}
              label={addon.label}
            />
          ))}
        </Section>

        <Section title="Custom fields">
          <Text>
            Temporarily using the fallback implementation for custom field editing while isolating
            the native crash.
          </Text>
        </Section>

        <Section title="Template">
          <Toggle
            isOn={form.saveAsTemplate}
            onIsOnChange={form.setSaveAsTemplate}
            label="Save setup as template"
          />

          {form.saveAsTemplate ? (
            <>
              <TextField
                key={`template-title-${form.formRevision}`}
                defaultValue={form.templateTitle}
                onChangeText={form.setTemplateTitle}
                placeholder="Template title"
                modifiers={[textFieldStyle('roundedBorder')]}
              />
              <TextField
                key={`template-description-${form.formRevision}`}
                defaultValue={form.templateDescription}
                onChangeText={form.setTemplateDescription}
                placeholder="Template description"
                multiline
                numberOfLines={2}
                modifiers={[textFieldStyle('roundedBorder')]}
              />
            </>
          ) : null}
        </Section>
      </Form>
    </Host>
  );
}

export default NewListFormScreen;
