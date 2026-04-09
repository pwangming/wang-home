# Kinetic Arcade 版本规划

> 最后更新: 2026-04-09
> 当前版本: v1.0.0 (待打 tag)

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

**状态**: 🟡 待打 tag

当前已完成的功能：
- 贪吃蛇核心游戏（速度选择、分数倍率）
- 用户注册/登录（Supabase Auth + session cookie）
- 排行榜（分页、分数提交）
- 游客模式（未登录可游玩，不计入排行榜）
- 响应式画布
- Vercel + Railway 全栈部署

---

## v1.0.1 — 核心 Bug 修复

**状态**: 🔴 未开始

### BUG-001: 后端测试失败
- **严重度**: HIGH
- **现象**: 8 个 server 测试失败，leaderboard routes 的 mock 与实际实现不匹配
- **文件**: `server/tests/routes/leaderboard.test.js`
- **修复方向**: 更新测试 mock 以匹配当前 leaderboard 路由实现

### BUG-002: 登录后一段时间变未登录
- **严重度**: HIGH
- **现象**: 登录成功后在首页停留一段时间，状态变为未登录
- **根因**: Supabase JWT 1 小时过期后，后端 `authMiddleware` 用过期的 access token 调 `getUser()` 失败，直接返回 401，没有尝试用 refresh token 续期
- **文件**: `server/src/middleware/auth.js`
- **修复方向**: 在 `getUser()` 失败时，用 session 中的 `supabaseRefreshToken` 调用 `setSession()` 刷新 token，成功后更新 session cookie

### BUG-003: 前端未处理 token 过期
- **严重度**: MEDIUM
- **现象**: 后端返回 401 后前端没有自动重试或跳转登录
- **文件**: `client/src/lib/api.js`, `client/src/stores/auth.js`
- **修复方向**: API client 拦截 401 响应，尝试重新调 `/auth/me`，失败则清空 auth store 并提示用户

---

## v1.0.2 — 体验 Bug 修复

**状态**: 🔴 未开始

### BUG-004: 前端无登录状态心跳
- **严重度**: MEDIUM
- **现象**: `auth.init()` 只在页面加载时调一次，长时间停留不会刷新状态
- **文件**: `client/src/stores/auth.js`
- **修复方向**: 添加定时器（如每 10 分钟）调 `/auth/me` 刷新状态；页面重新可见时（visibilitychange）也触发一次

### BUG-005: 登出无用户反馈
- **严重度**: LOW
- **现象**: 点击登出后静默清空状态，没有 toast 提示
- **文件**: `client/src/views/GameView.vue`
- **修复方向**: 登出成功后显示 naive-ui message 提示

### BUG-006: 游戏结束分数提交失败无明确提示
- **严重度**: LOW
- **现象**: 分数提交如果因 token 过期失败，用户只看到模糊错误
- **文件**: `client/src/views/GameView.vue`
- **修复方向**: 区分 401 错误和其他错误，给出针对性提示

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
