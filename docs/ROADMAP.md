# Kinetic Arcade 版本规划

> 最后更新: 2026-04-09
> 当前版本: v1.0.0 (已打 tag)

## 版本总览

```
v1.0.0  当前状态，打 tag 作为基线
  │
  ├─ v1.0.1  核心 Bug 修复（认证 + 测试）
  ├─ v1.0.2  体验 Bug 修复（心跳 + 反馈）
  │
  ├─ v1.1.0  小功能更新（游戏体验）
  ├─ v1.1.1  小功能更新（账户管理）
  │
  └─ v1.2.0  技术改善（测试 + 重构 + CI）
       │
       └─ v2.0 大版本开发基础就绪
```

---

## v1.0.0 — 基线版本

**状态**: ✅ 已完成 (tag: v1.0.0)

当前已完成的功能：
- 贪吃蛇核心游戏（速度选择、分数倍率）
- 用户注册/登录（Supabase Auth + session cookie）
- 排行榜（分页、分数提交）
- 游客模式（未登录可游玩，不计入排行榜）
- 响应式画布
- Vercel + Railway 全栈部署

---

## v1.0.1 — 核心 Bug 修复

**状态**: 🟢 已完成

### BUG-001: 后端测试失败 ✅
- **严重度**: HIGH
- **修复**: 更新 leaderboard 和 auth 测试 mock，添加缺失的 `auth.getUser` mock，修正错误信息断言，修复 `/me` 测试中 `mockFrom` 重置后缺少返回值的问题
- **文件**: `server/tests/routes/leaderboard.test.js`, `server/tests/routes/auth.test.js`

### BUG-002: 登录后一段时间变未登录 ✅
- **严重度**: HIGH
- **修复**: `authMiddleware` 在 `getUser()` 失败时自动用 `supabaseRefreshToken` 调 `setSession()` 刷新 token，成功后更新 session cookie
- **文件**: `server/src/middleware/auth.js`

### BUG-003: 前端未处理 token 过期 ✅
- **严重度**: MEDIUM
- **修复**: API client 添加 `onSessionExpired` 回调拦截 401；auth store 添加心跳机制（每 10 分钟刷新 + visibilitychange 触发）；登录/注册后自动启动心跳，登出或 session 失效时停止
- **文件**: `client/src/lib/api.js`, `client/src/stores/auth.js`

---

## v1.0.2 — 体验 Bug 修复

**状态**: 🟢 已完成

### BUG-004: 前端无登录状态心跳 ✅ (已在 BUG-003 中一并解决)
- **修复**: auth store 心跳机制已包含 10 分钟定时刷新 + visibilitychange 触发

### BUG-005: 登出无用户反馈 ✅
- **修复**: 顶部导航添加「退出」按钮，点击后显示 naive-ui success toast「已退出登录」
- **文件**: `client/src/views/GameView.vue`

### BUG-006: 游戏结束分数提交失败无明确提示 ✅
- **修复**: 区分 401（登录已过期）和其他错误，显示针对性提示信息
- **文件**: `client/src/views/GameView.vue`

---

## v1.1.0 — 游戏体验更新

**状态**: 🔴 未开始

### FEAT-001: 个人最高分展示
- **说明**: GameSidebar 显示当前登录用户的历史最高分
- **涉及**: 后端新增 API、前端 sidebar 组件

### FEAT-002: 排行榜当前用户高亮
- **说明**: LeaderboardModal 中高亮当前用户所在行
- **涉及**: `client/src/components/game/LeaderboardModal.vue`

### FEAT-003: 游戏暂停功能
- **说明**: 按空格键或 P 键暂停游戏，显示暂停遮罩
- **涉及**: `client/src/components/game/SnakeGame.vue`, `GameView.vue`

### FEAT-004: 记住速度偏好
- **说明**: 用 localStorage 记住上次选择的速度倍率
- **涉及**: `client/src/views/GameView.vue`

---

## v1.1.1 — 账户管理更新

**状态**: 🔴 未开始

### FEAT-005: 密码找回
- **说明**: 接入 Supabase `resetPasswordForEmail` 流程
- **涉及**: 新增 ResetPasswordView、后端 reset 路由

### FEAT-006: 用户名修改
- **说明**: 登录后可修改用户名（设置面板或弹窗）
- **涉及**: 后端新增 profile update API、前端设置组件

---

## v1.2.0 — 技术改善

**状态**: 🔴 未开始

### TECH-001: 测试覆盖率提升
- **目标**: 前后端测试覆盖率 >= 80%
- **当前**: 前端 16 tests (2 files)，后端 29 passed / 8 failed (6 files)
- **计划**: 补充 SnakeGame、GameView 组件测试；添加 E2E 测试覆盖核心流程

### TECH-002: GameView.vue 拆分
- **现状**: 571 行，职责过多（游戏控制、分数提交、弹窗管理、键盘事件）
- **计划**: 提取 `useGameSession` composable、提取分数提交逻辑、提取键盘快捷键处理

### TECH-003: 全局错误处理
- **现状**: 各组件各自 try-catch，错误提示不统一
- **计划**: API client 添加全局错误拦截，统一 toast 提示机制

### TECH-004: CI/CD 流水线
- **计划**: GitHub Actions 运行 lint + test + build，PR 时自动检查

---

## 变更日志

| 日期 | 变更内容 |
|------|----------|
| 2026-04-09 | 初始版本规划创建 |
| 2026-04-09 | v1.0.0 tag 已打；BUG-001/002/003/004 修复完成 |
| 2026-04-09 | BUG-005/006 修复完成，v1.0.1 + v1.0.2 全部完成 |
