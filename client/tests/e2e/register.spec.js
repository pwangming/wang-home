import { test, expect } from '@playwright/test'

function makeUser(prefix = 'register') {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return {
    email: `${prefix}-${nonce}@test.com`,
    username: `user_${nonce}`,
    password: 'Test123456'
  }
}

async function fillRegisterForm(page, user) {
  await page.locator('[data-testid="register-email"] input').fill(user.email)
  await page.locator('[data-testid="register-username"] input').fill(user.username)
  await page.locator('[data-testid="register-password"] input').fill(user.password)
  await page.locator('[data-testid="register-confirm-password"] input').fill(user.password)
}

test.describe('Register Page', () => {
  test('should register successfully and redirect to game when session is created', async ({ page }) => {
    await page.route('**/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: 'user-register-success', email: 'mock@test.com' }
        })
      })
    })

    const user = makeUser('register-success')
    await page.goto('/register')
    await fillRegisterForm(page, user)
    await page.click('[data-testid="register-submit"]')
    await page.waitForURL('**/game', { timeout: 15000 })
  })

  test('should show error when email already registered', async ({ page }) => {
    let registerCount = 0
    await page.route('**/api/auth/register', async route => {
      registerCount += 1
      if (registerCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: { id: 'user-register-duplicate', email: 'dup@test.com' }
          })
        })
        return
      }

      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email already registered' })
      })
    })

    const firstUser = makeUser('register-duplicate')
    await page.goto('/register')
    await fillRegisterForm(page, firstUser)
    await page.click('[data-testid="register-submit"]')
    await page.waitForURL('**/game', { timeout: 15000 })

    await page.goto('/register')
    await fillRegisterForm(page, {
      ...firstUser,
      username: `${firstUser.username}_dup`
    })
    await page.click('[data-testid="register-submit"]')
    await expect(page.locator('.error-alert')).toBeVisible()
  })

  test('should show validation errors when fields are missing', async ({ page }) => {
    await page.goto('/register')
    await page.click('[data-testid="register-submit"]')
    await expect(page.locator('.form-error').first()).toBeVisible()
  })
})
