import { defineConfig } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3003'
  },
  webServer: [
    {
      command: 'npm run dev',
      port: 3003,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: __dirname
    },
    {
      command: 'npm run dev',
      port: 4000,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: path.resolve(__dirname, '../server')
    }
  ]
})
