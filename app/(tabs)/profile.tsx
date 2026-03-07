import { useEffect, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cacheDirectory,
  documentDirectory,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useListActions, useListsQuery } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

const REQUIRE_AUTH_KEY = 'tracker.require-export-auth';

async function confirmWithBiometricsIfNeeded(requireAuth: boolean): Promise<boolean> {
  if (!requireAuth) {
    return true;
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) {
    return true;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirm backup action',
  });
  return result.success;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { deletedLists } = useListsQuery();
  const { exportLists, importLists, resetAllLists, restoreList } = useListActions();
  const [requireAuth, setRequireAuth] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void SecureStore.getItemAsync(REQUIRE_AUTH_KEY).then((value) => {
      setRequireAuth(value === 'true');
    });
  }, []);

  const toggleRequireAuth = async () => {
    const nextValue = !requireAuth;
    setRequireAuth(nextValue);
    await SecureStore.setItemAsync(REQUIRE_AUTH_KEY, nextValue ? 'true' : 'false');
  };

  const handleExport = async () => {
    const confirmed = await confirmWithBiometricsIfNeeded(requireAuth);
    if (!confirmed) {
      return;
    }

    const raw = exportLists();
    const directory = documentDirectory ?? cacheDirectory;
    if (!directory) {
      setStatusMessage('Could not access the local file system.');
      return;
    }

    const uri = `${directory}olist-tracker-backup.json`;
    await writeAsStringAsync(uri, raw);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
      setStatusMessage('Backup exported and ready to share.');
    } else {
      setStatusMessage(`Backup exported to ${uri}`);
    }
  };

  const handleImport = async () => {
    const confirmed = await confirmWithBiometricsIfNeeded(requireAuth);
    if (!confirmed) {
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const raw = await readAsStringAsync(result.assets[0].uri);
    importLists(raw);
    setStatusMessage('Backup imported successfully.');
  };

  const handleReset = () => {
    const confirmReset = () => {
      resetAllLists();
      setStatusMessage('Local tracker data reset to starter lists.');
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Reset all local tracker data?')) {
        confirmReset();
      }
      return;
    }

    Alert.alert('Reset local data?', 'This clears local tracker state and starter data will be restored.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: confirmReset },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ThemedText type="title">Profile & Settings</ThemedText>
        <ThemedText style={{ color: colors.icon }}>
          Product import stays under Labs until backend support exists. Backups and restores are
          local-first.
        </ThemedText>
      </View>

      <Section title="Backups">
        <ActionRow
          label="Export JSON backup"
          description="Share a local backup for safekeeping."
          onPress={handleExport}
        />
        <ActionRow
          label="Import JSON backup"
          description="Replace the current local tracker state."
          onPress={handleImport}
        />
        <ActionRow
          label={requireAuth ? 'Disable backup auth' : 'Require device auth'}
          description="Use Face ID or device biometrics before import/export."
          onPress={toggleRequireAuth}
        />
        <ActionRow
          label="Reset local data"
          description="Restore the starter tracker state."
          onPress={handleReset}
        />
        {statusMessage ? (
          <ThemedText style={[styles.statusMessage, { color: colors.icon }]}>
            {statusMessage}
          </ThemedText>
        ) : null}
      </Section>

      <Section title="Restore Lists">
        {deletedLists.length ? (
          deletedLists.map((list) => (
            <ActionRow
              key={list.id}
              label={list.title}
              description="Restore this deleted list into the active tracker."
              onPress={() => restoreList(list.id)}
            />
          ))
        ) : (
          <ThemedText style={styles.emptyText}>No deleted lists waiting to be restored.</ThemedText>
        )}
      </Section>

      <Section title="Labs">
        <ActionRow
          label="Open product import"
          description="Beta link-import surface kept out of the main profile flow."
          onPress={() => router.push('/product-import')}
        />
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function ActionRow({
  label,
  description,
  onPress,
}: {
  label: string;
  description: string;
  onPress: () => void | Promise<void>;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.actionRow,
        {
          borderColor: colors.icon + '20',
          backgroundColor: colors.background,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <ThemedText style={{ color: colors.icon }}>{description}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  section: {
    gap: 12,
  },
  sectionContent: {
    gap: 10,
  },
  actionRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  statusMessage: {
    fontSize: 13,
  },
  emptyText: {
    opacity: 0.7,
  },
});
