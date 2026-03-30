import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  // 每个测试独立注册账号，避免共享状态导致并发冲突
  async function registerTestUser({ page }) {
    const user = {
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      password: 'Test123456',
      username: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    }
    await page.goto('/register')
    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)
    await page.fill('input[placeholder*="用户名"]', user.username)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/game', { timeout: 10000 })
    // 清理会话，确保登录测试走真实登录流程
    await page.context().clearCookies()
    await page.goto('/login')
    return user
  }

  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1, .n-card-header')).toContainText('登录')
  })

  test('should login with valid credentials', async ({ page }) => {
    const testUser = await registerTestUser({ page })
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/game', { timeout: 10000 })
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@test.com')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-alert')).toBeVisible()
  })
})
