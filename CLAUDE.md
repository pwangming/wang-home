# Kinetic Arcade - 霓虹贪吃蛇

## 项目概述

全栈贪吃蛇游戏，包含用户认证、排行榜、分数提交等功能。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Pinia + Naive UI |
| 后端 | Koa + koa-session + koa-router |
| 数据库 | Supabase (PostgreSQL + Auth) |
| 前端部署 | Vercel (https://client-inky-two.vercel.app) |
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

### TDD 流程 (后端)

```
写测试 (RED) → 运行测试验证失败 → 写实现 (GREEN) → 运行测试验证通过 → 重构
```

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

## 注意事项

- 前端使用 Vue Router history 模式，Vercel 需要 SPA fallback rewrite（已配置）
- 后端 session cookie 配置: `httpOnly: true, sameSite: 'lax', secure: production`
- CSRF 中间件验证 Origin 头，对应 `ALLOWED_ORIGINS` 环境变量
- 前端代码中不要留 `console.log/warn/error`，后端启动日志除外
