import { test, expect } from '@playwright/test'

test.describe('Game Page', () => {
  test('guest user can dismiss warning and play', async ({ page }) => {
    // 1. 进入游戏
    await page.goto('/game')

    // 2. 看到未登录警告
    const guestWarning = page.locator('.guest-warning-content')
    if (await guestWarning.isVisible()) {
      await page.click('button:has-text("继续游戏")')
      await expect(guestWarning).not.toBeVisible()
    }

    // 3. 验证游戏可以开始
    await page.click('button:has-text("开始游戏")')
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

    // 1. 直接访问 /game
    await page.goto('/game')

    // 2. 关闭未登录提示
    const guestWarning = page.locator('.guest-warning-content')
    if (await guestWarning.isVisible()) {
      await page.click('button:has-text("继续游戏")')
    }

    // 3. 游玩并结束
    await page.click('button:has-text("开始游戏")')
    await page.waitForTimeout(2000)
    await page.keyboard.press('Escape')

    // 4. 验证显示"成绩未记录"提示
    await expect(page.locator('text=成绩未记录')).toBeVisible({ timeout: 5000 })

    // 5. 确保整个流程中都没有成绩提交
    expect(sessionRequests).toHaveLength(0)
    expect(leaderboardRequests).toHaveLength(0)
  })
})
