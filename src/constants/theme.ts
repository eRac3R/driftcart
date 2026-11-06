/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111418',
    background: '#F4F5F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E9EBEF',
    textSecondary: '#626A75',
    border: '#E3E6EA',
    accent: '#0B7A6E',
    accentSoft: '#E3F4F1',
    accentText: '#FFFFFF',
    good: '#15803D',
    goodBackground: '#E5F6EA',
    bad: '#C0262D',
    badBackground: '#FDE8E8',
    warn: '#B45309',
    warnBackground: '#FEF3DC',
  },
  dark: {
    text: '#F2F4F7',
    background: '#0C0E11',
    backgroundElement: '#171A1F',
    backgroundSelected: '#252A31',
    textSecondary: '#A3ABB6',
    border: '#272C33',
    accent: '#34C3B0',
    accentSoft: '#12312D',
    accentText: '#06201C',
    good: '#4ADE80',
    goodBackground: '#10261A',
    bad: '#F87171',
    badBackground: '#331516',
    warn: '#FBBF24',
    warnBackground: '#30240B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
