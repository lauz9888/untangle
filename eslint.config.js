import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Downgrade to warn so existing dead code doesn't block CI on day one;
      // errors still fail the check, warnings do not. Remove dead code in a
      // follow-up PR rather than burying it under a disable comment.
      'no-unused-vars': 'warn',
      // Attribute ordering is a style preference — Prettier handles formatting.
      'vue/attributes-order': 'off',
    },
  },
  {
    files: ['tests/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/', 'coverage/', 'playwright-report/', 'node_modules/'],
  },
]
