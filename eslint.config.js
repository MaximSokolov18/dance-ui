import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import {defineConfig, globalIgnores} from 'eslint/config'
import reactPlugin from 'eslint-plugin-react'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      reactPlugin.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,
      '@stylistic': stylistic,
    },
    settings: {
      react: {version: 'detect'},
    },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', {prefer: 'type-imports', fixStyle: 'inline-type-imports'}],
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', {props: 'never', children: 'never'}],
      'react/no-array-index-key': 'warn',

      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],

      'no-console': 'warn',
      'object-curly-spacing': ['error', 'never'],
      'key-spacing': ['error', {beforeColon: false, afterColon: true}],
      'comma-spacing': ['error', {before: false, after: true}],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/indent': ['error', 4],
    },
  },
])
