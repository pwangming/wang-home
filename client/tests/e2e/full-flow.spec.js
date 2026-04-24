import { test, expect } from '@playwright/test'

test.describe('Full Flow E2E', () => {
  test('registered user: register -> play -> submit -> open leaderboard', async ({ page }) => {
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user-full-flow', email: 'full-flow@test.com' }
        })
      })
    })

    await page.route('**/api/leaderboard', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leaderboard: [], page: 1, pageSize: 20 })
      })
    })

    await page.goto('/game')

    await page.click('[data-testid="speed-option-1.5"]')
    await page.click('[data-testid="game-start-btn"]')
    await expect(page.locator('canvas')).toBeVisible()

    await page.waitForTimeout(1500)
    await page.keyboard.press('Escape')

    await expect(page.locator('[data-testid="submit-feedback"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="submit-feedback"]')).toHaveClass(/success/)

    await page.locator('[data-testid="open-leaderboard-btn"]').dispatchEvent('click')
    await expect(page.locator('.close-btn')).toBeVisible()
  })

  test('guest user can dismiss warning and play', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('guestWarningSeen'))
    await page.goto('/game')

    await expect(page.locator('.guest-warning-content')).toBeVisible()
    await page.click('[data-testid="guest-continue-btn"]')
    await expect(page.locator('.guest-warning-content')).not.toBeVisible()

    await page.click('[data-testid="game-start-btn"]')
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('unauthenticated user: play without login -> score is not submitted', async ({ page }) => {
    const leaderboardRequests = []

    page.on('request', request => {
      if (request.url().includes('/api/leaderboard') && request.method() === 'POST') {
        leaderboardRequests.push(request)
      }
    })

    await page.addInitScript(() => localStorage.setItem('guestWarningSeen', 'true'))
    await page.goto('/game')

    if (await page.locator('.guest-warning-content').isVisible()) {
      await page.click('[data-testid="guest-continue-btn"]')
    }

    await page.click('[data-testid="game-start-btn"]')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')

    await expect(page.locator('[data-testid="submit-feedback"]')).toHaveCount(0)
    expect(leaderboardRequests).toHaveLength(0)
  })
})
