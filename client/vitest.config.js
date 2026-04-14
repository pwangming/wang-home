import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        {
          'naive-ui': [
            'useMessage',
            'useNotification',
            'useDialog',
            'useLoadingBar',
            'darkTheme'
          ]
        }
      ],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      'tests/e2e/**',
      'node_modules/**'
    ],
    coverage: {
      provider: 'v8',
      // 覆盖率只统计"测试对象"：业务逻辑、数据转换、composables、store、带条件分支的组件。
      // 以下为非核心（纯渲染容器、canvas 游戏、引导/配置文件），由 E2E 覆盖或无需测试。
      exclude: [
        'src/main.js',
        'src/App.vue',
        'src/router/**',
        'src/auto-imports.d.ts',
        'src/components.d.ts',
        'src/components/game/SnakeGame.vue',
        'src/views/GameView.vue',
        'playwright.config.js',
        'vite.config.js',
        'vitest.config.js',
        'tests/**',
        'node_modules/**'
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 85,
        functions: 80
      }
    }
  }
})
