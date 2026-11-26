/**
 * Design tokens — specs.md §1.3 (single source of truth; tailwind.config.ts reads this file).
 * Light theme only in v1. Contrast ratios are checked in specs §1.3.1 (WCAG 2.2 AA).
 * Never use `brand.logoRed` behind or as text (4.17:1). Status is never shown by colour alone.
 */
export const colors = {
  brand: {
    primary: '#C1121F',
    primaryPressed: '#A50F1A',
    primarySoft: '#FDECEE',
    logoRed: '#E63946',
    navy: '#1D3557',
  },
  text: {
    primary: '#111827',
    muted: '#4B5563',
    inverse: '#FFFFFF',
  },
  border: {
    input: '#8A94A6',
    subtle: '#E5E7EB',
  },
  bg: {
    app: '#FFFFFF',
    surface: '#F6F7F9',
  },
  status: {
    success: '#1B7F3B',
    successText: '#1B6B34',
    successBg: '#E8F5EC',
    warning: '#8A4B00',
    warningBg: '#FFF4E0',
    info: '#1D4ED8',
    infoBg: '#EAF0FD',
    error: '#C1121F',
    errorBg: '#FDECEE',
  },
  component: {
    platelets: '#6D28D9',
    dengue: '#92400E',
    dengueBg: '#FEF3C7',
  },
  practice: {
    // CMP-PracticeBadge: yellow pill (dark text on yellow keeps AA contrast).
    bg: '#FDE68A',
    text: '#713F12',
  },
  focus: {
    ring: '#1D4ED8',
  },
} as const;

/** Spacing scale (px / dp). */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

/** Radius: 8 inputs/chips, 12 cards, 999 pills. */
export const radius = { sm: 8, md: 12, pill: 999 } as const;

/** Minimum touch target and primary button height (dp). */
export const touch = { min: 48, primaryButton: 52 } as const;

export type TypeToken = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'small' | 'caption';

/** Typography — EN size/line height, BN line height (Bangla needs more vertical room). */
export const typography: Record<TypeToken, { size: number; lineEn: number; lineBn: number; weight: 400 | 600 | 700 }> = {
  display: { size: 28, lineEn: 34, lineBn: 40, weight: 700 },
  title: { size: 22, lineEn: 28, lineBn: 34, weight: 700 },
  heading: { size: 18, lineEn: 24, lineBn: 30, weight: 600 },
  body: { size: 16, lineEn: 24, lineBn: 28, weight: 400 },
  bodyStrong: { size: 16, lineEn: 24, lineBn: 28, weight: 600 },
  small: { size: 14, lineEn: 20, lineBn: 24, weight: 400 },
  caption: { size: 12, lineEn: 16, lineBn: 20, weight: 400 },
};

/** Font family names as registered by `useFonts` in app/_layout.tsx. */
export const fontFamily = {
  en: { 400: 'NotoSans_400Regular', 600: 'NotoSans_600SemiBold', 700: 'NotoSans_700Bold' },
  bn: { 400: 'NotoSansBengali_400Regular', 600: 'NotoSansBengali_600SemiBold', 700: 'NotoSansBengali_700Bold' },
} as const;

/** Breakpoints: tablet padding at 768, desktop sidebar at 1024 (specs §1.4.1). */
export const breakpoints = { md: 768, lg: 1024 } as const;
