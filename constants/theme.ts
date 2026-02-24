/**
 * Theme: Deep Space — Deep Space Black, Cosmic Purple, Nebula Blue, Stellar Teal, Starlight White.
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import { Platform } from 'react-native';

// Theme palette
export const ThemePalette = {
  deepSpaceBlack: '#0B0F1A',
  cosmicPurple: '#5B2D8B',
  nebulaBlue: '#2E6CF6',
  stellarTeal: '#2FD4C5',
  starlightWhite: '#F5F7FA',
} as const;

const tintColorLight = ThemePalette.nebulaBlue;
const tintColorDark = ThemePalette.stellarTeal;

export const Colors = {
  light: {
    text: ThemePalette.deepSpaceBlack,
    background: ThemePalette.starlightWhite,
    tint: tintColorLight,
    icon: ThemePalette.cosmicPurple,
    tabIconDefault: ThemePalette.cosmicPurple,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: ThemePalette.starlightWhite,
    background: ThemePalette.deepSpaceBlack,
    tint: tintColorDark,
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
