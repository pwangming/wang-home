# Phase 0.5：迁移前 minor 升级（战术子 plan）

> 状态：**待 Codex 审查 → 用户确认 → 执行**
> 母 plan：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md) §4
> 分支：`chore/dep-upgrade-phase-0-5`
> 基分支：`develop`
> 预计工时：**1-2 天**（每包独立 commit + 验证）
> 模型主力：Codex 95% / 用户 5%（PR 合并 click）
> Claude Code 角色：方案审查 + 漂移决策审定（已含本子 plan）
>
> **AGENTS.md 准入风险等级：低**
>
> 理由：仅 minor / patch 升级；vue-router 4.6 / dotenv 16.6 是同 major 内升；jsdom 29 / supertest 7 虽 major 但工具链层影响小；已受 Phase 0.0 Wait for CI 保护
>
> **前置依赖**：
> - Phase 0.0 ✅ 已完成（Railway Wait for CI ON；详见 `phase-0-0-minimal-ci-gating.md` §执行记录）
> - 本 PR 合并 develop 时同步验证 Phase 0.0 Step 5（Railway deploy 时序观察）

---

## 🎯 本次只做什么

把 13 个 minor / patch 包升级到目标版本，每包独立 commit。

## ❌ 明确不做什么

- ❌ 不升 vue-router 5.x（Vue Router 5 是 major，breaking changes 大；推到 Phase 1.5 与 vite/pinia 一同处理）
- ❌ 不升 dotenv 17（major bump；推到后续）
- ❌ 不升 vite / vitest / @vitejs/plugin-vue / @vitest/coverage-v8 / pinia / koa / koa-router / koa-bodyparser / jest / @types/jest（全部 major，推到 Phase 1.5）
- ❌ 不动业务代码、目录结构、CI 配置
- ❌ 不动测试用例（除非升级要求 API 适配）

## 🔍 现状漂移说明（与 master plan 偏差）

master plan §4.2 写于 2026-05-07，本子 plan 派生于同日；npm 上有 3 处实际版本超出 master plan 预期：

| 包 | master plan | npm latest | 本子 plan 决策 | 理由 |
|---|---|---|---|---|
| vue-router | ^4.5.x | 5.0.6 GA | **留 4.6.4**（4.x 同 major 内升） | Vue Router 5 是 major，breaking changes 大；放 Phase 1.5 与 vite 7 / vitest 3 / pinia 3 一同处理 |
| jsdom | ^26.x | 29.1.1 | **跳 29.1.1** | master plan 已接受 jsdom 跨 major（"影响小"）；24→29 与 24→26 心智成本相当，一次到位 |
| dotenv | ^16.x latest | 17.4.2 GA | **留 16.6.1**（16.x 同 major 内升） | dotenv 17 改动主要在 ENC（加密）模式；当前项目无加密需求，留 16.x 安全 |

## 📦 升级清单

### 前端（`client/`）

| 包 | 当前 | 目标 | 跨度 | commit message |
|---|---|---|---|---|
| vue | ^3.4.0 | ^3.5.34 | minor | `chore(deps): bump vue from 3.4 to 3.5` |
| vue-router | ^4.2.0 | ^4.6.4 | minor | `chore(deps): bump vue-router from 4.2 to 4.6` |
| naive-ui | ^2.38.0 | ^2.44.1 | minor | `chore(deps): bump naive-ui from 2.38 to 2.44` |
| eslint | ^10.2.1 | ^10.3.0 | minor | `chore(deps-dev): bump eslint from 10.2 to 10.3` |
| eslint-plugin-vue | ^10.9.0 | ^10.9.1 | patch | `chore(deps-dev): bump eslint-plugin-vue to 10.9.1` |
| jsdom | ^24.0.0 | ^29.1.1 | major（低影响） | `chore(deps-dev): bump jsdom from 24 to 29` |
| @vue/test-utils | ^2.4.8 | ^2.4.10 | patch | `chore(deps-dev): bump @vue/test-utils to 2.4.10` |
| globals | ^17.5.0 | ^17.6.0 | patch | `chore(deps-dev): bump globals to 17.6` |

### 后端（`server/`）

| 包 | 当前 | 目标 | 跨度 | commit message |
|---|---|---|---|---|
| supertest | ^6.3.0 | ^7.2.2 | major（低影响） | `chore(deps-dev): bump supertest from 6 to 7` |
| dotenv | ^16.4.5 | ^16.6.1 | patch | `chore(deps): bump dotenv from 16.4 to 16.6` |
| eslint | ^10.2.1 | ^10.3.0 | minor | `chore(deps-dev): bump eslint from 10.2 to 10.3` |

### 已是 latest（跳过）

`@eslint/js@10.0.1` / `vue-eslint-parser@10.4.0` / `@playwright/test@1.59.1` / `unplugin-auto-import@21.0.0` / `unplugin-vue-components@32.0.0`

**升级总数：11 个 commit（client 8 + server 3）**

## 📁 预计修改文件 / 模块

每个升级 commit 仅改：
- `client/package.json` 或 `server/package.json`（一行版本号）
- `client/package-lock.json` 或 `server/package-lock.json`
- root `package-lock.json`（如有 hoisting 变化）

**不**修改任何业务代码 / 测试 / 配置文件。

## 🧪 新增或调整的测试

- 无新增测试
- 无修改现有测试（除非某个升级强制要求 API 适配 — 不预期，但若发生需在该 commit 内附带改）

## 👀 验证规则（每个升级 commit 后必跑）

```bash
npm run lint        # 0 error
npm run test:client # 全绿（如改的是 client deps）
npm run test:server # 全绿（如改的是 server deps）
npm run build       # 通过
```

整批完成后跑：
- `npm run test:e2e`（Playwright 全套）
- 本地 dev 手测金链路（首页 / 登录 / 蛇游戏 / 排行榜 / 皮肤切换 / profile）
- preview 部署验证

## ✅ 验收标准

| 项 | 期望 | 验证方式 |
|---|---|---|
| 11 个 commit 落 chore/dep-upgrade-phase-0-5 分支 | git log --oneline 显示 11 行 chore(deps) | 终端 |
| 每个 commit 后 lint / test / build 全绿 | CI 全绿 | GitHub Actions |
| PR preview 部署成功 | Vercel preview 可访问 | Vercel |
| 金链路手测 | 6 项全 OK | 浏览器 |
| Phase 0.0 Step 5 验证 2 完成 | Railway deploy 时序晚于 GitHub Actions 完成时间 | Railway log + Actions log 时间戳对比 |
| PR 合并 develop | auto-merge 触发 | GitHub PR |

## 🔄 回滚方式

| 出错点 | 回滚 |
|---|---|
| 单 commit 升级炸 | revert 该 commit；其余 commit 不受影响（原子性设计） |
| 整批合并 develop 后炸 | revert 整个 PR；develop 回 Phase 0.0 末态 |
| Phase 0.0 Wait for CI 异常 | Railway UI toggle 翻 OFF；调查 Railway GitHub App 权限 |
| supertest 7 / jsdom 29 测试失败 | 该包独立回退到原版本（在该 commit 上原地修；其余包升级保留） |

## ❓ 未决问题

1. **是否本期顺手升级 vite 5 → 7 / vitest 1 → 3**：master plan 明确放 Phase 1.5；不在本期讨论
2. **vue-router 5 / dotenv 17 时间窗**：建议 Phase 1.5 首位（与 vite 7 同期），但若 Phase 1.5 大盘满，可单独再开一个迷你 phase
3. **eslint 11 是否提前升**：当前 eslint@10.3 仍 stable；不主动跳 11
4. **dependabot 自动 bump 与本期冲突**：dependabot 当前 auto-merge 已开（PR #59 #60 历史）；Phase 0.5 进行中暂停 dependabot 或冲突解决？建议**进行中不动 dependabot**，它合什么我们 rebase 即可

## 🚦 执行顺序（严格）

```
Step 1：从 develop 切分支 chore/dep-upgrade-phase-0-5
Step 2：client 端 8 个升级，每包一 commit + 跑 lint/test:client/build
Step 3：server 端 3 个升级，每包一 commit + 跑 lint/test:server
Step 4：整批 e2e + 金链路手测
Step 5：开 PR → develop（auto-merge 挂上）
Step 6：等 CI 全绿 → auto-merge 合 develop
Step 7：合并后立即观察 Railway deploy 时序（验证 Phase 0.0 Step 5）
Step 8：完成报告 + plan §执行记录 一次性更新（同一 PR 还是单独 PR？见母 plan 原则：phase 完成报告单独 PR）
```

## 📊 执行记录（每个完成点必填）

> **规则**：每步完成后立即追加一行；不批量回填、不省略执行人。执行人枚举：用户 / Codex / Claude Code / 自动（CI / Vercel / Railway）。

| 时间（UTC） | 步骤 | 完成内容 | 执行人 | 链接 / 备注 |
|---|---|---|---|---|
| | Step 1 | 切分支 `chore/dep-upgrade-phase-0-5` | | |
| | Step 2.1 | bump vue 3.4 → 3.5 | | |
| | Step 2.2 | bump vue-router 4.2 → 4.6 | | |
| | Step 2.3 | bump naive-ui 2.38 → 2.44 | | |
| | Step 2.4 | bump eslint 10.2 → 10.3 (client) | | |
| | Step 2.5 | bump eslint-plugin-vue 10.9 → 10.9.1 | | |
| | Step 2.6 | bump jsdom 24 → 29 | | |
| | Step 2.7 | bump @vue/test-utils 2.4.8 → 2.4.10 | | |
| | Step 2.8 | bump globals 17.5 → 17.6 | | |
| | Step 3.1 | bump supertest 6 → 7 | | |
| | Step 3.2 | bump dotenv 16.4 → 16.6 | | |
| | Step 3.3 | bump eslint 10.2 → 10.3 (server) | | |
| | Step 4 | e2e + 金链路手测 | | |
| | Step 5 | 开 PR + 挂 auto-merge | | |
| | Step 6 | CI 全绿 + auto-merge 合 develop | | |
| | Step 7 | Railway deploy 时序观察（验证 Phase 0.0 Step 5） | | |
| | Step 8 | 完成报告 + plan §执行记录 更新（单独 PR） | | |

## 📋 完成报告模板（执行后填）

```text
本次完成：
- Phase 0.5 11 个升级 commit：[全绿 / 列出例外]
- PR 链接：<URL>
- merge commit：<sha>
- e2e + 金链路手测：[全绿 / 列出问题]
- Phase 0.0 Step 5 验证 2：[Railway deploy 时间 vs GitHub Actions 完成时间，差值多少秒]

剩余风险：
- 推到 Phase 1.5 的 major 升级：vite 7 / vitest 3 / @vitejs/plugin-vue 6 / @vitest/coverage-v8 3 / pinia 3 / koa 3 / koa-router 13 / @koa/bodyparser 5 / jest 30 / @types/jest 30
- 推后处理：vue-router 5 / dotenv 17 / eslint 11（如有）
- 软冻结期未启动（Phase 1 才启动），develop 在 Phase 0.5 → 1 之间可正常合 PR

下一步：
- 派生 Phase 1 战术子 plan（迁移本体，3-5 天，**高风险**）
- 启动 Phase 1 时 develop 软冻结同步声明
```

## 🔗 关联

- 母 plan：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md) §4 + §1.2 升级策略
- Phase 0.0 完成报告：[`phase-0-0-minimal-ci-gating.md`](./phase-0-0-minimal-ci-gating.md) §完成报告
- 后续 Phase 1.5 major 升级：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md) §6
- 测试策略：母 plan §1.5

## 📝 变更日志

- 2026-05-07：初稿，按 ai-collaboration.md "Codex 执行计划模板" 派生于母 plan §4；含 §执行记录 强制章节；surface 3 处与 master plan 的 npm 漂移决策（vue-router / jsdom / dotenv）
