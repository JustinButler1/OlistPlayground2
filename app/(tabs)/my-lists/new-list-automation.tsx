import { Button, Form, Host, Picker, Section, Text } from '@expo/ui/swift-ui';
import { buttonStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useNewListForm } from '@/components/tracker/use-new-list-form';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LIST_STATUS_OPTIONS } from '@/lib/list-config-options';

const TOGGLE_STATE_OPTIONS = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const;

export default function NewListAutomationRoute() {
  const form = useNewListForm();
  const canProgramToggleStatus =
    form.draftConfig.addons.includes('toggle') && form.draftConfig.addons.includes('status');

  if (process.env.EXPO_OS === 'ios') {
    return (
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Programming">
            <Text>
              Add explicit if/then blocks here. Toggle and status stay separate unless you link
              them.
            </Text>
            {!canProgramToggleStatus ? (
              <Text>Enable the Toggle and Status add-ons first.</Text>
            ) : (
              <Button
                label="Add block"
                onPress={form.addAutomationBlock}
                modifiers={[buttonStyle('bordered')]}
              />
            )}
            {form.draftConfig.automationBlocks.length ? (
              <>
                {form.draftConfig.automationBlocks.map((block) => (
                  <Fragment key={block.id}>
                    <Picker
                      label="If toggle is"
                      selection={block.sourceValue ? 'on' : 'off'}
                      onSelectionChange={(value) =>
                        form.updateAutomationBlock(block.id, {
                          sourceValue: value === 'on',
                        })
                      }
                      modifiers={[pickerStyle('menu')]}
                    >
                      {TOGGLE_STATE_OPTIONS.map((option) => (
                        <Text key={option.value} modifiers={[tag(option.value)]}>
                          {option.label}
                        </Text>
                      ))}
                    </Picker>
                    <Picker
                      label="Then set status"
                      selection={block.targetValue}
                      onSelectionChange={(value) =>
                        form.updateAutomationBlock(block.id, {
                          targetValue: value as (typeof block)['targetValue'],
                        })
                      }
                      modifiers={[pickerStyle('menu')]}
                    >
                      {LIST_STATUS_OPTIONS.map((option) => (
                        <Text key={option.value} modifiers={[tag(option.value)]}>
                          {option.label}
                        </Text>
                      ))}
                    </Picker>
                    <Button
                      label="Remove block"
                      role="destructive"
                      onPress={() => form.removeAutomationBlock(block.id)}
                      modifiers={[buttonStyle('plain')]}
                    />
                  </Fragment>
                ))}
              </>
            ) : canProgramToggleStatus ? (
              <Text>No blocks yet. Add one for toggle on, off, or both.</Text>
            ) : null}
          </Section>
        </Form>
      </Host>
    );
  }

  return <AutomationFallback />;
}

function AutomationFallback() {
  const form = useNewListForm();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const canProgramToggleStatus =
    form.draftConfig.addons.includes('toggle') && form.draftConfig.addons.includes('status');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold">Programming blocks</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            Add explicit links between add-ons. Nothing syncs unless a block says so.
          </ThemedText>
        </View>
        {canProgramToggleStatus ? (
          <Pressable onPress={form.addAutomationBlock}>
            <ThemedText style={{ color: colors.tint }}>Add block</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {!canProgramToggleStatus ? (
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '25' }]}>
          <ThemedText type="defaultSemiBold">Enable add-ons first</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            Turn on both Toggle and Status in the add-ons page before linking them here.
          </ThemedText>
        </View>
      ) : form.draftConfig.automationBlocks.length ? (
        form.draftConfig.automationBlocks.map((block, index) => (
          <View
            key={block.id}
            style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '25' }]}
          >
            <ThemedText type="defaultSemiBold">Block {index + 1}</ThemedText>
            <View style={styles.inlineRow}>
              <ThemedText style={{ color: colors.icon }}>If toggle is</ThemedText>
              <View style={styles.chipWrap}>
                {TOGGLE_STATE_OPTIONS.map((option) => {
                  const selected = (block.sourceValue ? 'on' : 'off') === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        form.updateAutomationBlock(block.id, {
                          sourceValue: option.value === 'on',
                        })
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.tint : colors.icon + '10',
                        },
                      ]}
                    >
                      <ThemedText style={{ color: selected ? colors.background : colors.text }}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.inlineRow}>
              <ThemedText style={{ color: colors.icon }}>Then set status to</ThemedText>
              <View style={styles.chipWrap}>
                {LIST_STATUS_OPTIONS.map((option) => {
                  const selected = block.targetValue === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        form.updateAutomationBlock(block.id, {
                          targetValue: option.value,
                        })
                      }
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.tint : colors.icon + '10',
                        },
                      ]}
                    >
                      <ThemedText style={{ color: selected ? colors.background : colors.text }}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable onPress={() => form.removeAutomationBlock(block.id)}>
              <ThemedText style={{ color: '#C62828' }}>Remove block</ThemedText>
            </Pressable>
          </View>
        ))
      ) : (
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '25' }]}>
          <ThemedText type="defaultSemiBold">No blocks yet</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            Add one block for toggle on, one for toggle off, or leave this empty to keep both
            add-ons independent.
          </ThemedText>
        </View>
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
    gap: 12,
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  inlineRow: {
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
