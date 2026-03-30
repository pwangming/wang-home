import { test, expect } from '@playwright/test'

test.describe('Full Flow E2E', () => {
  test('registered user: register -> play -> submit score -> view leaderboard', async ({ page }) => {
    // ========== 0. 创建唯一测试账号 ==========
    const testUser = {
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
      password: 'Test123456',
      username: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
    }

    // ========== 1. 注册 ==========
    await page.goto('/register')
    await page.fill('input[type="email"]', testUser.email)
    await page.fill('input[type="password"]', testUser.password)
    await page.fill('input[placeholder*="用户名"]', testUser.username)
    await page.click('button[type="submit"]')
    // 本地无邮箱确认，直接跳转
    await page.waitForURL('**/game', { timeout: 10000 })

    // ========== 2. 进入游戏 ==========
    // 选择速度倍数
    await page.click('button:has-text("1.5")') // 选择速度 1.5x
    // 开始游戏
    await page.click('button:has-text("开始游戏")')

    // ========== 3. 等待游戏结束 ==========
    // 等待一段时间让游戏运行
    await page.waitForTimeout(3000)

    // 触发游戏结束（游戏支持 Escape 键结束）
    await page.keyboard.press('Escape')

    // ========== 4. 验证分数提交 ==========
    // 等待分数提交反馈出现
    await expect(page.locator('text=分数提交成功')).toBeVisible({ timeout: 5000 })

    // ========== 5. 查看排行榜 ==========
    await page.click('button:has-text("排行榜")')
    await expect(page.locator('.n-card')).toBeVisible()
    // 验证用户分数在排行榜中（如果分数足够高）
    // await expect(page.locator(`text=${testUser.username}`)).toBeVisible()
  })

  test('guest user can dismiss warning and play', async ({ page }) => {
    // ========== 1. 进入游戏 ==========
    await page.goto('/game')

    // ========== 2. 看到未登录警告 ==========
    await expect(page.locator('.guest-warning-content')).toBeVisible()

    // ========== 3. 点击继续游戏 ==========
    await page.click('button:has-text("继续游戏")')
    await expect(page.locator('.guest-warning-content')).not.toBeVisible()

    // ========== 4. 验证游戏可以开始 ==========
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

    // ========== 1. 直接访问 /game ==========
    await page.goto('/game')

    // ========== 2. 关闭未登录提示 ==========
    const guestWarning = page.locator('.guest-warning-content')
    if (await guestWarning.isVisible()) {
      await page.click('button:has-text("继续游戏")')
    }

    // ========== 3. 游玩并结束 ==========
    await page.click('button:has-text("开始游戏")')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')

    // ========== 4. 验证显示"成绩未记录" ==========
    await expect(page.locator('text=成绩未记录')).toBeVisible()

    // ========== 5. 再次触发游戏并结束，确保整个流程中都没有成绩提交 ==========
    await page.click('button:has-text("开始游戏")')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await expect(page.locator('text=成绩未记录')).toBeVisible()

    expect(sessionRequests).toHaveLength(0)
    expect(leaderboardRequests).toHaveLength(0)
  })
})
