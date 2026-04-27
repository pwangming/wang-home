# Kinetic Arcade Agent Guide

本文件根据 `CLAUDE.md` 整理，作为 Codex/Agent 在本仓库工作的默认指南。适用于整个仓库。

## 项目概览

- 项目：Kinetic Arcade，霓虹贪吃蛇全栈游戏。
- 前端：Vue 3 + Vite + Pinia + Naive UI，目录 `client/`，本地端口 3000。
- 后端：Koa + koa-session + koa-router，目录 `server/`，本地端口 4000。
- 数据库：Supabase PostgreSQL + Auth，目录 `supabase/`。
- 部署：前端 Vercel，后端 Railway。

## 关键架构约束

- Vercel 通过 `client/vercel.json` 将 `/api/*` rewrite 到 Railway 后端。
- 前端请求默认走 `/api`，不要把 `VITE_API_BASE` 配成 Railway 直连 URL，否则会导致跨域 cookie 丢失。
- Railway 边缘终止 TLS，后端需要 `app.proxy = true` 信任 `X-Forwarded-Proto`。
- 后端 session cookie 约定：`httpOnly: true`、`sameSite: 'lax'`、生产环境 `secure: true`。
- CSRF 中间件校验 `Origin`，对应 `ALLOWED_ORIGINS` 环境变量。
- 前端代码不要保留 `console.log/warn/error`，后端启动日志除外。

## 常用命令

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run test --workspace=client
npm run test:coverage --workspace=client
npm run test:e2e --workspace=client
npm run test --workspace=server
npm run lint --workspace=client
npm run build --workspace=client
```

PowerShell 中如果普通 `npm` 不在 PATH，使用：

```powershell
& 'C:\Program Files\nodejs\npm.cmd' <args>
```

## 协作流程

对非琐碎改动先给方案，再动手。非琐碎改动包括新功能、重构、架构调整、多文件改动，以及涉及认证、部署、数据库的修改。

流程：

1. 先读相关代码并分析现状。
2. 给出方案和取舍。
3. 等用户确认。
4. 按确认方案执行。

可直接动手的例外：

- 单文件小修改、拼写或格式修正。
- 用户明确说“直接改”或“帮我把 X 改成 Y”。
- 显而易见、范围极小的 bug 修复。

## 测试原则

- 不允许弱化断言来让测试通过。
- 不允许删除失败测试，除非先解释并等待确认。
- 不允许 mock 掉核心逻辑后声称已经测试。
- 不只测 happy path。
- 新增测试时说明覆盖场景和未覆盖风险。
- 修 bug 必须补回归测试。

推荐 TDD 顺序：

```text
写测试 (RED) -> 运行并确认失败 -> 写实现 (GREEN) -> 运行并确认通过 -> 重构
```

## 覆盖率策略

不追求整体 100%，追求核心模块高覆盖，非核心按需测。

核心模块必须重点测试：

- `server/src/routes/*`
- `server/src/middleware/*`
- `client/src/lib/api.js`
- `client/src/composables/*`
- `client/src/stores/*` 的公开 action，下划线开头内部方法除外
- Login/Register/ResetPassword 等表单验证函数
- 数据转换函数
- fetch 错误处理路径

非核心模块按条件分支或业务规则测试：

- 展示性组件只测条件分支和 fallback。
- UI primitives 通常不加单元测试。
- 速度/得分倍率映射用 `it.each` 测规则，不测渲染。
- `GameView.vue`、`SnakeGame.vue` 主要由 Playwright E2E 覆盖。

禁止凑数测试：

- 不测 Vue 框架行为，例如模板里有几个按钮、点击是否 emit。
- 不测下划线开头的内部清理方法。
- 不测未来功能占位文案。
- 不把同一规则拆成多个 `it` 刷行数，优先用 `it.each`。
- 不为了覆盖率去测 `App.vue`、`main.js`、router。

当前前端覆盖率门槛：

| 指标 | 阈值 |
|---|---:|
| lines | 90% |
| statements | 90% |
| branches | 85% |
| functions | 80% |

## 实际页面验证要求

涉及前端可见 UI、交互、路由、表单、样式、游戏画面或关键用户流程的改动，完成单元测试和构建后，必须使用 Playwright、浏览器插件或本地浏览器实际打开页面进行验证。

验证至少包括：

- 页面是否能正常加载。
- 新增或修改的 UI 是否可见且布局正常。
- 关键交互是否能点击、输入、切换或提交。
- 移动端或窄屏风险较高时检查响应式表现。
- 没有明显遮挡、溢出、重叠或空白画面。

最终汇报必须说明实际验证过的页面和结果。若因环境限制无法验证，必须明确说明未验证及原因。

## 代码规范

- 单文件不超过 800 行，超过需拆分。
- 单函数不超过 50 行，嵌套不超过 4 层。
- 提交信息使用 Conventional Commits：`feat:`、`fix:`、`refactor:`、`docs:`、`test:`、`chore:`、`perf:`、`ci:`。
- 优先返回新对象，避免原地修改。
- 显式处理错误，不静默吞异常。
- 保持改动范围聚焦，不做无关重构。

## 审查与提交

写完代码后：

1. 本地自检：lint、format、相关测试。
2. 涉及功能代码时做代码审查，关注可读性、重复、错误处理。
3. 涉及认证、用户输入、数据库、外部 API、Cookie/Session 时做安全审查。
4. 无 CRITICAL/HIGH 问题后再提交。

每个任务完成后应说明：

- 创建或修改的文件。
- 运行过的测试和结果。
- 剩余风险或未覆盖项。

## Supabase 与部署命令

```bash
supabase start
supabase db push
supabase db reset
supabase db push --project-ref kltksixmakbpcljjkvbw
```

CLI 可假定本地已安装：Supabase CLI、Playwright CLI、Vercel CLI、Railway CLI。
