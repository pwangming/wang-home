import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

const autoImportGlobals = {
  ref: 'readonly',
  reactive: 'readonly',
  computed: 'readonly',
  watch: 'readonly',
  watchEffect: 'readonly',
  onMounted: 'readonly',
  onUnmounted: 'readonly',
  onBeforeMount: 'readonly',
  onBeforeUnmount: 'readonly',
  nextTick: 'readonly',
  defineProps: 'readonly',
  defineEmits: 'readonly',
  defineExpose: 'readonly',
  withDefaults: 'readonly',
  useRouter: 'readonly',
  useRoute: 'readonly',
  defineStore: 'readonly',
  storeToRefs: 'readonly',
  useMessage: 'readonly',
  useNotification: 'readonly',
  useDialog: 'readonly',
  useLoadingBar: 'readonly',
  darkTheme: 'readonly',
  provide: 'readonly',
  inject: 'readonly',
  readonly: 'readonly',
  toRef: 'readonly',
  toRefs: 'readonly',
  unref: 'readonly',
  isRef: 'readonly',
  markRaw: 'readonly',
  shallowRef: 'readonly',
  shallowReactive: 'readonly',
  getCurrentInstance: 'readonly'
}

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      '.vercel/**',
      'src/auto-imports.d.ts',
      'src/components.d.ts'
    ]
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        ...autoImportGlobals
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/require-default-prop': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/v-on-event-hyphenation': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off',
      'vue/html-quotes': 'off',
      'vue/html-closing-bracket-spacing': 'off'
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module'
      }
    }
  },
  {
    files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        vi: 'readonly'
      }
    },
    rules: {
      'vue/one-component-per-file': 'off',
      'vue/require-prop-types': 'off',
      'no-unused-vars': 'off'
    }
  }
]
