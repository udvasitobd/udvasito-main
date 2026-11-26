// ESLint flat config: Expo's rules + the i18n rule (CLAUDE.md rule 13 — no string literals in UI code).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'node_modules/*',
      'convex/_generated/*',
      'src/content/generated/*',
      'coverage/*',
      'playwright-report/*',
      'test-results/*',
    ],
  },
  {
    // Every user-facing string comes from src/i18n via t('key').
    files: ['app/**/*.{ts,tsx}', 'src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: ['^(title|label|placeholder|accessibilityLabel|accessibilityHint|aria-label|alt|text)$'],
          },
        },
      ],
    },
  },
  {
    // Metro does not tree-shake: the lucide barrel ships all ~1,600 icons. Icons come from src/components/icons.ts.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/components/icons.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'lucide-react-native', message: "Import icons from '@/components/icons' (one module per icon)." }],
          patterns: [{ group: ['lucide-react-native/icons'], message: "Import icons from '@/components/icons'." }],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'scripts/**/*.ts', 'e2e/**/*.ts'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
]);
