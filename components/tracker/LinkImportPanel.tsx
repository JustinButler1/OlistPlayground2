import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThumbnailImage } from '@/components/thumbnail-image';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import type { EntryDraft } from '@/contexts/lists-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { importProductFromUrl } from '@/lib/product-link-import';

interface LinkImportPanelProps {
  onSubmit: (draft: EntryDraft) => void;
  initialUrl?: string;
  autoFocus?: boolean;
}

export function LinkImportPanel({
  onSubmit,
  initialUrl = '',
  autoFocus = false,
}: LinkImportPanelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof importProductFromUrl>> | null>(
    null
  );

  useEffect(() => {
    setUrl(initialUrl);
    setError(null);
    setPreview(null);
  }, [initialUrl]);

  const handlePaste = async () => {
    const clipboardValue = await Clipboard.getStringAsync();
    if (clipboardValue) {
      setUrl(clipboardValue);
    }
  };

  const handleImport = async () => {
    if (!url.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);
    const result = await importProductFromUrl(url.trim());
    setLoading(false);

    if (!result.ok) {
      setError(result.code.replace(/_/g, ' '));
      return;
    }

    setPreview(result);
  };

  const commitPreview = () => {
    if (!preview?.ok) {
      return;
    }

    onSubmit({
      title: preview.preview.title,
      type: 'link',
      imageUrl: preview.preview.imageUrl,
      productUrl: preview.preview.canonicalUrl,
      sourceRef: {
        source: 'link',
        canonicalUrl: preview.preview.canonicalUrl,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.betaLabel, { color: colors.icon }]}>
        Paste a URL to pull in the page title and share image.
      </ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.icon + '28',
              backgroundColor: colors.icon + '10',
            },
          ]}
          placeholder="Paste a product link"
          placeholderTextColor={colors.icon}
          value={url}
          onChangeText={setUrl}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Pressable
          onPress={handlePaste}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: colors.icon + '10',
              borderColor: colors.icon + '28',
            },
          ]}
        >
          <ThemedText>Paste</ThemedText>
        </Pressable>
      </View>
      <Pressable
        onPress={handleImport}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: colors.tint, opacity: pressed ? 0.84 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <ThemedText style={[styles.primaryButtonText, { color: colors.background }]}>
            Import preview
          </ThemedText>
        )}
      </Pressable>
      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      {preview?.ok ? (
        <View
          style={[
            styles.previewCard,
            {
              borderColor: colors.icon + '28',
              backgroundColor: colors.background,
            },
          ]}
        >
          <ThumbnailImage imageUrl={preview.preview.imageUrl} style={styles.previewImage} />
          <View style={styles.previewContent}>
            <ThemedText type="defaultSemiBold" numberOfLines={3}>
              {preview.preview.title}
            </ThemedText>
            <ThemedText style={{ color: colors.icon }}>{preview.preview.storeDomain}</ThemedText>
            <Pressable
              onPress={commitPreview}
              style={[
                styles.secondaryButton,
                {
                  alignSelf: 'flex-start',
                  backgroundColor: colors.tint + '14',
                  borderColor: colors.tint + '25',
                },
              ]}
            >
              <ThemedText style={{ color: colors.tint }}>Add link entry</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  betaLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  previewCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  previewImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
  },
  previewContent: {
    flex: 1,
    gap: 8,
  },
  errorText: {
    color: '#cc3f3f',
  },
});
