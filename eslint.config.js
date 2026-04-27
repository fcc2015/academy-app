import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-ssr',
    'build',
    'coverage',
    // Android Capacitor build artifacts — generated bundled JS, not source
    'android/app/build',
    'android/app/src/main/assets/public',
    'android/.gradle',
    // Python backend — not a JS project
    'backend',
    // Other generated/vendored locations
    'public/assets',
    'node_modules',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Demoted to 'warn' for incremental cleanup of legacy violations.
      // CI passes on warnings; these surface in local dev and PR reviews.
      // Re-promote to 'error' once the existing violations are addressed.
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // New rules in eslint-plugin-react-hooks v6+ — also demoted for legacy code
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      // Critical correctness rule — kept as 'error'.
      'react-hooks/rules-of-hooks': 'error',
    },
  },
])
