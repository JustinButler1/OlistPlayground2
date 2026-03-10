import { Button, Form, Host, Picker, Section, Text, TextField } from '@expo/ui/swift-ui';
import { buttonStyle, pickerStyle, tag, textFieldStyle } from '@expo/ui/swift-ui/modifiers';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useNewListForm } from '@/components/tracker/use-new-list-form';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getListFieldKindLabel, LIST_FIELD_KIND_OPTIONS } from '@/lib/list-config-options';

export default function NewListCustomFieldsRoute() {
  const form = useNewListForm();

  if (process.env.EXPO_OS === 'ios') {
    return (
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Custom fields">
            <Button label="Add field" onPress={form.addField} modifiers={[buttonStyle('bordered')]} />
            {form.draftConfig.fieldDefinitions.length ? (
              <>
                {form.draftConfig.fieldDefinitions.map((field) => (
                  <Fragment key={field.id}>
                    <TextField
                      key={`field-${field.id}-${form.formRevision}`}
                      defaultValue={field.label}
                      onChangeText={(value) => form.updateField(field.id, { label: value })}
                      placeholder="Field label"
                      modifiers={[textFieldStyle('plain')]}
                    />
                    <Picker
                      key={`field-kind-${field.id}`}
                      label="Field kind"
                      selection={field.kind}
                      onSelectionChange={(value) =>
                        form.updateFieldKind(field.id, value as typeof field.kind)
                      }
                      modifiers={[pickerStyle('menu')]}
                    >
                      {LIST_FIELD_KIND_OPTIONS.map((option) => (
                        <Text key={option.value} modifiers={[tag(option.value)]}>
                          {option.label}
                        </Text>
                      ))}
                    </Picker>
                    <Button
                      key={`field-remove-${field.id}`}
                      label="Remove field"
                      role="destructive"
                      onPress={() => form.removeField(field.id)}
                      modifiers={[buttonStyle('plain')]}
                    />
                  </Fragment>
                ))}
              </>
            ) : (
              <Text>Add structured fields for setups like projects, books, or recipes.</Text>
            )}
          </Section>
        </Form>
      </Host>
    );
  }

  return <CustomFieldsFallback />;
}

function CustomFieldsFallback() {
  const form = useNewListForm();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">Custom fields</ThemedText>
        <Pressable onPress={form.addField}>
          <ThemedText style={{ color: colors.tint }}>Add field</ThemedText>
        </Pressable>
      </View>

      {form.draftConfig.fieldDefinitions.length ? (
        form.draftConfig.fieldDefinitions.map((field) => (
          <View
            key={field.id}
            style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '25' }]}
          >
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.icon + '10', borderColor: colors.icon + '25', color: colors.text },
              ]}
              value={field.label}
              onChangeText={(value) => form.updateField(field.id, { label: value })}
              placeholder="Field label"
              placeholderTextColor={colors.icon}
            />
            <Pressable
              onPress={() => {
                const currentIndex = LIST_FIELD_KIND_OPTIONS.findIndex(
                  (option) => option.value === field.kind
                );
                const nextOption =
                  LIST_FIELD_KIND_OPTIONS[(currentIndex + 1) % LIST_FIELD_KIND_OPTIONS.length];
                form.updateFieldKind(field.id, nextOption.value);
              }}
            >
              <ThemedText>Field kind: {getListFieldKindLabel(field.kind)}</ThemedText>
            </Pressable>
            <Pressable onPress={() => form.removeField(field.id)}>
              <ThemedText style={{ color: '#C62828' }}>Remove field</ThemedText>
            </Pressable>
          </View>
        ))
      ) : (
        <ThemedText style={{ color: colors.icon }}>
          Add structured fields for setups like projects, books, or recipes.
        </ThemedText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
