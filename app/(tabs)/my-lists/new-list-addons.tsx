import { Button, Form, Host, HStack, Menu, Section, Spacer, Text, Toggle } from '@expo/ui/swift-ui';
import {
  controlSize,
  disabled as disabledModifier,
  labelsHidden,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useNewListForm } from '@/components/tracker/use-new-list-form';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LIST_ADDON_OPTIONS } from '@/lib/list-config-options';

export default function NewListAddonsRoute() {
  const form = useNewListForm();

  if (process.env.EXPO_OS === 'ios') {
    return (
      <Host style={{ flex: 1 }}>
        <Form>
          <Section title="Add-ons">
            {LIST_ADDON_OPTIONS.map((addon) => (
              <HStack key={addon.id} spacing={12}>
                <Menu
                  label="Info"
                  systemImage="info.circle"
                  modifiers={[controlSize('small'), labelStyle('iconOnly')]}
                >
                  <Button label={addon.description} modifiers={[disabledModifier(true)]} />
                </Menu>
                <Text>{addon.label}</Text>
                <Spacer />
                <Toggle
                  isOn={form.draftConfig.addons.includes(addon.id)}
                  onIsOnChange={() => form.toggleAddon(addon.id)}
                  label=""
                  modifiers={[labelsHidden()]}
                />
              </HStack>
            ))}
          </Section>
        </Form>
      </Host>
    );
  }

  return <AddonsFallback />;
}

function AddonsFallback() {
  const form = useNewListForm();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '25' }]}>
        {LIST_ADDON_OPTIONS.map((addon) => (
          <View key={addon.id} style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText>{addon.label}</ThemedText>
              <ThemedText style={{ color: colors.icon }}>{addon.description}</ThemedText>
            </View>
            <Switch
              value={form.draftConfig.addons.includes(addon.id)}
              onValueChange={() => form.toggleAddon(addon.id)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
