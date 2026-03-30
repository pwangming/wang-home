# Kinetic Arcade - 贪吃蛇游戏实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个完整的霓虹风格贪吃蛇游戏，包含用户认证、游戏、和排行榜功能；未登录访客可试玩但成绩不保存

**Architecture:**
- 前端: Vue 3 + Vite + Naive UI，通过 Koa API 与 Supabase 交互，实时排名直连 Supabase Realtime
- 后端: Koa 作为 API 网关，负责认证校验和业务逻辑
- 数据库: Supabase PostgreSQL + Auth (本地开发，上线迁移到云端；仅支持注册/登录用户保存成绩)

**Tech Stack:**
- Frontend: Vue 3, Vite, Naive UI, Pinia, Vue Router, Vitest
- Backend: Koa, Jest
- Database: Supabase CLI (本地), Supabase PostgreSQL
- E2E: Playwright CLI

---

## 开发流程说明

> **CLI 说明**: 本项目使用**本地 Supabase CLI** 和**本地 Playwright CLI**，无需检查是否安装。

### TDD 流程 (后端)

每个后端 Task 遵循：
```
写测试 (RED) → 运行测试验证失败 → 写实现 (GREEN) → 运行测试验证通过 → 重构
```

### 前端测试流程

- 组件单元测试: Vitest
- E2E 测试: Playwright CLI

### Supabase 本地开发流程

```
supabase start          # 启动本地 Supabase
supabase db push        # 推送本地迁移
supabase db reset       # 重置本地数据库（用于测试）
```

### Task 审查流程

每个 Task 完成后：
1. 展示创建/修改的文件列表
2. 运行测试并展示结果
3. 暂停等待审查
4. 确认后继续下一个 Task

### 执行偏差处理（强制）

当按计划执行时发现新问题（实现缺陷、测试失败、环境差异、计划遗漏），**必须按以下顺序处理**：
1. **先修复当前阻塞问题**（确保主线可以继续）
2. **立即更新执行计划**（同步原因、改动点、影响范围、验收变化）
3. **再继续后续 Task**

> 禁止“代码已改但计划未同步”继续推进，避免后续审查与交接失真。

**问题处理记录模板（可直接复制）**
```markdown
### 偏差修复记录 - YYYY-MM-DD HH:mm
- 问题描述: <一句话说明现象/触发条件>
- 根因判断: <一句话说明根因>
- 修复动作: <本次具体改动>
- 计划更新: <执行计划新增/修改的条目>
- 影响范围: <受影响模块/测试/验收项>
- 回归结果: <已验证内容与结果>
```

### 偏差修复记录 - 2026-03-30 00:00
- 问题描述: 原计划允许客户端直接提交最终分数与倍数，后端仅做格式校验即可入库，排行榜可被伪造。
- 根因判断: 分数提交链路缺少最小可信验证，错误地把客户端结果当作可信事实。
- 修复动作: 为对局提交流程补充“一次性 session + 单次提交 + 合理性校验 + verified 标记”，排行榜仅统计已验证成绩。
- 计划更新: 调整数据库 schema、接口设计、排行榜写入任务与验收项，新增对局开始接口与防重放校验。
- 影响范围: Supabase 迁移、Koa 路由、前端 API 客户端、游戏结束提交流程、Jest/Playwright 测试。
- 回归结果: 文档计划已同步，待后续实现时按新口径落地并验证。

### 偏差修复记录 - 2026-03-30 00:10
- 问题描述: 原设计同时存在“匿名游客可入榜”和“未登录玩家成绩不保存”两套互相冲突的规则。
- 根因判断: “游客”概念混用了匿名登录用户与未登录访客，导致需求边界不清。
- 修复动作: 统一收口为“未登录访客仅可试玩，成绩不保存”，删除匿名登录与匿名入榜计划。
- 计划更新: 移除匿名认证接口与相关实现预期，统一前端文案、接口设计和测试口径。
- 影响范围: 设计文档、认证路由任务、游戏主页流程、E2E 验收项。
- 回归结果: 文档计划已同步，后续仅实现注册/登录用户的成绩保存链路。

### 偏差修复记录 - 2026-03-30 00:20
- 问题描述: 原计划在应用层执行“signUp 后再插入 profiles”，中途失败会留下无 profile 的孤儿账号。
- 根因判断: 账号创建与 profile 建档未原子化，后续分数提交依赖 `profiles` 外键时会断链。
- 修复动作: 改为数据库自动建档，注册接口不再把手工插入 `profiles` 作为唯一成功路径。
- 计划更新: 在 Supabase 迁移中新增自动建档触发器/函数，调整注册任务、测试与验收项。
- 影响范围: 数据库迁移、认证路由、注册测试、`/api/auth/me` 与成绩提交流程。
- 回归结果: 文档计划已同步，后续实现时需验证注册后 profile 必然存在。

### 偏差修复记录 - 2026-03-30 00:30
- 问题描述: 原计划保留 `needsEmailConfirmation` 分支，但未明确未确认邮箱用户的登录态、前端跳转与成绩保存限制。
- 根因判断: 本地关闭邮箱确认的开发假设掩盖了云端开启邮箱确认时的真实状态机。
- 修复动作: 明确“注册成功但待邮箱确认”不等于已登录，补充注册页分支处理与验收要求。
- 计划更新: 调整认证路由返回口径、注册页行为、认证 Store 处理和相关测试。
- 影响范围: `POST /register`、认证 Store、注册页、E2E 测试、上线兼容性。
- 回归结果: 文档计划已同步，后续实现时需覆盖本地/云端两种注册成功态。

### 偏差修复记录 - 2026-03-30 00:40
- 问题描述: 原计划将 token 持久化到 `localStorage` 并通过 `Authorization` 头发送，XSS 后可直接窃取登录态。
- 根因判断: 会话模型过度依赖浏览器端可读凭证，缺少 BFF + HttpOnly Cookie 的安全边界。
- 修复动作: 统一改为 Koa 下发 HttpOnly 会话 Cookie，前端不再存储可读 token。
- 计划更新: 调整认证中间件、认证路由、前端 API 客户端、认证 Store、测试与验收项。
- 影响范围: 前后端鉴权流程、E2E 配置、会话安全基线、上线配置。
- 回归结果: 文档计划已同步，后续实现时按 Cookie 会话方案落地。

### 偏差修复记录 - 2026-03-30 00:50
- 问题描述: 认证和成绩提交链路缺少限流策略，存在撞库、批量注册和刷分滥用风险。
- 根因判断: 原计划只定义功能流程，未为高风险接口补充基础抗滥用防护。
- 修复动作: 为登录、注册、开始对局、提交成绩增加限流设计，并区分本地验证与生产实现。
- 计划更新: 新增限流中间件任务要求、接口阈值、本地验证方式和验收项。
- 影响范围: Koa 中间件、认证路由、排行榜路由、Jest/Playwright 测试、运维配置。
- 回归结果: 文档计划已同步，后续实现时本地先用内存限流，生产切换到共享存储。

### 偏差修复记录 - 2026-03-30 01:00
- 问题描述: 原计划一边要求排行榜通过后端聚合接口读取，一边又给 `leaderboard_best` 直接授予公开查询权限，架构边界冲突。
- 根因判断: 数据库视图授权与 API 网关职责定义不一致，导致后端统一控制可能被绕过。
- 修复动作: 收回排行榜视图直读权限，统一要求前端通过 Koa API 读取排行榜。
- 计划更新: 调整 Supabase 迁移说明、排行榜路由职责和验收项，删除前端直连排行榜视图的预期。
- 影响范围: 数据库授权、排行榜接口、限流/缓存/审计设计、前端数据访问边界。
- 回归结果: 文档计划已同步，后续实现时排行榜读流量必须经过 Koa。

### 偏差修复记录 - 2026-03-30 01:10
- 问题描述: 原计划中 `/api/leaderboard/rank/me` 的测试更接近返回用户记录，而非真实名次，接口语义不够明确。
- 根因判断: “排名”和“当前用户最佳成绩记录”两个概念在设计与测试中混用了。
- 修复动作: 明确 `/api/leaderboard/rank/me` 返回名次摘要，并要求按统一排序规则计算真实 rank。
- 计划更新: 调整接口返回结构、排行榜路由任务说明和验收项，补充并列排序测试要求。
- 影响范围: 排行榜路由、前端排行榜弹窗、Jest 测试、接口文档。
- 回归结果: 文档计划已同步，后续实现时需锁定真实 rank 计算。

### 偏差修复记录 - 2026-03-30 01:20
- 问题描述: 未登录试玩路径的 E2E 测试在首次游玩结束后才开始监听网络请求，无法覆盖整个会话生命周期。
- 根因判断: 网络级断言挂载时机过晚，导致“前半段是否偷偷提交成绩”存在测试盲区。
- 修复动作: 要求在进入页面前即开始监听相关请求，并覆盖整条未登录试玩路径。
- 计划更新: 调整未登录 E2E 用例，新增对 `POST /api/game-sessions/start`、`POST /api/leaderboard` 的全程断言。
- 影响范围: Playwright 测试、游戏主页验收、未登录试玩安全回归。
- 回归结果: 文档计划已同步，后续实现时需以网络级断言覆盖整个用例周期。

### 偏差修复记录 - 2026-03-30 01:30
- 问题描述: 原计划同时使用 `koa-session` 和“从 Cookie 直接读取 Supabase token”两套互斥会话模型，鉴权链路存在实现冲突。
- 根因判断: 服务端会话与第三方 JWT 的职责边界未明确，导致 Cookie 内容和用户态数据库访问来源混淆。
- 修复动作: 统一为“浏览器仅持有 Koa 会话 Cookie，Supabase access/refresh token 仅保存在服务端 session”。
- 计划更新: 调整 Koa session 说明、`authMiddleware`、`createUserScopedClient`、认证路由和登出逻辑。
- 影响范围: 认证中间件、认证路由、排行榜写入、会话续期设计、测试桩。
- 回归结果: 文档计划已同步，后续实现时不得再从 Cookie 直接读取 Supabase token。

### 偏差修复记录 - 2026-03-30 01:40
- 问题描述: 两阶段分数提交流程需要更新 `game_sessions`，但原 RLS 仅允许 insert/select，正常提交会被数据库拒绝。
- 根因判断: 数据写入模型已变为“先创建、后完成”，而 RLS 仍停留在单次 insert 模型。
- 修复动作: 为 `game_sessions` 增加“仅允许完成自己的 pending session”的受限 update 策略。
- 计划更新: 调整 Supabase 迁移、排行榜写入约束与验收项，禁止放开历史记录任意修改。
- 影响范围: 数据库 RLS、排行榜路由、两阶段提交测试、防重放策略。
- 回归结果: 文档计划已同步，后续实现时需验证 pending session 可更新、已完成 session 不可改。

### 偏差修复记录 - 2026-03-30 01:50
- 问题描述: 排行榜刷新触发器仍绑定在 `game_sessions` insert 上，与“两阶段提交后 update 才真正入榜”的模型不一致。
- 根因判断: 实时刷新链路未跟随新的成绩提交时机同步调整。
- 修复动作: 将排行榜刷新改为在 verified 成绩写入成功时触发，而非开始对局时触发。
- 计划更新: 调整 Supabase 触发器定义、排行榜弹窗验收项和 Realtime 测试预期。
- 影响范围: 数据库 trigger、leaderboard_events、实时刷新链路、前端排行榜弹窗。
- 回归结果: 文档计划已同步，后续实现时需验证 start 不触发、verified submit 才触发。

### 偏差修复记录 - 2026-03-30 02:00
- 问题描述: 切换到 Cookie 会话后，原计划仍缺少针对写接口的 CSRF 防护设计。
- 根因判断: 之前以 Bearer token 为前提设计接口，转为浏览器自动携带 Cookie 后未同步补上跨站请求防护。
- 修复动作: 为所有写接口加入 CSRF 防护要求，至少校验 `Origin`，并预留 `Referer`/CSRF token 扩展。
- 计划更新: 调整安全基线、中间件要求、前端 API 客户端和验收项。
- 影响范围: Koa 中间件、认证路由、游戏写接口、前端请求封装、本地开发配置。
- 回归结果: 文档计划已同步，后续实现时需验证跨站来源无法调用写接口。

### 偏差修复记录 - 2026-03-30 02:10
- 问题描述: 用户名目前仅做普通 UNIQUE 约束，缺少归一化、字符集限制和保留词策略，存在冒名与混淆风险。
- 根因判断: 展示名规则只定义了“唯一”，但没有定义“唯一是基于什么比较”。
- 修复动作: 为用户名增加规范化字段与统一校验规则，自动建档和手动改名使用同一套逻辑。
- 计划更新: 调整 `profiles` schema、自动建档函数、注册校验和验收项。
- 影响范围: Supabase 迁移、注册接口、个人资料更新、排行榜展示名、测试数据。
- 回归结果: 文档计划已同步，后续实现时需验证大小写/非法字符/保留词场景。

---

## 文件结构

```
/home
├── client/                              # Vue 3 前端
│   ├── src/
│   │   ├── components/...
│   │   ├── views/...
│   │   ├── stores/...
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   └── supabase.js
│   │   └── router/...
│   ├── tests/                          # Playwright E2E
│   │   ├── login.spec.js
│   │   ├── register.spec.js
│   │   └── game.spec.js
│   ├── playwright.config.js
│   ├── vitest.config.js
│   ├── package.json
│   └── vite.config.js
│
├── server/                              # Koa 后端
│   ├── src/
│   │   ├── routes/...
│   │   ├── middleware/...
│   │   └── index.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   └── leaderboard.test.js
│   ├── jest.config.js
│   └── package.json
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── 001_initial_schema.sql
│
└── docs/
```

---

## 运行前置

### 1. 环境变量

**`client/.env.local`**
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

**`server/.env`**
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-local-anon-key
SESSION_SECRET=replace-with-a-long-random-secret
RATE_LIMIT_STORE=memory
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

> 本地 Supabase 的 URL 和 keys 以 `supabase status` 输出为准

---

## Phase 0: Git 初始化

> **重要**: 项目起步即进入版本控制，确保每个功能点可追溯、可回滚。

- [ ] **Step 1: 在项目根目录初始化 Git 仓库**

```bash
cd <project-root>
git init
```

- [ ] **Step 2: 创建初始分支**

```bash
git checkout -b develop
```

- [ ] **Step 3: 创建 .gitignore**

```bash
# Node modules
node_modules/
*/node_modules/

# Environment files
.env
.env.local
.env.*.local

# Build outputs
dist/
build/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/

# Supabase (本地开发不提交)
supabase/.branches/
supabase/config.local.toml
```

- [ ] **Step 4: 初始提交**

```bash
git add .
git commit -m "chore: initial project structure

- Initialize Git repository
- Add .gitignore for Node/Vue/Supabase projects
- Create develop branch"
```

---

## Phase 1: 项目初始化

### Task 1: 初始化前端项目

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/vitest.config.js`
- Create: `client/playwright.config.js`
- Create: `client/index.html`
- Create: `client/src/main.js`
- Create: `client/src/App.vue`
- Create: `client/src/router/index.js`

**TDD:** 无 (基础架子)

**Playwright:** 无

- [ ] **Step 1: 创建 client/package.json**

```json
{
  "name": "kinetic-arcade-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "naive-ui": "^2.38.0",
    "@vicons/ionicons5": "^0.12.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^24.0.0",
    "@vue/test-utils": "^2.4.0",
    "@playwright/test": "^1.40.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
```

- [ ] **Step 3: 创建 vitest.config.js**

```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] **Step 4: 创建 playwright.config.js**

```javascript
import { defineConfig } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000'
  },
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 3000',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: __dirname
    },
    {
      command: 'npm run dev',
      port: 4000,
      reuseExistingServer: true,
      timeout: 120000,
      cwd: path.resolve(__dirname, '../server')
    }
  ]
})
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kinetic Arcade - 霓虹贪吃蛇</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: 创建 src/main.js**

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(naive)
app.mount('#app')
```

- [ ] **Step 7: 创建 src/App.vue**

```vue
<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { darkTheme } from 'naive-ui'
</script>
```

- [ ] **Step 8: 创建 src/router/index.js (临时空壳)**

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/game' },
  { path: '/login', component: () => import('../views/LoginView.vue') },
  { path: '/register', component: () => import('../views/RegisterView.vue') },
  { path: '/game', component: () => import('../views/GameView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

> **注意**：`/game` 无需登录即可访问，供未登录玩家试玩

- [ ] **Step 9: 安装依赖并验证**

```bash
cd client && npm install
npm run dev
# Expected: Vite dev server starts on port 3000
```

**[Task 1 审查点]**
- 文件创建完成
- 前端服务可启动

- [ ] **Step 10: 提交 Task 1**

```bash
git add .
git commit -m "feat: initialize frontend project

- Add Vue 3 + Vite + Naive UI setup
- Configure Vitest and Playwright
- Add basic routing with Login/Register/Game views"
```

---

### Task 2: 初始化后端项目 + Jest

**Files:**
- Create: `server/package.json`
- Create: `server/jest.config.js`
- Create: `server/src/index.js` (空壳)

**TDD:** 无 (基础架子)

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "kinetic-arcade-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "cross-env NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "cross-env NODE_OPTIONS=--experimental-vm-modules jest --watch"
  },
  "dependencies": {
    "koa": "^2.15.0",
    "koa-router": "^12.0.0",
    "koa-bodyparser": "^4.4.0",
    "koa-session": "^7.0.2",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "cross-env": "^7.0.3",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.0"
  }
}
```

- [ ] **Step 2: 创建 server/jest.config.js**

```javascript
export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
}
```

- [ ] **Step 3: 创建 server/src/index.js (空壳)**

```javascript
import 'dotenv/config'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import Router from 'koa-router'
import session from 'koa-session'

const app = new Koa()
const router = new Router()
app.keys = [process.env.SESSION_SECRET || 'dev-only-session-secret']

router.get('/api/health', (ctx) => {
  ctx.body = { status: 'ok' }
})

app.use(session({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}, app))
app.use(bodyParser())
app.use(router.routes())

const PORT = 4000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
```

- [ ] **Step 4: 安装依赖并验证**

```bash
cd server && npm install
npm run dev
# 新开一个 PowerShell 窗口执行：
Invoke-RestMethod http://localhost:4000/api/health
# Expected: {"status":"ok"}
```

**[Task 2 审查点]**
- 后端服务可启动
- Health check 正常

- [ ] **Step 5: 提交 Task 2**

```bash
git add .
git commit -m "feat: initialize backend project with Koa

- Add Koa server with bodyParser and router
- Configure Jest for backend testing
- Add health check endpoint /api/health"
```

---

### Task 3: 初始化本地 Supabase

**Files:**
- Create: `supabase/config.toml` (由 `supabase init` 生成)
- Create: `supabase/migrations/001_initial_schema.sql`

**Supabase CLI:**
- `supabase init`
- `supabase start`
- `supabase status` (查看本地 URL 和 keys)

- [ ] **Step 1: 初始化 Supabase 项目**

```bash
cd <project-root>
supabase init
# 在项目根目录创建 supabase/config.toml
```

- [ ] **Step 2: 启动本地 Supabase**

```bash
supabase start
# 等待容器启动完成
# 输出示例:
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 3: 创建初始迁移脚本**

```bash
# PowerShell
New-Item -ItemType Directory -Force supabase/migrations
# Bash
# mkdir -p supabase/migrations
```

```sql
-- supabase/migrations/001_initial_schema.sql

-- Enable extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  username_normalized text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game sessions table
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null unique default gen_random_uuid(),
  score integer not null check (score >= 0),
  speed_multiplier numeric(4,2) not null check (speed_multiplier > 0),
  score_multiplier numeric(4,2) not null check (score_multiplier > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  submit_source text,
  is_verified boolean not null default false,
  verification_reason text,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for leaderboard queries
create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);
create index if not exists idx_game_sessions_score on public.game_sessions(score desc);
create index if not exists idx_game_sessions_verified_score on public.game_sessions(is_verified, score desc);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;

-- Profiles: publicly readable, users can update own
create policy "profiles are publicly readable" on public.profiles
  for select using (true);
create policy "users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile when auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  raw_username text;
  normalized_username text;
  final_username text;
begin
  raw_username := coalesce(new.raw_user_meta_data->>'username', 'player_' || left(replace(new.id::text, '-', ''), 12));
  normalized_username := lower(regexp_replace(trim(raw_username), '[^a-zA-Z0-9_]', '', 'g'));
  if normalized_username = '' then
    normalized_username := 'player_' || left(replace(new.id::text, '-', ''), 12);
  end if;
  final_username := normalized_username;

  insert into public.profiles (id, username, username_normalized)
  values (
    new.id,
    final_username,
    normalized_username
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Game sessions: users can only read/insert their own
create policy "users can insert own sessions" on public.game_sessions
  for insert with check (auth.uid() = user_id);
create policy "users can read own sessions" on public.game_sessions
  for select using (auth.uid() = user_id);
create policy "users can finalize own pending sessions" on public.game_sessions
  for update using (auth.uid() = user_id and ended_at is null and is_verified = false)
  with check (auth.uid() = user_id);

-- Realtime event table (用于触发排行榜刷新，不暴露原始战绩)
create table if not exists public.leaderboard_events (
  id bigserial primary key,
  created_at timestamptz not null default now()
);
alter table public.leaderboard_events enable row level security;
create policy "leaderboard events are publicly readable" on public.leaderboard_events
  for select using (true);

create or replace function public.notify_leaderboard_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.leaderboard_events default values;
  return null;
end;
$$;

revoke all on function public.notify_leaderboard_refresh() from public;
revoke all on function public.notify_leaderboard_refresh() from anon;
revoke all on function public.notify_leaderboard_refresh() from authenticated;

drop trigger if exists trg_notify_leaderboard_refresh on public.game_sessions;
create trigger trg_notify_leaderboard_refresh
after update on public.game_sessions
for each row
when (old.is_verified = false and new.is_verified = true)
execute function public.notify_leaderboard_refresh();

-- Leaderboard view (best score per user)
create or replace view public.leaderboard_best as
with ranked as (
  select
    gs.user_id,
    gs.score as best_score,
    gs.played_at as best_score_at,
    row_number() over (
      partition by gs.user_id
      order by gs.score desc, gs.played_at asc, gs.id asc
    ) as rn
  from public.game_sessions gs
  where gs.is_verified = true
)
select
  r.user_id,
  p.username,
  p.avatar_url,
  r.best_score,
  r.best_score_at
from ranked r
join public.profiles p on p.id = r.user_id
where r.rn = 1
order by r.best_score desc, r.best_score_at asc, r.user_id asc;

-- Add realtime publication target
do $$
begin
  alter publication supabase_realtime add table public.leaderboard_events;
exception
  when duplicate_object then null;
end $$;
```

- [ ] **Step 4: 推送迁移到本地 Supabase**

```bash
supabase db push
# Expected: Pushed migration 001_initial_schema.sql successfully
```

- [ ] **Step 5: 验证数据库表**

```bash
# 使用 Supabase Studio (可选)
# 浏览器打开 http://localhost:54323

# 或使用 psql
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\dt"
# Expected: profiles, game_sessions 表存在
```

**[Task 3 审查点]**
- `supabase status` 显示运行中
- 数据库表已创建
- 环境变量配置正确
- `leaderboard_events` 表在 `supabase_realtime` publication 中
- Trigger 验证：
  ```bash
  psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_notify_leaderboard_refresh';"
  # Expected: trg_notify_leaderboard_refresh
  ```
- **邮箱验证检查**：确认本地 Supabase 已关闭邮箱确认
  ```bash
  # 查看 Auth 配置
  supabase status
  # 或通过 Supabase Studio (http://localhost:54323) -> Authentication -> Providers -> Email 查看确认邮件开关
  ```

  如果邮箱确认已开启，关闭步骤如下：

  - [ ] **Step A: 编辑 supabase/config.toml**

  在 `[auth]` 部分添加或修改：

  ```toml
  [auth]
  signing.signup_email_enable = false
  ```

  - [ ] **Step B: 重启 Supabase 使配置生效**

  ```bash
  supabase stop
  supabase start
  ```

  - [ ] **Step C: 验证配置已生效**

  ```bash
  # 通过 Supabase Studio 确认 Email provider 的 "Confirm email" 开关已关闭
  # 或通过 SQL 验证：
  psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT * FROM auth.config WHERE id = 'signup_email_enable';"
  # 预期结果：无记录或值为 false
  ```

- [ ] **Step 6: 提交 Task 3**

```bash
git add .
git commit -m "feat: setup local Supabase with database schema

- Add profiles and game_sessions tables
- Add leaderboard_events trigger for realtime updates
- Add leaderboard_best view for ranking
- Configure RLS policies
- Disable email confirmation for local dev"
```

---

## Phase 2: 后端 TDD

### Task 4: TDD - 认证中间件

**Files:**
- Create: `server/src/middleware/auth.js`
- Create: `server/src/middleware/rateLimit.js`
- Create: `server/src/middleware/csrf.js`
- Create: `server/tests/middleware/auth.test.js`

**TDD:**
- [ ] **Step 1: 编写测试 (RED)**

```javascript
// server/tests/middleware/auth.test.js
import { jest } from '@jest/globals'

// Mock Supabase
const mockGetUser = jest.fn()
jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: mockGetUser }
  }))
}))

const { authMiddleware } = await import('../../src/middleware/auth.js')

describe('authMiddleware', () => {
  let ctx, next

  beforeEach(() => {
    ctx = {
      headers: {},
      status: 200,
      body: null
    }
    next = jest.fn()
    mockGetUser.mockReset()
  })

  test('should return 401 when no authenticated session exists', async () => {
    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(ctx.body.error).toBe('Missing authenticated session')
    expect(next).not.toHaveBeenCalled()
  })

  test('should return 401 when token is invalid', async () => {
    ctx.cookies = { get: jest.fn(() => 'invalid-token') }
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid') })

    await authMiddleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('should call next and set user when token is valid', async () => {
    const mockUser = { id: '123', email: 'test@test.com' }
    ctx.cookies = { get: jest.fn(() => 'valid-token') }
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    await authMiddleware(ctx, next)
    expect(ctx.state.user).toEqual(mockUser)
    expect(next).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server && npm test -- --testPathPattern=auth.test.js
# Expected: FAIL (authMiddleware not yet implemented)
```

- [ ] **Step 3: 编写实现 (GREEN)**

```javascript
// server/src/middleware/auth.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function createUserScopedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    }
  })
}

export async function authMiddleware(ctx, next) {
  const token = ctx.session?.supabaseAccessToken
  if (!token) {
    ctx.status = 401
    ctx.body = { error: 'Missing authenticated session' }
    return
  }
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    ctx.status = 401
    ctx.body = { error: 'Invalid or expired token' }
    return
  }

  ctx.state.user = {
    id: data.user.id,
    email: data.user.email
  }
  await next()
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- --testPathPattern=auth.test.js
# Expected: PASS
```

**[Task 4 审查点]**
- 测试全部通过
- 代码符合规范
- 认证与限流中间件可单独验证

- [ ] **Step 5: 提交 Task 4**

```bash
git add .
git commit -m "feat: add auth middleware for cookie session validation

- Add authMiddleware to validate HttpOnly session cookie
- Add createUserScopedClient for server-side user session queries
- All tests passing with Jest"
```

---

### Task 5: TDD - 认证路由

**Files:**
- Create: `server/src/routes/auth.js`
- Create: `server/tests/routes/auth.test.js`

**TDD:**
- [ ] **Step 1: 编写测试 (RED)**

```javascript
// server/tests/routes/auth.test.js
import { jest } from '@jest/globals'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import request from 'supertest'

function normalizeToKoaApp(appOrRouter) {
  if (typeof appOrRouter?.callback === 'function') return appOrRouter
  const app = new Koa()
  app.use(bodyParser())
  app.use(appOrRouter.routes())
  app.use(appOrRouter.allowedMethods())
  return app
}

async function simulateRequest(appOrRouter, method, path, body = null, headers = {}) {
  const app = normalizeToKoaApp(appOrRouter)
  let req = request(app.callback())[method.toLowerCase()](path)
  for (const [key, value] of Object.entries(headers)) {
    req = req.set(key, value)
  }
  if (body !== null) req = req.send(body)
  const res = await req
  return { status: res.status, body: res.body }
}

const mockAuth = {
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn()
}

const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn()
}))

const mockCreateClient = jest.fn(() => ({
  auth: mockAuth,
  from: mockFrom
}))

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}))

const { default: authRouter } = await import('../../src/routes/auth.js')

describe('Auth Routes', () => {
  let app

  beforeEach(() => {
    app = authRouter()
    mockAuth.signUp.mockReset()
    mockAuth.signInWithPassword.mockReset()
    mockAuth.signOut.mockReset()
    mockAuth.getUser.mockReset()
    mockFrom.mockReset()
  })

  // ========== /register ==========
  describe('POST /register', () => {
    test('returns 400 when email is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/register', { password: '123456', username: 'test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email, password and username are required')
    })

    test('returns 400 when password is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/register', { email: 'test@test.com', username: 'test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email, password and username are required')
    })

    test('returns 400 when username is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/register', { email: 'test@test.com', password: '123456' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email, password and username are required')
    })

    test('returns 400 when email already exists', async () => {
      mockAuth.signUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } })
      const res = await simulateRequest(app, 'POST', '/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('User already registered')
    })

    test('returns 200 and sets session cookie when success (local Supabase: email confirmation disabled)', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: '123', username: 'test', username_normalized: 'test' },
          error: null
        })
      })

      const res = await simulateRequest(app, 'POST', '/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user.id).toBe('123')
      expect(mockFrom).toHaveBeenCalledWith('profiles')
      // 本地 Supabase 已关闭邮箱确认，不会返回 needsEmailConfirmation
    })

    test('returns 500 when auto-created profile is missing after signUp', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      const res = await simulateRequest(app, 'POST', '/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(500)
      expect(res.body.error).toBeTruthy()
    })

    test('returns needsEmailConfirmation=true when email confirmation is enabled', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      const res = await simulateRequest(app, 'POST', '/register', {
        email: 'test@test.com', password: '123456', username: 'test'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.needsEmailConfirmation).toBe(true)
    })
  })

  // ========== /login ==========
  describe('POST /login', () => {
    test('returns 400 when email is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/login', { password: '123456' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email and password are required')
    })

    test('returns 400 when password is missing', async () => {
      const res = await simulateRequest(app, 'POST', '/login', { email: 'test@test.com' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('email and password are required')
    })

    test('returns 401 when user not found', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
      const res = await simulateRequest(app, 'POST', '/login', {
        email: 'test@test.com', password: 'wrong'
      })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid login credentials')
    })

    test('returns 401 when wrong password', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } })
      const res = await simulateRequest(app, 'POST', '/login', {
        email: 'test@test.com', password: 'wrong'
      })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Invalid login credentials')
    })

    test('returns 200 and sets session cookie on success', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const mockSession = { access_token: 'mock-token', refresh_token: 'mock-refresh' }
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      const res = await simulateRequest(app, 'POST', '/login', {
        email: 'test@test.com', password: '123456'
      })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.success).toBe(true)
      expect(res.body.user.email).toBe('test@test.com')
    })
  })

  // ========== /me ==========
  describe('GET /me', () => {
    test('returns 401 when no authorization header', async () => {
      const res = await simulateRequest(app, 'GET', '/me', null, {})
      expect(res.status).toBe(401)
    })

    test('returns 401 when token invalid', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') })
      const res = await simulateRequest(app, 'GET', '/me', null, null, { Cookie: 'session=invalid-token' })
      expect(res.status).toBe(401)
    })

    test('returns user data when token valid', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      mockAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      const res = await simulateRequest(app, 'GET', '/me', null, null, { Cookie: 'session=valid-token' })
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe('123')
      expect(res.body.user.email).toBe('test@test.com')
    })
  })

  // ========== /logout ==========
  describe('POST /logout', () => {
    test('always returns 200 (client clears local state)', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null })
      const res = await simulateRequest(app, 'POST', '/logout', null, { Cookie: 'session=some-token' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server
npm test -- --testPathPattern=auth.test.js
```

- [ ] **Step 3: 编写实现 (GREEN)**
- 路由需包含：`/register`、`/login`、`/logout`、`/me`
- 返回口径统一：`{ success, user, needsEmailConfirmation? }`
- `POST /register` 不再手工插入 `public.profiles` 作为主流程，而是依赖数据库自动建档；接口需校验注册完成后 profile 已存在，否则返回错误并记录异常
- 用户名必须统一规范化后再存储和比较；自动建档、注册校验、用户改名共用同一规则
- 登录/注册成功时由 Koa 创建服务端 session，并设置 `HttpOnly` 会话 Cookie；前端不得读取或持久化 token
- 服务端 session 中保存 `supabaseAccessToken`、必要时保存 `supabaseRefreshToken` 与 `userId`
- 使用 `authMiddleware + createUserScopedClient`，确保 `/me` 基于服务端 session 中的 Supabase 凭证读取当前用户
- 若 `needsEmailConfirmation=true`，接口应明确返回“注册成功但需确认邮箱”，且不设置登录 Cookie
- 不实现 `/api/auth/anonymous`；未登录访客仅可试玩，不能保存成绩
- `POST /login` 与 `POST /register` 必须挂载限流中间件
- 所有写接口必须挂载 CSRF 防护中间件，至少校验 `Origin`；本地开发允许 `ALLOWED_ORIGINS`
- 默认阈值：
  - `POST /login`: 每 IP 15 分钟最多 5 次失败尝试
  - `POST /register`: 每 IP 每小时最多 3 次
- 超限统一返回 `429` + `"请求过于频繁，请稍后再试"`

- [ ] **Step 4: 运行测试并重构**

```bash
npm test -- --testPathPattern=auth.test.js
```

**[Task 5 审查点]**
- 测试全部通过
- 认证 API 正常工作

- [ ] **Step 4: 提交 Task 5**

```bash
git add .
git commit -m "feat: add authentication routes (register/login/logout/me)

- Add POST /api/auth/register with auto-created profile verification
- Add POST /api/auth/login
- Add POST /api/auth/logout
- Add GET /api/auth/me
- All tests passing"
```

---

### Task 6: TDD - 排行榜路由

**Files:**
- Create: `server/src/routes/leaderboard.js`
- Create: `server/tests/routes/leaderboard.test.js`

**TDD:**
- [ ] **Step 1: 编写测试 (RED)**

```javascript
// server/tests/routes/leaderboard.test.js
import { jest } from '@jest/globals'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import request from 'supertest'

function normalizeToKoaApp(appOrRouter) {
  if (typeof appOrRouter?.callback === 'function') return appOrRouter
  const app = new Koa()
  app.use(bodyParser())
  app.use(appOrRouter.routes())
  app.use(appOrRouter.allowedMethods())
  return app
}

async function simulateRequest(appOrRouter, method, path, body = null, headers = {}) {
  const app = normalizeToKoaApp(appOrRouter)
  let req = request(app.callback())[method.toLowerCase()](path)
  for (const [key, value] of Object.entries(headers)) {
    req = req.set(key, value)
  }
  if (body !== null) req = req.send(body)
  const res = await req
  return { status: res.status, body: res.body }
}

// Mock auth middleware
const mockAuthMiddleware = jest.fn(async (ctx, next) => {
  const cookie = ctx.headers.cookie || ''
  if (!cookie.includes('session=')) {
    ctx.status = 401
    ctx.body = { error: 'Unauthorized' }
    return
  }
  ctx.state.user = { id: 'test-user-id', email: 'test@test.com' }
  await next()
})

// Mock Supabase client
const mockFrom = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  insert: jest.fn().mockReturnThis()
}))

const mockCreateClient = jest.fn(() => ({
  from: mockFrom
}))

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient
}))

const leaderboardRouter = (await import('../../src/routes/leaderboard.js')).default

describe('Leaderboard Routes', () => {
  let app

  beforeEach(() => {
    mockFrom.mockReset()
  })

  // ========== GET /leaderboard ==========
  describe('GET /leaderboard', () => {
    test('returns paginated ranking ordered by best_score desc', async () => {
      const mockData = [
        { user_id: '1', username: 'alice', best_score: 100, best_score_at: '2024-01-01' },
        { user_id: '2', username: 'bob', best_score: 80, best_score_at: '2024-01-02' }
      ]
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/leaderboard?page=1&pageSize=20')
      expect(res.status).toBe(200)
      expect(res.body.leaderboard).toEqual(mockData)
    })

    test('returns empty array when no scores', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: [], error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/leaderboard?page=1&pageSize=20')
      expect(res.status).toBe(200)
      expect(res.body.leaderboard).toEqual([])
    })
  })

  // ========== GET /leaderboard/rank/me ==========
  describe('GET /leaderboard/rank/me', () => {
    test('returns 401 when no authorization header', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/leaderboard/rank/me', null, {})
      expect(res.status).toBe(401)
    })

    test('returns null when user has no score', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/leaderboard/rank/me', null, {
        Cookie: 'session=valid-token'
      })
      expect(res.status).toBe(200)
      expect(res.body.rank).toBeNull()
    })

    test('returns rank when user has score', async () => {
      const mockRankData = {
        user_id: 'test-user-id',
        username: 'testuser',
        best_score: 50,
        best_score_at: '2024-01-01'
      }
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockRankData, error: null })
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'GET', '/leaderboard/rank/me', null, {
        Cookie: 'session=valid-token'
      })
      expect(res.status).toBe(200)
      expect(res.body.rank).toEqual(mockRankData)
    })
  })

  // ========== POST /leaderboard ==========
  describe('POST /leaderboard', () => {
    test('returns 401 when unauthenticated', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/leaderboard', {
        score: 100,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, {})
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('未登录，无法保存分数')
    })

    test('returns 400 when score is missing', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/leaderboard', {
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('score, speedMultiplier and scoreMultiplier are required')
    })

    test('returns 400 when score is negative', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/leaderboard', {
        score: -10,
        speedMultiplier: 1.0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('score must be a non-negative integer')
    })

    test('returns 400 when speedMultiplier is invalid', async () => {
      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/leaderboard', {
        score: 100,
        speedMultiplier: 0,
        scoreMultiplier: 1.0
      }, { Cookie: 'session=valid-token' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('speedMultiplier must be a positive number')
    })

    test('inserts score via user-scoped client on success', async () => {
      const mockInsert = jest.fn().mockReturnThis()
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'session-id', score: 100 },
        error: null
      })
      mockFrom.mockReturnValue({
        insert: mockInsert,
        single: mockSingle
      })

      app = leaderboardRouter()
      const res = await simulateRequest(app, 'POST', '/leaderboard', {
        score: 100,
        speedMultiplier: 1.5,
        scoreMultiplier: 2.0
      }, { Cookie: 'session=valid-token' })
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        score: 100,
        speed_multiplier: 1.5,
        score_multiplier: 2.0
      }))
    })
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd server
npm test -- --testPathPattern=leaderboard.test.js
```

- [ ] **Step 3: 编写实现 (GREEN)**
- `GET /api/leaderboard` 按 `best_score desc, best_score_at asc, user_id asc` 排序
- `GET /api/leaderboard/rank/me` 仅基于 `leaderboard_best` 计算真实名次，并返回 `{ rank, bestScore, bestScoreAt, totalPlayers }`
- 前端不得直接查询 `leaderboard_best`；排行榜与个人排名读取统一通过 Koa API 输出
- 未登录调用 `POST /api/leaderboard` 必须返回 401 + 错误消息 `"未登录，无法保存分数"`（后端安全防护）
- 分数提交改为“两阶段”：
- `POST /api/game-sessions/start` 创建一次性对局 session，返回 `sessionId`
- `POST /api/leaderboard` 提交 `sessionId + score + speedMultiplier + scoreMultiplier + endedAt + durationMs`
- `POST /api/leaderboard` 使用 `createUserScopedClient(ctx.session.supabaseAccessToken)` 更新当前用户自己的 `game_sessions`
- 后端必须执行最小验证：
  - `sessionId` 存在、属于当前用户、且未提交过
  - `speedMultiplier` 仅允许 1.0/1.2/1.5/2.0
  - `scoreMultiplier` 必须与速度档位映射一致
  - `durationMs`、`started_at`、`ended_at` 可推导出合理对局时长
  - 分数必须落在该档位和时长允许的合理区间内
  - 校验通过后写入 `score/ended_at/is_verified=true`，失败则拒绝入榜并记录 `verification_reason`
- 同一 `sessionId` 只能成功提交一次，重复提交必须返回冲突错误，防止重放
- 仅允许更新当前用户自己的 pending session；已完成或已验证 session 不得再次修改核心成绩字段
- `POST /api/game-sessions/start` 与 `POST /api/leaderboard` 必须挂载限流中间件
- `POST /api/game-sessions/start` 与 `POST /api/leaderboard` 必须挂载 CSRF 防护中间件
- 默认阈值：
  - `POST /api/game-sessions/start`: 每用户每分钟最多 10 次
  - `POST /api/leaderboard`: 每用户每分钟最多 10 次
- 本地开发使用内存限流器即可验证；生产部署应切换到 Redis 或其他共享存储

- [ ] **Step 4: 运行测试并重构**

```bash
npm test -- --testPathPattern=leaderboard.test.js
```

**[Task 6 审查点]**
- 测试全部通过
- 排行榜 API 正常工作

- [ ] **Step 5: 提交 Task 6**

```bash
git add .
git commit -m "feat: add leaderboard routes (list/rank/submit)

- Add GET /api/leaderboard with pagination
- Add GET /api/leaderboard/rank/me for user ranking
- Add POST /api/leaderboard for score submission
- All tests passing"
```

---

## Phase 3: 前端 + E2E

### Task 7: 创建前端 API 客户端 + Supabase 客户端

**Files:**
- Create: `client/src/lib/api.js`
- Create: `client/src/lib/supabase.js`

**Vitest:** 无

**Playwright:** 无

- [ ] **Step 1: 创建 API 客户端**

```javascript
// client/src/lib/api.js
const API_BASE = '/api'

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  auth: {
    register: (email, password, username) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, username }) }),
    login: (email, password) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me')
  },
  leaderboard: {
    list: (page = 1, pageSize = 20) =>
      request(`/leaderboard?page=${page}&pageSize=${pageSize}`),
    getMyRank: () => request('/leaderboard/rank/me'),
    startSession: (speedMultiplier) =>
      request('/game-sessions/start', { method: 'POST', body: JSON.stringify({ speedMultiplier }) }),
    submitScore: (sessionId, score, speedMultiplier, scoreMultiplier, endedAt, durationMs) =>
      request('/leaderboard', {
        method: 'POST',
        body: JSON.stringify({ sessionId, score, speedMultiplier, scoreMultiplier, endedAt, durationMs })
      })
  }
}
```

- [ ] **Step 2: 创建 Supabase 客户端**

```javascript
// client/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**[Task 7 审查点]**
- 文件创建完成

- [ ] **Step 3: 提交 Task 7**

```bash
git add .
git commit -m "feat: add frontend API client and Supabase client

- Add api.js with auth and leaderboard endpoints
- Add supabase.js for realtime subscriptions"
```

---

### Task 8: 创建认证 Store

**Files:**
- Create: `client/src/stores/auth.js`
- Create: `client/tests/stores/auth.test.js` (Vitest)

**Vitest:**
- [ ] **Step 1: 编写测试**

```javascript
// client/tests/stores/auth.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock api
vi.mock('../../src/lib/api.js', () => ({
  api: {
    auth: {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      me: vi.fn()
    }
  }
}))

// Import after mocks
const { createAuthStore } = await import('../../src/stores/auth.js')

describe('auth Store', () => {
  let store

  beforeEach(() => {
    store = createAuthStore()
  })

  describe('initial state', () => {
    test('should have user as null initially', () => {
      expect(store.user).toBeNull()
    })

    test('should have isLoading as false initially', () => {
      expect(store.isLoading).toBe(false)
    })
  })

  describe('init()', () => {
    test('should remain logged out when /me has no session', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.me.mockRejectedValue(new Error('Missing session'))
      await store.init()
      expect(store.user).toBeNull()
    })

    test('should set user when cookie session is valid', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.me.mockResolvedValue({ user: mockUser })

      await store.init()
      expect(store.user).toEqual(mockUser)
    })

    test('should reset user when cookie session is invalid', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.me.mockRejectedValue(new Error('Invalid token'))

      await store.init()
      expect(store.user).toBeNull()
    })
  })

  describe('login()', () => {
    test('should set user on success and rely on cookie session', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.login.mockResolvedValue({ user: mockUser })

      await store.login('test@test.com', 'password123')

      expect(store.user).toEqual(mockUser)
    })

    test('should throw error on failure', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.login.mockRejectedValue(new Error('Invalid credentials'))

      await expect(store.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials')
      expect(store.user).toBeNull()
    })
  })

  describe('register()', () => {
    test('should set user on success when server creates cookie session', async () => {
      const mockUser = { id: '123', email: 'test@test.com' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.register.mockResolvedValue({ user: mockUser })

      await store.register('test@test.com', 'password123', 'testuser')

      expect(store.user).toEqual(mockUser)
    })

    test('should throw error on failure', async () => {
      const { api } = await import('../../src/lib/api.js')
      api.auth.register.mockRejectedValue(new Error('Registration failed'))

      await expect(store.register('test@test.com', 'password', 'user')).rejects.toThrow('Registration failed')
    })
  })

  describe('logout()', () => {
    test('should clear user even if logout API fails', async () => {
      store.user = { id: '123' }
      const { api } = await import('../../src/lib/api.js')
      api.auth.logout.mockRejectedValue(new Error('Network error'))

      await store.logout()

      expect(store.user).toBeNull()
    })
  })
})
```

- [ ] **Step 2: 编写实现**
- `auth.js` 至少包含：`init/login/register/logout`
- `init()`: 应用启动时直接调用 `/api/auth/me`，由 Cookie 会话判断是否已登录
  - 如果会话有效，设置用户状态
  - 如果会话无效或验证失败，重置为未登录状态
- `login`/`register` 成功后由服务端设置 Cookie，会话不在前端持久化
- `register` 需区分两种成功态：
  - 返回已登录用户时进入游戏
  - 返回 `needsEmailConfirmation=true` 时不进入登录态，前端进入“待确认邮箱”提示流程
- `logout` 使用 `try/finally` 清理本地状态（即使接口失败），并请求服务端清除 Cookie

- [ ] **Step 3: 运行 Vitest**

```bash
cd client
npm run test -- tests/stores/auth.test.js
```

**[Task 8 审查点]**
- Store 创建完成

- [ ] **Step 4: 提交 Task 8**

```bash
git add .
git commit -m "feat: add auth store with Pinia

- Add init/login/register/logout methods
- Add cookie session validation via /api/auth/me
- All Vitest tests passing"
```

---

### Task 9: 登录页 + E2E 测试

**Files:**
- Create: `client/src/views/LoginView.vue`
- Create: `client/tests/e2e/login.spec.js`

**Vitest:** 组件测试

**Playwright E2E:**
- [ ] **Step 1: 编写 Playwright 测试**
- **注意**: 每个测试使用唯一账号避免并发冲突（`test-${Date.now()}@test.com`）

```javascript
// client/tests/e2e/login.spec.js
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
    await page.context().clearCookies()
    await page.goto('/login')
    return user
  }

  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText('登录')
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
    await expect(page.locator('text=登录失败')).toBeVisible()
  })
})
```

- [ ] **Step 2: 实现 LoginView.vue**
- 表单提交调用 `api.auth.login`
- 提供跳转注册页入口，不提供匿名登录按钮
- 登录成功后跳转 `/game`，失败时显示错误消息

- [ ] **Step 3: 运行 E2E 测试**

```bash
cd <project-root>
supabase start
cd client
npx playwright test
```

**[Task 9 审查点]**
- 登录页功能正常
- E2E 测试通过

- [ ] **Step 4: 提交 Task 9**

```bash
git add .
git commit -m "feat: add login page with E2E tests

- Add LoginView.vue with form validation
- Add redirect to /game on success
- Add error message display on failure
- All Playwright E2E tests passing"
```

---

### Task 10: 注册页 + E2E 测试

**Files:**
- Create: `client/src/views/RegisterView.vue`
- Create: `client/tests/e2e/register.spec.js`

**Step:**
- [ ] 提交注册后处理两种结果：`needsEmailConfirmation=true` 显示确认提示；否则由服务端建立 Cookie 会话并直接进入 `/game`
- [ ] 注册页不依赖验证码占位逻辑（避免未实现功能阻塞主流程）
- [ ] **注意**: 本地 Supabase 已关闭邮箱确认，`needsEmailConfirmation=true` 分支不会触发，但代码中保留此逻辑
- [ ] **Playwright E2E**: 每个测试使用唯一账号避免并发冲突

```javascript
// client/tests/e2e/register.spec.js
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

  test('should show pending-confirmation state when needsEmailConfirmation=true', async ({ page }) => {
    // Mock or test env path: register succeeds but requires email confirmation
    // Assert page shows confirmation instructions and does not treat user as logged in
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
    await expect(page.locator('text=User already registered')).toBeVisible()
  })

  test('should show validation error when fields missing', async ({ page }) => {
    await page.goto('/register')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=不能为空')).toBeVisible()
  })
})
```

- [ ] Playwright 覆盖"注册成功路径"和"参数校验失败路径"

**[Task 10 审查点]**
- 注册页功能正常
- E2E 测试通过

- [ ] **Step: 提交 Task 10**

```bash
git add .
git commit -m "feat: add register page with E2E tests

- Add RegisterView.vue with form validation
- Handle needsEmailConfirmation flag
- All Playwright E2E tests passing"
```

---

### Task 11: 贪吃蛇游戏组件 + Vitest

**Files:**
- Create: `client/src/components/game/SnakeGame.vue`
- Create: `client/tests/components/SnakeGame.test.js`

**Step:**
- [ ] 实现基础游戏循环、碰撞检测、得分事件
- [ ] **速度倍数**: 玩家游戏前选择，默认 1.0，可选 1.2 / 1.5 / 2.0
- [ ] **分数倍数**: 由速度自动计算（固定映射，不可选）
  | 速度 | 分数倍数 |
  |------|---------|
  | 1.0  | 1.0     |
  | 1.2  | 1.5     |
  | 1.5  | 2.0     |
  | 2.0  | 3.0     |
- [ ] 最终得分 = 基础得分 × 分数倍数
- [ ] **键盘控制**: 支持方向键移动，**Escape 键结束游戏**
- [ ] **Vitest 覆盖**：

```javascript
// client/tests/components/SnakeGame.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SnakeGame from '../src/components/game/SnakeGame.vue'

describe('SnakeGame Component', () => {
  let wrapper

  const defaultProps = {
    speedMultiplier: 1.0,
    scoreMultiplier: 1.0
  }

  beforeEach(() => {
    wrapper = mount(SnakeGame, {
      props: defaultProps
    })
  })

  describe('scoring', () => {
    test('increases score when snake eats food', async () => {
      const initialScore = wrapper.vm.score
      // Simulate snake eating food
      wrapper.vm.handleEatFood()
      expect(wrapper.vm.score).toBe(initialScore + 1)
    })

    test('applies score multiplier when eating food', async () => {
      const props = { speedMultiplier: 1.5, scoreMultiplier: 2.0 }
      wrapper = mount(SnakeGame, { props })
      const initialScore = wrapper.vm.score
      wrapper.vm.handleEatFood()
      // Score should increase by base * multiplier
      expect(wrapper.vm.score).toBe(initialScore + 1 * 2.0)
    })
  })

  describe('collision detection', () => {
    test('ends game when snake hits wall', async () => {
      wrapper.vm.handleWallCollision()
      // Should emit gameOver event
      expect(wrapper.emitted('gameOver')).toBeTruthy()
      const gameOverEvent = wrapper.emitted('gameOver')[0]
      expect(gameOverEvent).toEqual(expect.arrayContaining([expect.any(Number)]))
    })

    test('passes correct parameters on game over', async () => {
      wrapper.vm.score = 50
      wrapper.vm.handleWallCollision()
      const gameOverEvent = wrapper.emitted('gameOver')[0]
      expect(gameOverEvent[0]).toBe(50) // finalScore
      expect(gameOverEvent[1]).toBe(1.0) // speedMultiplier
      expect(gameOverEvent[2]).toBe(1.0) // scoreMultiplier
    })
  })

  describe('reverse movement prevention', () => {
    test('cannot move in opposite direction directly', async () => {
      const initialDirection = wrapper.vm.direction
      // Trying to move opposite should be prevented
      const opposite = {
        up: 'down',
        down: 'up',
        left: 'right',
        right: 'left'
      }
      const newDirection = opposite[initialDirection]
      wrapper.vm.setDirection(newDirection)
      // Direction should not change to opposite
      expect(wrapper.vm.direction).toBe(initialDirection)
    })

    test('can change to perpendicular direction', async () => {
      const initialDirection = wrapper.vm.direction
      const perpendicular = {
        up: 'left',
        down: 'right',
        left: 'down',
        right: 'up'
      }
      const newDirection = perpendicular[initialDirection]
      wrapper.vm.setDirection(newDirection)
      expect(wrapper.vm.direction).toBe(newDirection)
    })
  })

  describe('speed multiplier', () => {
    test('applies correct speed multiplier', () => {
      const props = { speedMultiplier: 2.0, scoreMultiplier: 3.0 }
      wrapper = mount(SnakeGame, { props })
      // Game speed should be a number and affected by multiplier
      expect(typeof wrapper.vm.gameSpeed).toBe('number')
      expect(wrapper.vm.gameSpeed).toBeLessThan(1000) // base speed / multiplier
    })
  })

  describe('score multiplier mapping', () => {
    test.each([
      [1.0, 1.0],
      [1.2, 1.5],
      [1.5, 2.0],
      [2.0, 3.0]
    ])('speed %p maps to score multiplier %p', (speed, expectedScoreMult) => {
      const props = { speedMultiplier: speed, scoreMultiplier: expectedScoreMult }
      wrapper = mount(SnakeGame, { props })
      wrapper.vm.handleEatFood()
      // Base score is 1, multiplied by expectedScoreMult
      expect(wrapper.vm.score).toBe(1 * expectedScoreMult)
    })
  })

  describe('boundary cases', () => {
    test('score cannot become negative', async () => {
      wrapper.vm.score = 0
      wrapper.vm.handleWallCollision()
      // Score should not be negative after any operation
      expect(wrapper.vm.score).toBeGreaterThanOrEqual(0)
    })

    test('handles self-collision', async () => {
      wrapper.vm.handleSelfCollision()
      expect(wrapper.emitted('gameOver')).toBeTruthy()
    })

    test('eating food multiple times accumulates correctly', async () => {
      wrapper.vm.score = 0
      const multiplier = wrapper.vm.scoreMultiplier || 1
      wrapper.vm.handleEatFood()
      wrapper.vm.handleEatFood()
      wrapper.vm.handleEatFood()
      expect(wrapper.vm.score).toBe(3 * multiplier)
    })

    test('rejects invalid direction values', async () => {
      const initialDirection = wrapper.vm.direction
      wrapper.vm.setDirection('invalid_direction')
      expect(wrapper.vm.direction).toBe(initialDirection)
    })

    test('handles very large score', async () => {
      wrapper.vm.score = 999999
      wrapper.vm.handleEatFood()
      expect(wrapper.vm.score).toBeGreaterThan(999999)
    })
  })
})
```

- [ ] 游戏结束时向上层抛出 `gameOver(finalScore, speedMultiplier, scoreMultiplier)`

**[Task 11 审查点]**
- 游戏组件功能正常
- Vitest 测试通过
- 支持键盘方向键移动和 Escape 结束游戏

- [ ] **Step: 提交 Task 11**

```bash
git add .
git commit -m "feat: add SnakeGame component with Vitest

- Add game loop with collision detection
- Add speed multiplier selection (1.0/1.2/1.5/2.0)
- Add score multiplier mapping
- Add keyboard controls (arrows + Escape)
- All Vitest tests passing"
```

---

### Task 12: 侧边栏组件 + Vitest

**Files:**
- Create: `client/src/components/game/GameSidebar.vue`
- Create: `client/tests/components/GameSidebar.test.js`

**Step:**
- [ ] 展示当前得分、速度倍数、得分倍数
- [ ] 点击"排行榜"按钮触发 `openLeaderboard` 事件

**Vitest:**

```javascript
// client/tests/components/GameSidebar.test.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GameSidebar from '../src/components/game/GameSidebar.vue'

describe('GameSidebar Component', () => {
  const defaultProps = {
    score: 0,
    speedMultiplier: 1.0,
    scoreMultiplier: 1.0
  }

  describe('display', () => {
    test('shows current score', () => {
      const props = { ...defaultProps, score: 100 }
      const wrapper = mount(GameSidebar, { props })
      expect(wrapper.text()).toContain('100')
    })

    test('shows speed multiplier', () => {
      const props = { ...defaultProps, speedMultiplier: 1.5 }
      const wrapper = mount(GameSidebar, { props })
      expect(wrapper.text()).toContain('1.5')
    })

    test('shows score multiplier', () => {
      const props = { ...defaultProps, scoreMultiplier: 2.0 }
      const wrapper = mount(GameSidebar, { props })
      expect(wrapper.text()).toContain('2.0')
    })

    test('displays correct multiplier mappings', () => {
      const testCases = [
        { speed: 1.0, scoreMult: 1.0 },
        { speed: 1.2, scoreMult: 1.5 },
        { speed: 1.5, scoreMult: 2.0 },
        { speed: 2.0, scoreMult: 3.0 }
      ]

      for (const { speed, scoreMult } of testCases) {
        const wrapper = mount(GameSidebar, {
          props: { ...defaultProps, speedMultiplier: speed, scoreMultiplier: scoreMult }
        })
        expect(wrapper.text()).toContain(`${speed}`)
        expect(wrapper.text()).toContain(`${scoreMult}`)
      }
    })
  })

  describe('leaderboard button', () => {
    test('emits openLeaderboard event when clicked', async () => {
      const wrapper = mount(GameSidebar, { props: defaultProps })
      await wrapper.find('button:contains("排行榜")').trigger('click')
      expect(wrapper.emitted('openLeaderboard')).toBeTruthy()
    })
  })
})
```

**[Task 12 审查点]**
- 侧边栏组件功能正常
- Vitest 测试通过
- 正确显示速度/分数倍数

- [ ] **Step: 提交 Task 12**

```bash
git add .
git commit -m "feat: add GameSidebar component with Vitest

- Display current score, speed and score multipliers
- Emit openLeaderboard event on button click
- All Vitest tests passing"
```

---

### Task 13: 排行榜弹窗 + Realtime

**Files:**
- Create: `client/src/components/game/LeaderboardModal.vue`
- Create: `client/tests/components/LeaderboardModal.test.js`

**Step:**
- [ ] 打开弹窗时调用 `/api/leaderboard?page=1&pageSize=20`
- [ ] 订阅 `public.leaderboard_events` 的 `postgres_changes`
- [ ] 收到变更且弹窗打开时，重新请求排行榜数据
- [ ] 订阅断开/错误时显示提示"排行榜实时更新已断开，请关闭后重新打开"
- [ ] 关闭/卸载时移除 channel，避免泄漏

**Vitest:**

```javascript
// client/tests/components/LeaderboardModal.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LeaderboardModal from '../src/components/game/LeaderboardModal.vue'

// Mock api
vi.mock('../src/lib/api.js', () => ({
  api: {
    leaderboard: {
      list: vi.fn(),
      getMyRank: vi.fn()
    }
  }
}))

// Mock supabase
vi.mock('../src/lib/supabase.js', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn()
    }))
  }
}))

describe('LeaderboardModal Component', () => {
  let wrapper
  let mockChannel

  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn()
    }
    const { supabase } = vi.mocked('../src/lib/supabase.js')
    supabase.channel.mockReturnValue(mockChannel)
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('initialization', () => {
    test('does not fetch leaderboard when not visible', () => {
      wrapper = mount(LeaderboardModal, {
        props: { show: false }
      })
      const { api } = vi.mocked('../src/lib/api.js')
      expect(api.leaderboard.list).not.toHaveBeenCalled()
    })
  })

  describe('fetching data', () => {
    test('fetches leaderboard when shown', async () => {
      const mockData = [
        { user_id: '1', username: 'alice', best_score: 100 },
        { user_id: '2', username: 'bob', best_score: 80 }
      ]
      const { api } = vi.mocked('../src/lib/api.js')
      api.leaderboard.list.mockResolvedValue({ leaderboard: mockData })

      wrapper = mount(LeaderboardModal, { props: { show: true } })
      await vi.waitFor(() => {
        expect(api.leaderboard.list).toHaveBeenCalledWith(1, 20)
      })
    })

    test('fetches user rank when authenticated', async () => {
      const mockRank = { user_id: '1', rank: 5 }
      const { api } = vi.mocked('../src/lib/api.js')
      api.leaderboard.list.mockResolvedValue({ leaderboard: [] })
      api.leaderboard.getMyRank.mockResolvedValue({ rank: mockRank })

      wrapper = mount(LeaderboardModal, { props: { show: true } })
      await vi.waitFor(() => {
        expect(api.leaderboard.getMyRank).toHaveBeenCalled()
      })
    })
  })

  describe('realtime subscription', () => {
    test('subscribes to leaderboard_events when shown', async () => {
      wrapper = mount(LeaderboardModal, { props: { show: true } })
      await vi.waitFor(() => {
        const { supabase } = vi.mocked('../src/lib/supabase.js')
        expect(supabase.channel).toHaveBeenCalledWith('leaderboard-refresh')
      })
    })

    test('unsubscribes when modal is closed', async () => {
      wrapper = mount(LeaderboardModal, { props: { show: true } })
      await vi.waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      await wrapper.setProps({ show: false })
      await vi.waitFor(() => {
        expect(mockChannel.unsubscribe).toHaveBeenCalled()
      })
    })

    test('unsubscribes when component is unmounted', async () => {
      wrapper = mount(LeaderboardModal, { props: { show: true } })
      await vi.waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled()
      })

      wrapper.unmount()
      await vi.waitFor(() => {
        expect(mockChannel.unsubscribe).toHaveBeenCalled()
      })
    })
  })

  describe('error handling', () => {
    test('shows error message when subscription fails', async () => {
      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config && config.error) {
          setTimeout(() => config.error(new Error('Connection lost')), 0)
        }
        return mockChannel
      })

      wrapper = mount(LeaderboardModal, { props: { show: true } })
      await vi.waitFor(() => {
        expect(wrapper.text()).toContain('排行榜实时更新已断开')
      })
    })
  })
})
```

**[Task 13 审查点]**
- 排行榜弹窗功能正常
- Realtime 订阅/取消订阅正确
- Vitest 测试通过

- [ ] **Step: 提交 Task 13**

```bash
git add .
git commit -m "feat: add LeaderboardModal with realtime subscriptions

- Fetch leaderboard data on modal open
- Subscribe to leaderboard_events for realtime updates
- Handle subscription errors gracefully
- All Vitest tests passing"
```

---

### Task 14: 游戏主页 + E2E

**Files:**
- Create: `client/src/views/GameView.vue`
- Create: `client/src/components/common/AppHeader.vue`
- Create: `client/src/components/common/GuestWarning.vue`
- Create: `client/tests/e2e/game.spec.js`

**Step:**
- [ ] **取消登录拦截**：`/game` 页面无需登录即可进入
- [ ] **未登录提示组件 (GuestWarning)**：
  - 未登录用户首次进入游戏时显示警告弹窗或横幅
  - 提示内容："您当前未登录，游玩成绩不会计入排行榜和个人最高分"
  - 提供"登录/注册"按钮和"继续游戏"按钮
  - 警告可关闭（用 localStorage 记录是否已阅读）
- [ ] **分数提交逻辑**：
  - 已登录用户：开始游戏时先调用 `POST /api/game-sessions/start` 获取 `sessionId`，游戏结束后调用 `POST /api/leaderboard` 提交分数
  - 提交状态反馈：**"分数提交中..."** → **"分数提交成功"** 或 **"分数提交失败"**
  - 未登录用户：游戏结束后**不提交分数**，显示"成绩未记录"提示
  - **安全说明**：`POST /api/leaderboard` 有后端 `authMiddleware` 保护，并要求有效 `sessionId`；未登录返回 401 + "未登录，无法保存分数"
  - 注册成功但 `needsEmailConfirmation=true` 的用户视为未登录状态，在完成邮箱确认并真正登录前不得提交成绩
- [ ] 顶部"排行榜"入口改为打开弹窗，不跳转不存在路由
- [ ] Playwright 覆盖两个路径：
  - 登录用户："进入游戏 -> 提交分数 -> 打开排行榜"
  - 未登录玩家："进入游戏（关闭警告）-> 游玩 -> 结束时显示未记录提示"
  - 未登录玩家路径需断言：未发起 `POST /api/leaderboard`

**[Task 14 审查点]**
- 游戏主页功能正常
- 未登录警告正确显示
- E2E 测试通过

- [ ] **Step: 提交 Task 14**

```bash
git add .
git commit -m "feat: add GameView with guest warning and score submission

- Add GameView with speed selection
- Add GuestWarning for unauthenticated users
- Add score submission for authenticated users
- All Playwright E2E tests passing"
```

---

## Phase 4: 最终验证

### Task 15: Playwright E2E 全流程测试

**Files:**
- Create: `client/tests/e2e/full-flow.spec.js`

- [ ] **完整用户流程测试**

```javascript
// client/tests/e2e/full-flow.spec.js
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

    // ========== 3. 等待游戏结束（模拟一些操作） ==========
    // 等待一段时间让游戏运行
    await page.waitForTimeout(3000)

    // 触发游戏结束（游戏支持 Escape 键结束）
    await page.keyboard.press('Escape')

    // ========== 4. 验证分数提交 ==========
    // 等待分数提交反馈出现
    await expect(page.locator('text=分数提交成功')).toBeVisible({ timeout: 5000 })

    // ========== 5. 查看排行榜 ==========
    await page.click('button:has-text("排行榜")')
    await expect(page.locator('text=排行榜')).toBeVisible()
    // 验证用户分数在排行榜中
    await expect(page.locator(`text=${testUser.username}`)).toBeVisible()
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
    // 如果出现 GuestWarning，关闭它
    const guestWarning = page.locator('text=您当前未登录')
    if (await guestWarning.isVisible()) {
      await page.click('button:has-text("继续游戏")')
    }

    // ========== 3. 游玩并结束 ==========
    await page.click('button:has-text("开始游戏")')
    await page.waitForTimeout(3000)
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

  test('guest user can dismiss warning and play', async ({ page }) => {
    // ========== 1. 进入游戏 ==========
    await page.goto('/game')

    // ========== 2. 看到未登录警告 ==========
    await expect(page.locator('text=您当前未登录')).toBeVisible()

    // ========== 3. 点击继续游戏 ==========
    await page.click('button:has-text("继续游戏")')
    await expect(page.locator('text=您当前未登录')).not.toBeVisible()

    // ========== 4. 验证游戏可以开始 ==========
    await page.click('button:has-text("开始游戏")')
    await expect(page.locator('canvas')).toBeVisible() // 假设游戏有 canvas
  })
})
```

**[Task 15 审查点]**
- 全流程 E2E 测试通过
- 所有关键路径验证完成
- 限流命中时前端能正确显示 429 提示，正常低频路径不受影响

- [ ] **Step: 提交 Task 15**

```bash
git add .
git commit -m "test: add full-flow E2E tests

- Test registered user flow: register -> play -> submit -> leaderboard
- Test guest user flow: play without login -> score not recorded
- Test guest warning dismissal
- All Playwright E2E tests passing"
```

**[Task 15 最终提交]**

所有任务完成后，合并到 main 分支：

```bash
git checkout main
git merge develop
git tag -a v1.0.0 -m "Release v1.0.0 - Kinetic Arcade Snake Game"
git push origin main develop --tags
```

---

## 实施检查清单

| Task | 名称 | TDD | Vitest | Playwright |
|------|------|-----|--------|------------|
| 1 | 前端项目初始化 | - | - | - |
| 2 | 后端项目初始化 | - | - | - |
| 3 | 本地 Supabase | - | - | - |
| 4 | 认证中间件 | ✅ | - | - |
| 5 | 认证路由 | ✅ | - | - |
| 6 | 排行榜路由 | ✅ | - | - |
| 7 | API 客户端 | - | - | - |
| 8 | 认证 Store | - | ✅ | - |
| 9 | 登录页 | - | ✅ | ✅ |
| 10 | 注册页 | - | ✅ | ✅ |
| 11 | 游戏组件 | - | ✅ | ✅ |
| 12 | 侧边栏组件 | - | ✅ | - |
| 13 | 排行榜弹窗 | - | ✅ | ✅ |
| 14 | 游戏主页 | - | ✅ | ✅ |
| 15 | 全流程 E2E | - | - | ✅ |

**关键验收项（必须通过）**
- [ ] `login` 成功后服务端下发有效 `HttpOnly` 会话 Cookie；`register` 返回已登录态或 `needsEmailConfirmation=true`
  - **本地说明**: Supabase 已关闭邮箱确认，`needsEmailConfirmation=true` 分支不会触发
- [ ] `register` 成功后 `public.profiles` 中必然存在对应用户记录（由数据库自动建档保证，`id=user.id`）
- [ ] 用户名需按统一规则规范化并做唯一校验；大小写变体、非法字符和保留词不得绕过
- [ ] 使用会话 Cookie 调用 `/api/auth/me` 返回当前用户
- [ ] 当 `register` 返回 `needsEmailConfirmation=true` 时，前端不得进入登录态，也不得进入可保存成绩状态
- [ ] `POST /api/auth/login`、`POST /api/auth/register`、`POST /api/game-sessions/start`、`POST /api/leaderboard` 超限后统一返回 `429`
- [ ] 本地可通过内存限流器 + Jest/脚本循环请求验证限流；生产需使用共享存储限流
- [ ] 所有写接口至少校验 `Origin`；跨站来源请求必须被拒绝
- [ ] `game_sessions` 仅允许更新当前用户自己的 pending session；已完成 session 不可再次改写
- [ ] `/api/leaderboard/rank/me` 排名按 `best_score desc, best_score_at asc, user_id asc`（相同分数先到先得）
- [ ] `/api/leaderboard/rank/me` 返回真实名次摘要而不是原始排行榜记录
- [ ] 并列分数场景必须按 `best_score_at asc, user_id asc` 稳定排序并有测试覆盖
- [ ] `leaderboard_best` 不对前端匿名客户端直接开放查询；排行榜读取统一经过 Koa API
- [ ] 开始对局创建 session 不触发 `leaderboard_events`；仅 verified 成绩写入成功后触发并驱动排行榜弹窗自动刷新
- [ ] 已登录用户必须先拿到一次性 `sessionId` 才能提交成绩；重复提交同一 `sessionId` 必须失败
- [ ] 排行榜仅统计 `is_verified=true` 的成绩，未通过校验或未校验成绩不得入榜
- [ ] Realtime 订阅断开/错误时显示提示"排行榜实时更新已断开，请关闭后重新打开"
- [ ] **未登录玩家可无阻碍进入游戏**，显示"成绩不计入排行榜"警告
- [ ] 未登录玩家结束游戏后**不调用提交分数 API**，后端返回 401 + "未登录，无法保存分数"
- [ ] 未登录试玩路径的 Playwright 断言需在 `page.goto('/game')` 前开始监听，并覆盖整个会话周期
- [ ] 已登录用户提交分数后显示："分数提交中..." → "分数提交成功" 或 "分数提交失败"
- [ ] 速度倍数玩家可选（1.0/1.2/1.5/2.0），分数倍数由速度自动计算（1.0→1.0, 1.2→1.5, 1.5→2.0, 2.0→3.0）
- [ ] 不能仅靠修改 `POST /api/leaderboard` 请求体中的裸分数直接刷出超高分

---

## 上线前准备

当需要部署到 Supabase 云端时：

```bash
# 1. 确保所有迁移在 supabase/migrations/ 目录
# 2. 链接到云端项目
supabase link --project-ref <your-project-ref>

# 3. 推送迁移到云端
supabase db push

# 4. 更新生产环境变量
# client/.env.production
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# server/.env.production
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
# 可选，仅用于后端离线管理脚本（绝不在前端使用）
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**运维注意**
- `leaderboard_events` 会持续增长，需要定期清理。添加 pg_cron 清理 job（保留最近 7 天）：

```sql
-- 创建清理函数
CREATE OR REPLACE FUNCTION cleanup_leaderboard_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.leaderboard_events WHERE created_at < now() - interval '7 days';
END;
$$;

-- 启用 pg_cron 扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 调度：每天凌晨 3 点执行清理
SELECT cron.schedule('cleanup-leaderboard-events', '0 3 * * *', 'SELECT cleanup_leaderboard_events()');
```

- 当前计划使用服务端 HttpOnly Cookie 会话模型；若需要长期登录，请补充会话续期、轮换与失效策略。
