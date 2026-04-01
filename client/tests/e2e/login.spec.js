import { test, expect } from '@playwright/test'

function makeUser(prefix = 'login') {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return {
    email: `${prefix}-${nonce}@test.com`,
    username: `user_${nonce}`,
    password: 'Test123456'
  }
}

test.describe('Login Page', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    const user = makeUser('login-success')
    await page.route('**/api/auth/login', async route => {
      const payload = JSON.parse(route.request().postData() || '{}')
      const isExpectedUser = payload.email === user.email && payload.password === user.password
      await route.fulfill({
        status: isExpectedUser ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(
          isExpectedUser
            ? { success: true, user: { id: 'user-login-success', email: user.email } }
            : { error: 'Invalid credentials' }
        )
      })
    })

    await page.goto('/login')
    await page.locator('[data-testid="login-email"] input').fill(user.email)
    await page.locator('[data-testid="login-password"] input').fill(user.password)
    await page.click('[data-testid="login-submit"]')
    await page.waitForURL('**/game', { timeout: 15000 })
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid login credentials' })
      })
    })

    await page.goto('/login')
    await page.locator('[data-testid="login-email"] input').fill('wrong@test.com')
    await page.locator('[data-testid="login-password"] input').fill('wrongpass')
    await page.click('[data-testid="login-submit"]')
    await expect(page.locator('.error-alert')).toBeVisible()
  })
})
