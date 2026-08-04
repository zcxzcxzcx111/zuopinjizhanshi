// Apple-style design tokens
// Based on Apple Human Interface Guidelines

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F2F2F7',
  card: '#FFFFFF',
  groupedBackground: '#F2F2F7',

  // Text
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  textOnAccent: '#FFFFFF',

  // Accent
  accent: '#007AFF',
  accentLight: 'rgba(0, 122, 255, 0.1)',
  accentBorder: 'rgba(0, 122, 255, 0.3)',

  // System
  destructive: '#FF3B30',
  destructiveLight: 'rgba(255, 59, 48, 0.1)',
  warning: '#FF9500',
  success: '#34C759',

  // Separators
  separator: 'rgba(60, 60, 67, 0.12)',
  separatorOpaque: '#C6C6C8',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.4)',
  frostedWhite: 'rgba(255, 255, 255, 0.85)',
  frostedWhite2: 'rgba(255, 255, 255, 0.72)',

  // Map
  mapOverlay: 'rgba(255, 255, 255, 0.9)',
};

// iOS 26 Liquid Glass effect styles
export const liquidGlass = {
  // For use with View style: {...liquidGlass.card}
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    // @ts-ignore — backdropFilter is web-only
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  // Lighter variant for overlays
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    // @ts-ignore
    backdropFilter: 'blur(30px) saturate(150%)',
    WebkitBackdropFilter: 'blur(30px) saturate(150%)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  // Tab bar / bottom bar
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    // @ts-ignore
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.08)',
  },
};

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const },
  title1: { fontSize: 28, fontWeight: '700' as const },
  title2: { fontSize: 22, fontWeight: '700' as const },
  title3: { fontSize: 20, fontWeight: '600' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  callout: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption1: { fontSize: 12, fontWeight: '400' as const },
  caption2: { fontSize: 11, fontWeight: '400' as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 100,
};

export const shadow = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
};

import { Platform } from 'react-native';

export const stickerShadow = Platform.select({
  web: {
    // @ts-ignore
    filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15)) drop-shadow(0px 0px 1px rgba(0,0,0,0.1))',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  }
});
