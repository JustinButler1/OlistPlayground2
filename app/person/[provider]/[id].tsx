import { Stack, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PersonDetailsPlaceholder() {
  const { provider, id } = useLocalSearchParams<{ provider: string; id: string }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Details' }} />
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText type="title" style={{ textAlign: 'center' }}>Details Placeholder</ThemedText>
          <ThemedText style={{ marginTop: 12, opacity: 0.8 }}>Provider: {provider}</ThemedText>
          <ThemedText style={{ opacity: 0.8 }}>ID: {id}</ThemedText>
          <ThemedText style={{ marginTop: 24, textAlign: 'center', opacity: 0.7, paddingHorizontal: 32 }}>
            This page is a placeholder under construction. More details will be implemented soon!
          </ThemedText>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
