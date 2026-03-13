import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const AVATAR_SIZE = 44;
const AVATAR_ICON_SIZE = 22;

function getProfilePhotoUrl(profileId: string): null | string {
  void profileId;
  return null;
}

export function AvatarIcon({ profileId }: { profileId: string }) {
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
          backgroundColor: colors.icon + '12',
          borderColor: colors.icon + '20',
        },
      ]}
    >
      {shouldShowProfilePhoto ? (
        <Image source={{ uri: profilePhotoUrl.trim() }} style={styles.image} contentFit="cover" />
      ) : (
        <IconSymbol name="person.fill" size={AVATAR_ICON_SIZE} color={colors.icon} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
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
