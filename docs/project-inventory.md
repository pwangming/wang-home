# 项目文件审计

> 本文档记录仓库主要文件 / 目录的归属、用途和修改风险等级，作为清理决策与新人/新 Agent 上手的索引。
> 详细清理流程见 `docs/cleanup-candidates.md`。

## 一级目录

| 路径 | 类型 | 用途 | 谁修改 |
|---|---|---|---|
| `client/` | 前端 workspace | Vue 3 + Vite + Pinia + Naive UI | Codex / 用户 |
| `server/` | 后端 workspace | Koa + koa-session + koa-router | Codex / 用户 |
| `supabase/` | DB / Auth | Supabase migrations、config、seed | Codex（迁移高风险）/ 用户 |
| `docs/` | 文档 | 项目规则、流程、计划、归档 | Codex / Claude Code |
| `.github/` | CI / 协作 | workflows、dependabot、CodeQL | 高风险，需用户确认 |
| `scripts/`（如存在） | 自动化脚本 | 本地工具脚本 | Codex |

## 关键单文件

| 路径 | 用途 | 风险等级 |
|---|---|---|
| `AGENTS.md` | AI 协作主规则源 | 中（改前讨论） |
| `CLAUDE.md` | Claude Code 专属补充 | 中 |
| `package.json`（root） | npm workspace 配置 | 中（依赖改动） |
| `package-lock.json` | 依赖锁定 | 高（不手编） |
| `.gitignore` | 忽略规则 | 中 |
| `.editorconfig` | 编辑器统一格式 | 低 |
| `client/vite.config.js` | Vite + dev proxy | 中 |
| `client/vercel.json` | Vercel rewrite | 高（破坏会破坏前后端通信） |
| `client/src/lib/api.js` | 前端 API helper | 中 |
| `client/src/components.d.ts` | 自动生成 | 不手编 |
| `client/src/auto-imports.d.ts` | 自动生成 | 不手编 |
| `server/src/index.js` | Koa 入口 + session 配置 | 高 |
| `server/src/middleware/auth.js` | 认证中间件 | 高 |
| `server/src/middleware/csrf.js` | CSRF 校验 | 高 |
| `server/src/middleware/rateLimit.js` | 限流 | 高 |
| `supabase/config.toml` | Supabase 本地配置 | 中 |
| `supabase/migrations/*.sql` | 迁移历史 | 高（不可篡改） |
| `.github/workflows/ci.yml` | GitHub CI | 高 |
| `.github/workflows/develop-pr-auto-merge.yml` | develop auto-merge | 高 |
| `.github/workflows/codeql.yml` | CodeQL 扫描 | 中 |
| `.github/dependabot.yml` | 依赖更新机器人 | 中 |

## docs/ 二级结构

| 路径 | 用途 |
|---|---|
| `docs/ARCHITECTURE.md` | 架构决策记录 |
| `docs/project-context.md` | 项目上下文与常用命令 |
| `docs/development-workflow.md` | 日常开发流程 |
| `docs/release-process.md` | 发布上线流程 |
| `docs/environment.md` | 环境变量 |
| `docs/api-conventions.md` | API 访问规范 |
| `docs/testing-strategy.md` | 测试策略 |
| `docs/coding-style.md` | 代码规范 |
| `docs/security-boundaries.md` | 安全边界 |
| `docs/ai-collaboration.md` | AI 协作分工 |
| `docs/ai-tooling.md` | AI 工具边界 |
| `docs/project-inventory.md` | 本文件 |
| `docs/cleanup-candidates.md` | 清理候选清单 |
| `docs/superpowers/plans/` | 阶段性计划与方案 |
| `docs/archive/` | 归档历史方案 |
| `docs/learning/` | 学习笔记（不作执行依据） |

## 修改前需特别谨慎的文件

> 改动前必须先给方案、等待用户确认（高风险）。

- 所有 `server/src/middleware/*.js`
- `server/src/index.js`
- `client/vercel.json`
- `client/vite.config.js`（dev proxy / build 配置）
- `supabase/migrations/*.sql`
- `supabase/config.toml`
- `.github/workflows/*.yml`
- `package.json`（依赖添加/移除）

## 维护规则

- 新增重要目录或关键文件：同步更新本表。
- 文件归属或风险等级变化：同步更新。
- 删除文件前必须确认本表已记录其归属（未记录的先审计补录再决定）。
- 本文档不是变更日志；只记录"当前状态"。

## 待补充

- `client/src/` 子目录详细分布（views、components、stores、composables）
- `server/src/` 子目录详细分布（routes、services、utils）
- `supabase/` 详细文件清单
- `scripts/` 详细脚本清单（如有）

> 当前以一级目录 + 关键单文件为主；二级补充按需扩展。
