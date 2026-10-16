import { forwardRef } from 'react';
import { View, type ViewProps } from 'react-native';

// The transition blur is iOS-only. Keep its native module out of web bundles.
export const BlurView = forwardRef<
  View,
  ViewProps & { blurAmount?: number; blurType?: string }
>(function BlurView({ style }, ref) {
  return <View style={style} ref={ref} />;
});
