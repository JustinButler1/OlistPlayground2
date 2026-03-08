import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatRatingValue } from '@/lib/tracker-metadata';

interface RatingStarsProps {
  value?: number;
  onChange?: (nextValue?: number) => void;
  size?: number;
  gap?: number;
  showValue?: boolean;
  allowClear?: boolean;
}

const STAR_COUNT = 5;
const SEGMENTS_PER_STAR = 4;

export function RatingStars({
  value,
  onChange,
  size = 18,
  gap = 4,
  showValue = false,
  allowClear = false,
}: RatingStarsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const editable = typeof onChange === 'function';
  const normalizedValue = value ?? 0;

  return (
    <View style={[styles.row, { gap }]}>
      <View style={[styles.starsRow, { gap }]}>
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const fill = Math.min(Math.max(normalizedValue - index, 0), 1);

          return (
            <View
              key={index}
              style={[styles.starFrame, { width: size, height: size + 4 }]}
            >
              <Text
                style={[
                  styles.starText,
                  { color: colors.icon + '35', fontSize: size, lineHeight: size + 2 },
                ]}
              >
                ★
              </Text>
              <View style={[styles.fillMask, { width: `${fill * 100}%` }]}>
                <Text
                  style={[
                    styles.starText,
                    { color: colors.tint, fontSize: size, lineHeight: size + 2 },
                  ]}
                >
                  ★
                </Text>
              </View>
              {editable
                ? Array.from({ length: SEGMENTS_PER_STAR }, (_, segmentIndex) => {
                    const segmentValue = index + (segmentIndex + 1) / SEGMENTS_PER_STAR;
                    return (
                      <Pressable
                        key={`${index}-${segmentIndex}`}
                        onPress={() =>
                          onChange?.(
                            allowClear && value === segmentValue ? undefined : segmentValue
                          )
                        }
                        style={[
                          styles.segment,
                          {
                            left: `${segmentIndex * 25}%`,
                            width: '25%',
                          },
                        ]}
                      />
                    );
                  })
                : null}
            </View>
          );
        })}
      </View>
      {showValue && value ? (
        <Text style={[styles.valueText, { color: colors.icon }]}>
          {formatRatingValue(value)}/5
        </Text>
      ) : null}
      {editable && allowClear && value ? (
        <Pressable onPress={() => onChange?.(undefined)} style={styles.clearButton}>
          <Text style={[styles.clearText, { color: colors.tint }]}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starFrame: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontWeight: '700',
  },
  fillMask: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: 2,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
