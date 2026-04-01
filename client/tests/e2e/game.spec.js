import { test, expect } from '@playwright/test'

test.describe('Game Page', () => {
  test('guest user can dismiss warning and play', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('guestWarningSeen'))
    await page.goto('/game')

    const guestWarning = page.locator('.guest-warning-content')
    if (await guestWarning.isVisible()) {
      await page.click('[data-testid="guest-continue-btn"]')
      await expect(guestWarning).not.toBeVisible()
    }

    await page.click('[data-testid="game-start-btn"]')
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('unauthenticated user: play without login -> score not recorded', async ({ page }) => {
    const sessionRequests = []
    const leaderboardRequests = []

    page.on('request', request => {
      if (request.url().includes('/api/game-sessions/start') && request.method() === 'POST') {
        sessionRequests.push(request)
      }
      if (request.url().includes('/api/leaderboard') && request.method() === 'POST') {
        leaderboardRequests.push(request)
      }
    })

    await page.addInitScript(() => localStorage.setItem('guestWarningSeen', 'true'))
    await page.goto('/game')

    const guestWarning = page.locator('.guest-warning-content')
    if (await guestWarning.isVisible()) {
      await page.click('[data-testid="guest-continue-btn"]')
    }

    await page.click('[data-testid="game-start-btn"]')
    await page.waitForTimeout(1200)
    await page.keyboard.press('Escape')

    await expect(page.locator('[data-testid="submit-feedback"]')).toHaveCount(0)
    expect(sessionRequests).toHaveLength(0)
    expect(leaderboardRequests).toHaveLength(0)
  })
})
