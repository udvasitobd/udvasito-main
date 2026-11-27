import type { Config } from 'tailwindcss';

import { colors, radius, spacing } from './src/theme/tokens';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  presets: [require('nativewind/preset')],
  // Light theme only in v1 (specs §1.3). 'class' (never set) instead of the default 'media': NativeWind's web
  // runtime throws "Cannot manually set color scheme, as dark mode is type 'media'" otherwise.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        ink: colors.text.primary,
        muted: colors.text.muted,
        line: colors.border.subtle,
        'line-input': colors.border.input,
        app: colors.bg.app,
        surface: colors.bg.surface,
        success: { DEFAULT: colors.status.success, text: colors.status.successText, bg: colors.status.successBg },
        warning: { DEFAULT: colors.status.warning, bg: colors.status.warningBg },
        info: { DEFAULT: colors.status.info, bg: colors.status.infoBg },
        danger: { DEFAULT: colors.status.error, bg: colors.status.errorBg },
        platelets: colors.component.platelets,
        dengue: { DEFAULT: colors.component.dengue, bg: colors.component.dengueBg },
        practice: colors.practice,
        focus: colors.focus.ring,
      },
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [`s${k}`, `${v}px`])),
      borderRadius: { sm: `${radius.sm}px`, md: `${radius.md}px`, pill: `${radius.pill}px` },
      minHeight: { touch: '48px', 'btn-primary': '52px' },
      minWidth: { touch: '48px' },
      maxWidth: { content: '720px', wide: '1120px' },
    },
  },
  plugins: [],
};

export default config;
