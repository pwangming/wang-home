import { test, expect } from '@playwright/test'

test.describe('Register Page', () => {
  test('should register successfully and redirect to game when server sets session cookie', async ({ page }) => {
    // 使用唯一账号
    const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
    const uniqueUsername = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    await page.goto('/register')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', 'Test123456')
    await page.fill('input[placeholder*="用户名"]', uniqueUsername)
    await page.click('button[type="submit"]')
    // 本地无邮箱确认，直接跳转 /game
    await page.waitForURL('**/game', { timeout: 10000 })
  })

  test('should show error when email already registered', async ({ page }) => {
    const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
    const username = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    // 先注册一个账号
    await page.goto('/register')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'Test123456')
    await page.fill('input[placeholder*="用户名"]', username)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/game', { timeout: 10000 })

    // 尝试重复注册（使用相同邮箱，不同用户名避免用户名冲突）
    await page.goto('/register')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', 'Test123456')
    await page.fill('input[placeholder*="用户名"]', `user_${Date.now()}_dup`)
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-alert')).toBeVisible()
  })

  test('should show validation error when fields missing', async ({ page }) => {
    await page.goto('/register')
    await page.click('button[type="submit"]')
    await expect(page.locator('.n-form-item-message')).toBeVisible()
  })
})
