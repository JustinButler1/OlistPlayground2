import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThumbnailImage } from '@/components/thumbnail-image';
import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

interface NewListImagePickerProps {
  colors: ThemeColors;
  imageUrl?: string | null;
  onPick: () => void;
  onClear: () => void;
}

export function NewListImagePicker({
  colors,
  imageUrl,
  onPick,
  onClear,
}: NewListImagePickerProps) {
  return (
    <View style={styles.container}>
      <ThumbnailImage imageUrl={imageUrl} style={styles.preview} />
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Choose list image"
          onPress={onPick}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.tint + '14',
              borderColor: colors.tint + '35',
              opacity: pressed ? 0.84 : 1,
            },
          ]}
        >
          <ThemedText style={{ color: colors.tint }}>Choose image</ThemedText>
        </Pressable>
        {imageUrl ? (
          <Pressable
            accessibilityLabel="Remove list image"
            onPress={onClear}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.icon + '10',
                borderColor: colors.icon + '28',
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            <ThemedText>Remove</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  preview: {
    width: 124,
    height: 178,
    borderRadius: 24,
  },
  copy: {
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  button: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
