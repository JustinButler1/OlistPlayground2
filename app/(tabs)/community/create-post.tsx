import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useTestAccounts } from '@/contexts/test-accounts-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addCreatedCommunityPost, buildCommunityAvatarGradient } from '@/lib/community-posts-store';

export default function CreatePostScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { state } = useOnboarding();
  const { activeAccount, activeAccountId } = useTestAccounts();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const isIos = process.env.EXPO_OS === 'ios';
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length > 0;
  const displayName = state.profile.displayName.trim() || activeAccount.defaultDisplayName;
  const handle = useMemo(() => {
    const normalized = activeAccount.handle.trim().replace(/^@/, '');
    return normalized ? `@${normalized}` : '@community';
  }, [activeAccount.handle]);

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    addCreatedCommunityPost(activeAccountId, {
      id: `created-${Date.now()}`,
      author: displayName,
      handle,
      timeAgo: 'now',
      title: trimmedTitle || undefined,
      body: trimmedBody,
      likesLabel: '0 boosts',
      repliesLabel: '0 replies',
      avatarGradient: buildCommunityAvatarGradient(displayName),
    });
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Post',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityLabel="Cancel"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 4 }]}
            >
              <ThemedText style={{ color: colors.tint }}>Cancel</ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityLabel="Post"
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 4 }]}
            >
              <ThemedText style={{ color: canSubmit ? colors.tint : colors.icon }}>Post</ThemedText>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardRoot}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: colorScheme === 'dark' ? 'rgba(10, 20, 34, 0.92)' : '#f7f9fc',
                borderColor: colors.icon + '20',
              },
            ]}
          >
            <View style={styles.fieldGroup}>
              <ThemedText selectable style={[styles.fieldLabel, { color: colors.icon }]}>
                Title
              </ThemedText>
              <TextInput
                placeholder="Optional title"
                placeholderTextColor={colors.icon}
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 22, 44, 0.04)',
                    borderColor: colors.icon + '18',
                    color: colors.text,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText selectable style={[styles.fieldLabel, { color: colors.icon }]}>
                Body
              </ThemedText>
              <TextInput
                multiline
                placeholder="Share what is happening."
                placeholderTextColor={colors.icon}
                style={[
                  styles.bodyInput,
                  {
                    backgroundColor:
                      colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(7, 22, 44, 0.04)',
                    borderColor: colors.icon + '18',
                    color: colors.text,
                  },
                ]}
                textAlignVertical="top"
                value={body}
                onChangeText={setBody}
              />
            </View>

            {isIos ? (
              <Pressable
                accessibilityLabel="Post"
                accessibilityRole="button"
                disabled={!canSubmit}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: canSubmit ? colors.tint : colors.icon + '40',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.submitButtonText}>Post</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetCard: {
    borderCurve: 'continuous',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 18,
    padding: 18,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bodyInput: {
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 180,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  submitButton: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
