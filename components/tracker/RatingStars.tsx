import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRatingValue } from '@/lib/tracker-metadata';

interface RatingStarsProps {
  value?: number;
  size?: number;
}

export function RatingStars({ value, size = 18 }: RatingStarsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.valueText,
          { fontSize: size - 2, color: colors.icon },
        ]}
      >
        {value ? formatRatingValue(value) : '-'}
      </Text>
      <Text
        style={[
          styles.starText,
          { color: value ? colors.tint : colors.icon + '35', fontSize: size, lineHeight: size + 2 },
        ]}
      >
        ★
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  starText: {
    fontWeight: '700',
  },
});
