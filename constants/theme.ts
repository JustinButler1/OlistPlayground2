import { Platform } from 'react-native';

export const ThemePalette = {
  primaryBrand: '#4e2899',
  primaryAccent: '#139ec1',
  secondaryBrand: '#2a1b60',
  secondaryAccent: '#1a5e85',
  baseBackground: '#051223',
  paper: '#f5f8fc',
  ink: '#07162c',
  white: '#ffffff',
} as const;

const tintColorLight = ThemePalette.primaryBrand;
const tintColorDark = ThemePalette.primaryAccent;

export const Colors = {
  light: {
    text: ThemePalette.ink,
    background: ThemePalette.paper,
    tint: tintColorLight,
    icon: ThemePalette.secondaryAccent,
    tabIconDefault: ThemePalette.secondaryAccent,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: ThemePalette.white,
    background: ThemePalette.baseBackground,
    tint: tintColorDark,
    icon: '#9fb4ca',
    tabIconDefault: '#9fb4ca',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
