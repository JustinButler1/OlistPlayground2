import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';

type ThemeColors = (typeof Colors)[keyof typeof Colors];

export interface BirthdayPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onOpenChange?: (open: boolean) => void;
  colors: ThemeColors;
}

type BirthdayPickerComponent = (props: BirthdayPickerProps) => React.JSX.Element;

export function BirthdayPicker(props: BirthdayPickerProps) {
  const PickerComponent: BirthdayPickerComponent =
    Platform.OS === 'web'
      ? (
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('./birthday-picker.web') as typeof import('./birthday-picker.web')
        )
          .BirthdayPicker
      : (
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('./birthday-picker.native') as typeof import('./birthday-picker.native')
        )
          .BirthdayPicker;

  return <PickerComponent {...props} />;
}
