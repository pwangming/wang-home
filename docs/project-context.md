# 项目上下文

本文档记录稳定的项目上下文、常用命令和平台说明。`AGENTS.md` 仍然是 AI 协作主规则源；执行前端/后端业务代码、Supabase、构建、部署、CI 或文档体系整理任务前应先阅读本文档；纯文档小改、typo / 注释 / 格式化或方案讨论可按需读取。

## 项目概览

- 项目：Kinetic Arcade，霓虹贪吃蛇全栈游戏。
- 前端：Vue 3 + Vite + Pinia + Naive UI，目录 `client/`，本地端口 `3000`。
- 后端：Koa + koa-session + koa-router，目录 `server/`，本地端口 `4000`。
- 数据库/Auth：Supabase PostgreSQL + Auth，目录 `supabase/`。
- 部署：前端 Vercel，后端 Railway。

## 架构说明

详细架构决策（部署代理、认证设计、CSRF、RLS、限流、Profile 建档等）见 `docs/ARCHITECTURE.md`。本文只列日常开发涉及的关键事实：

- 前端默认端口 `3000`，后端默认端口 `4000`。
- Vite dev server 把 `/api` proxy 到本地后端。
- 前端代码不保留 `console.log/warn/error`（详见 `docs/coding-style.md`）。
- Supabase 默认不随 `npm run dev` 启动（详见下方"本地开发启停"）。

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

## 本地开发启停

- 日常本地开发默认 `npm run dev` 同时启动 client 和 server。
- 需要单独调试时使用 `npm run dev:client` 或 `npm run dev:server`。
- `npm run dev` **不自动启动 Supabase**；只有涉及 Auth、数据库、排行榜、成就、支付等流程时才需启动 Supabase。

## Supabase 说明

- 本地 Supabase 通过 Supabase CLI 启动，Docker 只是运行依赖。
- 本地命令：`supabase start`、`supabase status`、`supabase stop`。
- `supabase link` 用于连接远程云端项目，不是本地 Supabase 所需步骤。本地开发不需要执行 `supabase link`。
- 当前仓库状态显示已 link 到远程 Supabase 项目；具体 project ref 不写入文档。
- `supabase/.temp/pooler-url` 指向远程 Supabase pooler。
- 当前 PowerShell 环境中 `supabase` 可能不在 PATH；依赖该命令前需确认 CLI 路径。

## Supabase 本地命令

```bash
supabase start
supabase db reset
```

> `supabase db reset` 默认**仅用于本地数据库**；执行前必须确认当前目标是本地 Supabase，不是远程项目。误用会清空远程数据。

## Supabase 高风险命令示例

```bash
supabase db push
supabase db pull
supabase link
supabase unlink
supabase db push --project-ref <production-project-ref>
```

仓库存在 link 状态时，远程 Supabase 命令属于高风险操作。运行 `db push`、`db pull`、`link`、`unlink` 或任何生产 project-ref 命令前，必须遵守 `AGENTS.md` 的确认规则。

## 可假定本地 CLI

项目可假定以下工具已在本地安装，但使用前仍应确认命令可用：

- Supabase CLI
- Playwright CLI
- Vercel CLI
- Railway CLI
