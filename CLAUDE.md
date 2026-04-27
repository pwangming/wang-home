# Kinetic Arcade - 霓虹贪吃蛇

## 项目概述

全栈贪吃蛇游戏，包含用户认证、排行榜、分数提交等功能。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Pinia + Naive UI |
| 后端 | Koa + koa-session + koa-router |
| 数据库 | Supabase (PostgreSQL + Auth) |
| 前端部署 | Vercel (生产：https://client-inky-two.vercel.app，测试：https://client-git-develop-wangwang4467-1105s-projects.vercel.app/) |
| 后端部署 | Railway (自动从 Git push 部署) |

## 项目结构

```
home/
├── client/          # Vue 3 前端 (端口 3000)
├── server/          # Koa 后端 (端口 4000)
├── supabase/        # 数据库迁移和配置
└── package.json     # npm workspaces 根配置
```

## 部署架构

- 前端 Vercel 通过 `client/vercel.json` 的 rewrite 规则将 `/api/*` 代理到 Railway 后端
- 这样 session cookie 对浏览器来说是同域的，避免跨域 cookie 问题
- Railway 在边缘终止 TLS，后端需要 `app.proxy = true` 来信任 X-Forwarded-Proto 头
- **不要**设置 `VITE_API_BASE` 环境变量为 Railway 直连 URL，否则会导致跨域 cookie 丢失

## 本地开发

```bash
npm run dev           # 同时启动前端和后端
npm run dev:client    # 仅前端 (Vite, 端口 3000, 自动代理 /api 到 4000)
npm run dev:server    # 仅后端 (端口 4000)
```

## 测试

```bash
# 前端
cd client && npm test              # Vitest 单元测试
cd client && npm run test:e2e      # Playwright E2E

# 后端 (需要 --experimental-vm-modules 支持 ESM)
cd server && npm test              # Jest 单元测试
```

## CLI 工具

本项目使用以下本地已安装的 CLI，无需检查是否安装：
- **Supabase CLI** — 数据库迁移和配置管理
- **Playwright CLI** — E2E 测试
- **Vercel CLI** — 前端部署 (`vercel --prod` 在 client 目录执行)
- **Railway CLI** — 后端环境变量和部署管理

## Supabase 操作

```bash
supabase start                    # 启动本地 Supabase
supabase db push                  # 推送迁移到远程
supabase db reset                 # 重置本地数据库
supabase db push --project-ref kltksixmakbpcljjkvbw  # 推送到生产
```

## 关键环境变量

### Railway 后端
- `SESSION_SECRET` — session 加密密钥
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — Supabase 连接
- `ALLOWED_ORIGINS` — CORS 和 CSRF 允许的前端域名（逗号分隔）
- `NODE_ENV=production`

### Vercel 前端
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — 前端 Supabase 连接
- **注意**: 不要设置 `VITE_API_BASE`，让它默认走 `/api` 代理

## 开发流程

### 协作风格：先给方案再动手（强制）

对于**非琐碎的改动**（新功能、重构、架构调整、多文件改动、涉及认证/部署/数据库的修改），必须先给方案，等用户确认后再动手：

1. **分析现状** — 读相关代码，指出问题或可选项
2. **提出方案** — 给出 1~N 个选项，说明各自的取舍
3. **等待确认** — 用户点头之后再执行
4. **执行** — 按确认的方案动手

**例外（可直接动手）**:
- 单文件小修改、拼写/格式修正
- 用户明确指令"直接改"、"帮我把 X 改成 Y"
- 显而易见的 bug 修复且改动范围极小

> 原则：宁可多问一次，也不要默默做大改动。用户的"你觉得呢"、"怎么办"、"该怎么做"都是在征求方案，不是在下达执行指令。

### TDD 流程（前后端通用）

### 测试用例核心原则
- 不允许通过弱化断言来让测试通过
- 不允许删除失败测试，除非先解释并等待确认
- 不允许把核心逻辑 mock 掉后声称“已测试”
- 不允许只测 happy path
- 必须列出新增测试覆盖的场景和未覆盖风险

```
写测试 (RED) → 运行测试验证失败 → 写实现 (GREEN) → 运行测试验证通过 → 重构
```

**后端** (Jest + supertest):
```bash
cd server && npm test
```

**前端** (Vitest + Vue Test Utils):
```bash
cd client && npm test
```

**E2E** (Playwright，用于关键用户流程):
```bash
cd client && npm run test:e2e
```

### 测试覆盖率策略（区分核心与非核心）

**不追求整体 100% 覆盖率，追求"核心模块高覆盖，非核心按需测"。**

#### 核心（必须测，目标 >= 90% 行覆盖率）
出 bug 会直接影响用户或存在安全风险的模块：

- `server/src/routes/*`、`server/src/middleware/*` — 所有后端业务逻辑和安全中间件
- `client/src/lib/api.js` — API 调用与错误处理
- `client/src/composables/*` — 游戏会话、游客警告等核心状态逻辑
- `client/src/stores/*` — Pinia store 中的公开 action（下划线开头的内部方法除外）
- 表单验证函数（LoginView/RegisterView/ResetPasswordView 的 `validate*`）
- 数据转换函数（如 `normalizeLeaderboardRows`）
- fetch 错误处理路径

#### 非核心（只测有条件分支或业务规则的部分）
纯渲染容器、UI primitives、canvas 游戏 — 由 E2E 覆盖或无需单元测试：

- 展示性组件（GameSidebar、ProfileModal 等）：只测 `v-if/v-else` 分支和条件 fallback
- UI primitives（NeonButton/Card/Input/Checkbox）：不加单元测试
- 速度/得分倍率映射表：用 `it.each` 合并，测业务规则不测渲染
- `GameView.vue`、`SnakeGame.vue`：不加单元测试，由 Playwright E2E 覆盖

#### 禁止的测试模式（凑数测试）

- ❌ 测"模板里有 4 个按钮"、"点击 emit 了事件"这种 Vue 框架行为
- ❌ 测下划线开头的内部清理方法（`_stopHeartbeat` 等）
- ❌ 测未来功能的占位提示（"即将上线" 类）
- ❌ 同一规则拆成多个 `it` 来刷行数（用 `it.each`）
- ❌ 为了凑整体覆盖率去测 App.vue/main.js/router

#### 覆盖率门槛（在 `vitest.config.js` / Jest 中强制）

| 指标 | 阈值 |
|---|---|
| lines | 90% |
| statements | 90% |
| branches | 85% |
| functions | 80% |

覆盖率 exclude 列表（非核心、由 E2E 覆盖或无需测试）：
`src/main.js`, `src/App.vue`, `src/router/**`, `src/components/game/SnakeGame.vue`, `src/views/GameView.vue`, 各类配置文件。

修 bug 必须同时补回归测试（无论核心/非核心）。

### 实际页面验证要求（强制）

涉及前端可见 UI、交互、路由、表单、样式、游戏画面或关键用户流程的改动，完成单元测试和构建后，必须使用 Playwright、浏览器插件或本地浏览器实际打开页面进行验证。

验证至少包括：
- 页面是否能正常加载
- 新增/修改的 UI 是否可见且布局正常
- 关键交互是否能点击、输入、切换或提交
- 移动端/窄屏风险较高时检查响应式表现
- 没有明显遮挡、溢出、重叠或空白画面

最终汇报必须说明实际验证过的页面和结果。若因环境限制无法验证，必须明确说明未验证及原因。

### 代码审查节点（强制）

每次写完代码后按以下顺序走：

1. **自检** — lint、format、测试本地跑通
2. **code-reviewer** — 写完任何功能代码后调用，检查可读性、重复、错误处理
3. **security-reviewer** — 改动涉及认证、用户输入、数据库查询、外部 API、Cookie/Session 配置时必须调用
4. **确认后提交** — 只有审查通过（无 CRITICAL/HIGH 问题）才能 commit

### Task 审查流程

每个 Task 完成后：
1. 展示创建/修改的文件列表
2. 运行测试并展示结果
3. 暂停等待审查
4. 确认后继续下一个 Task

### 执行偏差处理（强制）

当按计划执行时发现新问题，**必须按以下顺序处理**：
1. **先修复当前阻塞问题**
2. **立即更新执行计划**
3. **再继续后续 Task**

> 禁止"代码已改但计划未同步"继续推进。

## 代码规范

- **文件大小**: 单文件 <= 800 行，超过需拆分
- **函数大小**: 单函数 <= 50 行，嵌套 <= 4 层
- **提交信息**: 遵循 Conventional Commits (`feat:`、`fix:`、`refactor:`、`docs:`、`test:`、`chore:`、`perf:`、`ci:`)
- **不可变数据**: 优先返回新对象而不是原地修改
- **错误处理**: 显式处理，不静默吞异常

## 注意事项

- 前端使用 Vue Router history 模式，Vercel 需要 SPA fallback rewrite（已配置）
- 后端 session cookie 配置: `httpOnly: true, sameSite: 'lax', secure: production`
- CSRF 中间件验证 Origin 头，对应 `ALLOWED_ORIGINS` 环境变量
- 前端代码中不要留 `console.log/warn/error`，后端启动日志除外
