import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' | undefined {
  const colorScheme = useNativeColorScheme();
  return colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : undefined;
}
