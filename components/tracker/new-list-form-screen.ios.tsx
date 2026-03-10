import {
  Form,
  Host,
  HStack,
  Image,
  Picker,
  Section,
  Spacer,
  Text,
  TextField,
  Toggle,
} from '@expo/ui/swift-ui';
import {
  contentShape,
  foregroundStyle,
  onTapGesture,
  pickerStyle,
  shapes,
  tag,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';

import type { NewListFormController } from '@/components/tracker/use-new-list-form';
import {
  LIST_ENTRY_TYPE_OPTIONS,
} from '@/lib/list-config-options';

const EMPTY_TEMPLATE_VALUE = '__empty-template__';

interface NewListFormScreenProps {
  form: NewListFormController;
  openAddons?: () => void;
  openCustomFields?: () => void;
}

export function NewListFormScreen({
  form,
  openAddons,
  openCustomFields,
}: NewListFormScreenProps) {
  const templateSelection = form.selectedTemplateId ?? EMPTY_TEMPLATE_VALUE;

  return (
    <Host style={{ flex: 1 }}>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          accessibilityLabel="Cancel"
          icon="xmark"
          onPress={form.cancel}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Create"
          disabled={!form.canSubmit}
          icon="checkmark"
          onPress={form.submit}
          variant="done"
        />
      </Stack.Toolbar>

      <Form>
        <Section>
          <TextField
            key={`title-${form.formRevision}`}
            autoFocus
            defaultValue={form.title}
            onChangeText={form.setTitle}
            placeholder="Title"
            modifiers={[textFieldStyle('plain')]}
          />
          <TextField
            key={`description-${form.formRevision}`}
            defaultValue={form.description}
            onChangeText={form.setDescription}
            placeholder="Description (optional)"
            multiline
            numberOfLines={3}
            modifiers={[textFieldStyle('plain')]}
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

        <Section title="Customization">
          <HStack
            spacing={12}
            modifiers={[
              contentShape(shapes.rectangle()),
              onTapGesture(() => openAddons?.()),
            ]}
          >
            <Text>Add-ons</Text>
            <Spacer />
            <HStack spacing={6}>
              <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
                {String(form.draftConfig.addons.length)}
              </Text>
              <Image
                systemName="chevron.right"
                size={12}
                modifiers={[foregroundStyle({ type: 'hierarchical', style: 'tertiary' })]}
              />
            </HStack>
          </HStack>
          <HStack
            spacing={12}
            modifiers={[
              contentShape(shapes.rectangle()),
              onTapGesture(() => openCustomFields?.()),
            ]}
          >
            <Text>Custom fields</Text>
            <Spacer />
            <HStack spacing={6}>
              <Text modifiers={[foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
                {String(form.draftConfig.fieldDefinitions.length)}
              </Text>
              <Image
                systemName="chevron.right"
                size={12}
                modifiers={[foregroundStyle({ type: 'hierarchical', style: 'tertiary' })]}
              />
            </HStack>
          </HStack>
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
                modifiers={[textFieldStyle('plain')]}
              />
              <TextField
                key={`template-description-${form.formRevision}`}
                defaultValue={form.templateDescription}
                onChangeText={form.setTemplateDescription}
                placeholder="Template description"
                multiline
                numberOfLines={2}
                modifiers={[textFieldStyle('plain')]}
              />
            </>
          ) : null}
        </Section>
      </Form>
    </Host>
  );
}

export default NewListFormScreen;
