import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: [
      'coverage/**',
      'node_modules/**',
      'dist/**'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  },
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-unused-vars': 'off'
    }
  }
]
