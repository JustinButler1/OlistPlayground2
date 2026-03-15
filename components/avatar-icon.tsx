import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DEFAULT_AVATAR_SIZE = 44;

function getProfilePhotoUrl(profileId: string): null | string {
  void profileId;
  return null;
}

function getDisplayInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function getAvatarGradient(displayName: string, isDark: boolean): [string, string] {
  const gradients: [string, string][] = isDark
    ? [
        ['#7c5cff', '#21c7a8'],
        ['#ff8a5b', '#d7427a'],
        ['#4f8cff', '#15b8d6'],
        ['#f0b24f', '#ee6b4d'],
      ]
    : [
        ['#6d4aff', '#24b6d1'],
        ['#ff9770', '#d94b73'],
        ['#5d8dff', '#2cb6c9'],
        ['#efb45d', '#de684e'],
      ];
  const seed = displayName.trim().split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return gradients[seed % gradients.length];
}

export function AvatarIcon({
  profileId,
  displayName,
  size = DEFAULT_AVATAR_SIZE,
  style,
}: {
  profileId: string;
  displayName: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const profilePhotoUrl = getProfilePhotoUrl(profileId);
  const initials = getDisplayInitials(displayName);
  const gradientColors = getAvatarGradient(displayName, colorScheme === 'dark');
  const hasProfilePhoto =
    typeof profilePhotoUrl === 'string' && profilePhotoUrl.trim().length > 0;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: colors.icon + '20',
        },
        style,
      ]}
    >
      {hasProfilePhoto ? (
        <Image source={{ uri: profilePhotoUrl.trim() }} style={styles.image} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              borderRadius: size / 2,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.initials,
              {
                fontSize: Math.max(14, Math.round(size * 0.34)),
                lineHeight: Math.max(16, Math.round(size * 0.38)),
              },
            ]}
          >
            {initials}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
