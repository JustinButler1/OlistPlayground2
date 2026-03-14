import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const DEFAULT_AVATAR_SIZE = 44;
const DEFAULT_AVATAR_ICON_SIZE = 22;

function getProfilePhotoUrl(profileId: string): null | string {
  void profileId;
  return null;
}

export function AvatarIcon({
  profileId,
  size = DEFAULT_AVATAR_SIZE,
  iconSize = DEFAULT_AVATAR_ICON_SIZE,
  style,
}: {
  profileId: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const profilePhotoUrl = getProfilePhotoUrl(profileId);
  const hasProfilePhoto =
    typeof profilePhotoUrl === 'string' && profilePhotoUrl.trim().length > 0;

  // Profiles are not implemented yet, so keep the generic avatar active for now.
  const shouldShowProfilePhoto = false && hasProfilePhoto;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.icon + '12',
          borderColor: colors.icon + '20',
        },
        style,
      ]}
    >
      {shouldShowProfilePhoto ? (
        <Image source={{ uri: profilePhotoUrl.trim() }} style={styles.image} contentFit="cover" />
      ) : (
        <IconSymbol name="person.fill" size={iconSize} color={colors.icon} />
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
});
