import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function GameDetailsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Games' }} />
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText type="title">Game tracking is deferred</ThemedText>
          <ThemedText style={styles.copy}>
            IGDB-backed features are intentionally hidden from release builds until a backend proxy
            exists. Existing legacy game entries stay visible for continuity, but detailed game
            catalog flows are disabled for this milestone.
          </ThemedText>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 12,
  },
  copy: {
    opacity: 0.75,
    lineHeight: 22,
  },
});
