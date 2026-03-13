import { Platform } from 'react-native';

import { SelectionRow as AndroidSelectionRow } from '@/components/tracker/selection-row.android';
import { SelectionRow as IosSelectionRow } from '@/components/tracker/selection-row.ios';
import { SelectionRow as WebSelectionRow } from '@/components/tracker/selection-row.web';

interface SelectionOption {
  label: string;
  value: string;
}

interface SelectionRowProps {
  title: string;
  value: string;
  options: readonly SelectionOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function SelectionRow(props: SelectionRowProps) {
  if (Platform.OS === 'ios') {
    return <IosSelectionRow {...props} />;
  }

  if (Platform.OS === 'android') {
    return <AndroidSelectionRow {...props} />;
  }

  return <WebSelectionRow {...props} />;
}
