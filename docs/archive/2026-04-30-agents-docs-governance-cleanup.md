# AGENTS.md / docs 治理清理记录

> 日期：2026-04-30
> 性质：历史决策记录，不作为当前执行规范。
> 当前执行规范仍以 `AGENTS.md` 和当前有效 `docs/*.md` 为准。

## 背景

本次整理前，AI 协作规则、项目上下文、测试策略、部署说明、安全边界和历史计划散落在 `CLAUDE.md`、`AGENTS.md` 与多份历史文档中，存在以下问题：

- 主规则源不够清晰，容易重复维护。
- 部署现状与目标态混在一起，发布时容易误读。
- 文档体系里既有当前有效计划，也有归档方案，边界需要明确。
- 部分规则和仓库现实不一致，例如 `docs/superpowers/` 被 `.gitignore` 忽略、logout 写接口未走 CSRF。
- Codex / Claude Code 协作流程需要从经验约定固化为可查规则。

## 目标

- 让 `AGENTS.md` 成为 AI 协作主规则源，只保留硬规则、关键边界和文档索引。
- 让 `CLAUDE.md` 只导入 `AGENTS.md`，并保留 Claude Code 专属补充。
- 将详细流程、变量表、检查清单、工具边界下沉到 `docs/*.md`。
- 区分当前部署现实与目标态部署方案，避免误操作生产环境。
- 保留本次治理决策记录，方便未来回溯为什么这样组织文档。

## 主要决策

### 1. 主规则源

`AGENTS.md` 是主规则源；如 `docs/*.md` 与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准，并在任务中指出需要同步修正文档。

`CLAUDE.md` 不再重复维护项目规则，只保留 Claude Code 专属差异和对 `AGENTS.md` 的导入说明。

### 2. 文档分层

- 硬规则、关键禁令、详细文档索引：`AGENTS.md`
- 日常流程、测试矩阵、环境变量、安全清单、发布流程：`docs/*.md`
- 当前有效阶段性计划：`docs/superpowers/plans/`
- 过期历史方案：`docs/archive/`
- 学习笔记：`docs/learning/`

### 3. 当前态与目标态

部署文档保留目标态规划，但必须标注 `[目标态]`。当前尚未落地的 CI 门控、Railway staging env、独立 staging Supabase 不得按字面执行。

当前发布和迁移检查必须按现实执行：Vercel production 跟 `main`，Railway production env 跟 `develop`，Railway staging env 尚不存在，数据库迁移先在本地 Supabase 验证，远程操作必须单独确认。

### 4. 规范冲突与偏差处理

执行过程中一旦发现任务、代码实现、文档说明、工具行为或既有计划与 `AGENTS.md` / 当前有效 `docs/*` 不一致，必须立即提醒用户，说明冲突点、影响、风险和可选解决方案，由用户确认是修规范、修执行逻辑，还是记录临时例外。

### 5. 计划文件进入版本库

`docs/superpowers/plans/` 被 `AGENTS.md` 作为当前有效计划目录引用，因此不应被 `.gitignore` 整体忽略。本次将忽略规则收窄为只忽略 `docs/superpowers/tmp/`。

## 具体修改摘要

- 重构 `AGENTS.md`：保留硬规则、风险准入、安全/部署/测试/分支/工具/清理边界和文档索引。
- 精简 `CLAUDE.md`：只保留 Claude Code 专属补充。
- 归档旧 `CLAUDE_BEST_PRACTICES.md` 到 `docs/archive/2026-04-19-claude-best-practices.md`。
- 新增或扩展：
  - `docs/project-context.md`
  - `docs/development-workflow.md`
  - `docs/environment.md`
  - `docs/api-conventions.md`
  - `docs/testing-strategy.md`
  - `docs/coding-style.md`
  - `docs/release-process.md`
  - `docs/security-boundaries.md`
  - `docs/ai-collaboration.md`
  - `docs/ai-tooling.md`
  - `docs/project-inventory.md`
  - `docs/cleanup-candidates.md`
  - `docs/incidents/README.md`
- 修正 `.gitignore`，让 `docs/superpowers/plans/` 可被 Git 跟踪。
- 修正 `POST /api/auth/logout`，补上 CSRF 中间件和回归测试。

## 已确认的原则

- 低风险文档小改可直接执行；中/高风险仍需先方案、说明测试/回滚/安全影响并等待确认。
- 涉及认证、数据库、支付、部署、密钥、生产数据或用户数据的操作必须显式确认。
- 前端 API 默认走相对路径 `/api`，不直连 Railway URL。
- 文档-only 改动可跳过单元测试和构建，但必须检查 Markdown 格式和链接。
- 涉及 UI、路由、表单、样式、游戏画面或关键交互改动时，必须做实际页面验证。

## 不再采用的方案

- 不再把 `CLAUDE.md` 作为完整项目规则副本维护。
- 不再让 `docs/superpowers/` 整体被 Git 忽略。
- 不把 `docs/archive/` 或 `docs/learning/` 中出现的方案默认视为当前执行依据。
- 不把目标态部署流程当成当前发布流程执行。

## 验证

本次整理期间执行过的关键验证包括：

- `git diff --check`
- `npm run test --workspace=server`
- 关键文档路径和章节关键词复查
- `AGENTS.md` 行数控制检查

## 后续注意事项

- 若 CI 门控和分支对齐方案落地，需同步更新 `AGENTS.md`、`docs/release-process.md`、`docs/security-boundaries.md` 和相关计划文件。
- 若引入独立 staging Supabase，需更新测试矩阵、数据库迁移流程和发布检查清单。
- 若新增环境变量，必须同步 `.env.example` 与 `docs/environment.md`。
- 若继续精简文档，优先删除重复模板和重复解释，不删除安全边界、部署现状和确认规则。
