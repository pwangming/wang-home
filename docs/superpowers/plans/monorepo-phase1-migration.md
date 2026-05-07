# Monorepo Phase 1 迁移子计划（含 Phase 0.0 / 0.5 / 1 / 1.5 / 1.6 时间线）

> 创建：2026-05-07
> 状态：**方案讨论稳定，待执行确认**
> 分支前缀：见各 Phase 子分支命名
> 基分支：`develop`
> **硬依赖**：无（这是其他 P0 子 plan 的前置）
> **阻塞**：执行期间软冻结 `develop`（D7），所有路径变更类 PR 暂停
> 预计总工时：**Phase 0.0（半天）+ Phase 0.5（1-2 天）+ Phase 1（3-5 天）+ Phase 1.5（3-5 天）+ Phase 1.6（1-2 天）= 2-3 周**
> 关联：
> - 母文档：[`platform-refactor-vision.md`](./platform-refactor-vision.md) §5.7
> - CI 计划：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md)（拆分到 Phase 0.0 + Phase 1.6 两段执行）
> - 学习笔记：[`docs/learning/git-rename-history.md`](../../learning/git-rename-history.md)（本地，未入仓，见 SD-001）
> - Spec 演进：[`docs/audits/spec-debt.md`](../../audits/spec-debt.md)

---

## 0. 背景与目标

平台化重构（vision 母文档）启动前，仓库结构必须从 `npm workspaces` 二包升到 **pnpm + Turborepo + `apps/` + `packages/`**，同时项目改名为 **playlab**。本 plan 是 vision §5.7 的具体落地，所有 P0（A 数据模型 / B RBAC / C 模块化目录 / D 服务端分层 / J 监控）必须在本 plan 完成后才开工。

**为什么先做架子**：模块化目录路径基线依赖 monorepo（`apps/web/src/modules/...`）。先做业务再迁仓库 = 路径改两次 + git history 断裂。详见 vision §5.7 "关键约束"。

**CI 计划编织**：现有 [`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md) 拆成两段：最小门控（Wait for CI toggle + main=develop sync）放 Phase 0.0 提前做，迁移期就有保护；全套部署 hook + staging env + GHA workflow 放 Phase 1.6，在新 playlab/apps 结构上一次成型，避免 Phase 1 改名 / 改 root directory 时重做。

---

## 1. 决策汇总（共 14 项 + 2 项 CI 顺序）

讨论于 2026-05-07，全部确认。后续执行严格按此清单。

### 1.1 工具链 / 结构

| ID | 决策 | 结论 |
|---|---|---|
| D1 | pnpm 版本固定 | `package.json#packageManager: "pnpm@9.15.0"` + corepack enable |
| D2 | 目录命名 | `apps/web` + `apps/api` + `packages/shared` |
| —  | 项目改名 | `kinetic-arcade` → **playlab**；npm scope `@playlab`；GitHub repo 改名 |
| —  | Node 版本 | 20.x → **24.x**（Active LTS，覆盖整个重构周期） |
| D3 | `packages/shared` | 本期建空骨架 + 最小占位导出 |
| D4 | Turborepo Remote Cache | 本期不启用；触发条件入 spec-debt（"CI build > 5min 或 模块数 ≥ 5" 时升级） |
| D5 | pnpm hoisting | 默认严格 + 预置 `public-hoist-pattern[]=*eslint*` / `*prettier*` / `@types/*` |
| D6 | 目录迁移方式 | `git mv` + commit 拆分（commit 1 必须是纯 rename，零内容修改） |
| D7 | 冻结窗口 | 软冻结 `develop` 7 天；只允许"无路径变更小修" |

### 1.2 升级策略

| ID | 决策 | 结论 |
|---|---|---|
| U1 | 升级混进 Phase 1？ | 不混。结构和升级完全分离 |
| U2 | Phase 0.5（minor 升级）时机 | 迁移**前**做 |
| U3 | Phase 1.5（major 升级）顺序 | vite/plugin-vue → vitest/coverage → pinia → koa/router/bodyparser → jest |

### 1.3 架构方向

| ID | 决策 | 结论 |
|---|---|---|
| M1 | 前端 React 引入？ | **不引入**。AI 模块继续 Vue 3 |
| M2 | 后端 Java 引入？ | **不引入**。AI gateway 拆 Node 独立服务（如需） |
| M3 | TS 升级时间线 | 渐进。Phase 1.5 后新包 TS，老代码按需迁 |
| M4 | AI gateway 是否独立 app | 第一个 AI 应用上线时再拆（YAGNI） |
| Q1 | auth 抽法 | **L1**：`packages/auth-client` + `packages/auth-server`（同栈共享 TS 代码，Phase 1.5 后 + RBAC 子 plan 内执行） |

### 1.4 CI 计划顺序

| ID | 决策 | 结论 |
|---|---|---|
| P1 | CI 计划与架构升级顺序 | **C：拆两段**。最小门控前置（Phase 0.0），全套补完后置（Phase 1.6） |
| P2 | CI 计划是否独立成 plan | **A：纳入本子 plan**。Phase 0.0 / 1.6 章节统一管理时间线 |

---

## 2. 时间线总览

```
Phase 0.0（最小 CI 门控）
  分支：release/sync-main-with-develop（CI 计划 §1）
  时长：半天
  内容：
    - main = develop 同步 PR
    - Railway production env 开 Wait for CI toggle
    - 不动 Vercel / staging env / GHA deploy.yml
  目标：迁移期间 develop / main 部署等 CI 全绿

      ↓

Phase 0.5（迁移前 minor 升级）
  分支：chore/dep-upgrade-phase-0-5
  时长：1-2 天
  内容：vue 3.5 / eslint / playwright / jsdom / 等 minor 一批
  目标：迁移基线最新

      ↓

Phase 1（迁移本体）
  分支：codex/chore-monorepo-phase1
  时长：3-5 天
  内容：pnpm + Turborepo + 目录重组 + Node 24 + 改名 + 部署平台联调
  目标：新架子跑通；develop 软冻结期内完成

      ↓

Phase 1.5（迁移后 major 升级）
  分支：每个 group 一个独立分支
  时长：3-5 天
  内容：vite 7 / vitest 3 / pinia 3 / koa 3 / jest 30
  目标：依赖全部最新

      ↓

Phase 1.6（CI 全套补完）
  分支：feat/ci-deploy-gating（CI 计划 §2-§7）
  时长：1-2 天
  内容：
    - Railway 新建 staging env（跟 develop）
    - Vercel 关 main 自动部 + 建 Deploy Hook
    - GitHub Actions 加 deploy.yml + secret
    - 文档同步（AGENTS.md 部署架构 / release-process.md / 等）
  目标：CI 门控部署 + 分支对齐完整闭环；为 P0 各子 plan 提供干净基础
```

每段之间允许 develop 解冻，但 Phase 1 内必须保持冻结。

---

## 3. Phase 0.0 — 最小 CI 门控

### 3.1 目的

迁移期间最低成本拿到 CI 门控保护。**只做 1 click toggle + 1 个同步 PR**，不碰 Vercel / staging env / GHA workflow（那些放 Phase 1.6）。

### 3.2 执行步骤

#### Step 1：main = develop 同步

> 来源：CI 计划 §Phase 1

1. 检查差距：`git log main..develop --oneline`
2. 如有 diff：开 PR `release: sync main with develop` → main，走当前 main ruleset
3. 手动合并 develop → main
4. 验证 main 上 Vercel production deploy 仍正常

#### Step 2：Railway production env 启用 Wait for CI

> 来源：CI 计划 §Phase 2

1. Railway Dashboard → 项目 → production env → Settings
2. 找到 **Wait for CI** toggle，翻成 ON
3. 触发一次 develop push 验证：CI 全绿前 Railway 不重新部署

### 3.3 不在 Phase 0.0（推到 Phase 1.6）

- ❌ Railway 新建 staging env
- ❌ Vercel 断开 main 自动部署
- ❌ Vercel Deploy Hook 创建
- ❌ GitHub Actions `deploy.yml`
- ❌ 文档（AGENTS.md / release-process.md）同步

理由：这些都涉及 Vercel project / Railway service 名字 + root directory，Phase 1 都会改。Phase 1.6 在新结构上一次配完。

### 3.4 完成标准

- main = develop（`git log main..develop` 空）
- Railway production env Wait for CI = ON
- 一次 PR 合 develop 验证 CI 失败时 Railway 不部署

---

## 4. Phase 0.5 — 迁移前升级

### 4.1 分支策略

- 分支：`chore/dep-upgrade-phase-0-5`
- 基分支：`develop`
- 不在软冻结期内（软冻结从 Phase 1 开始）
- **已受 Phase 0.0 Wait for CI 保护**

### 4.2 升级清单

**前端**（在 `client/` 下）：

| 包 | 当前 | 目标 | 备注 |
|---|---|---|---|
| vue | ^3.4.0 | ^3.5.x | minor，无 breaking |
| vue-router | ^4.2.0 | ^4.5.x | minor |
| naive-ui | ^2.38.0 | ^2.4x.x | minor |
| eslint | ^10.2.1 | ^10.x（最新） | minor |
| eslint-plugin-vue | ^10.9.0 | ^10.x（最新） | minor |
| @eslint/js | ^10.0.1 | ^10.x（最新） | minor |
| vue-eslint-parser | ^10.4.0 | ^10.x（最新） | minor |
| @playwright/test | ^1.59.1 | ^1.5x.x（最新） | minor |
| jsdom | ^24.0.0 | ^26.x | major（影响小） |
| @vue/test-utils | ^2.4.8 | ^2.4.x（最新） | patch |
| unplugin-auto-import | ^21.0.0 | ^21.x | patch |
| unplugin-vue-components | ^32.0.0 | ^32.x | patch |
| globals | ^17.5.0 | ^17.x | patch |

**后端**（在 `server/` 下）：

| 包 | 当前 | 目标 | 备注 |
|---|---|---|---|
| supertest | ^6.3.0 | ^7.x | major（影响小） |
| dotenv | ^16.4.5 | ^16.x（最新） | patch |
| eslint | ^10.2.1 | ^10.x（最新） | minor |

**不在 Phase 0.5**（推到 Phase 1.5）：

`vite` `vitest` `@vitejs/plugin-vue` `@vitest/coverage-v8` `pinia` `koa` `koa-router` `koa-bodyparser` `jest` `@types/jest`

### 4.3 执行规则

- **每个升级一个 commit**，commit message：`chore(deps): bump <pkg> from x.y to a.b`
- 每个 commit 后跑：`npm test` + `npm run lint` + `npm run build` + 本地 dev 手测一轮
- 整批完成后开 PR，preview 验证所有功能（登录 / 蛇游戏 / 提分 / 排行榜 / 皮肤）
- PR 合并 develop 后 → 直接进入 Phase 1（无需等待）

---

## 5. Phase 1 — 迁移本体

### 5.1 分支策略

- 分支：`codex/chore-monorepo-phase1`
- 基分支：`develop`
- **软冻结启动**：开 PR 当天在 `AGENTS.md` 临时章节声明软冻结期（结束后删除）

### 5.2 软冻结期约束（D7）

冻结期间 `develop` 上**允许**：
- 文档内容修订（不改文件名 / 不挪位置）
- 单文件内 bug 修复（不影响 import / 路径）
- 配置值微调（如 timeout 数值）
- 紧急安全补丁（即使违反上述也允许，但要在 PR 描述说明）

冻结期间 `develop` 上**禁止**：
- 新增文件 / 新增目录
- 改文件名 / 移动文件
- 改 import / require 路径
- 改 root `package.json` / config 路径
- 大型重构

### 5.3 执行步骤

#### Step 1：Node 24 升级（独立 commit）

1. 改 root `package.json#engines.node`：`"20.x"` → `"24.x"`
2. 改 `client/package.json#engines`、`server/package.json#engines`（若有）
3. 改 `.nvmrc`（若有）→ `24`
4. 本地 `nvm use 24` / `volta install node@24` 切换
5. `npm install` + `npm test` + `npm run build` 三件事跑通
6. commit：`chore: bump node engines to 24.x`

#### Step 2：项目改名 — 代码层（独立 commit）

1. root `package.json#name`：`kinetic-arcade` → `playlab`
2. `client/package.json#name`：`kinetic-arcade-client` → `@playlab/web`（暂时还没改目录，name 先改）
3. `server/package.json#name`：`kinetic-arcade-server` → `@playlab/api`
4. 全仓 grep `kinetic-arcade` 替换为 `playlab`（注意区分 npm name 上下文）
5. commit：`chore: rename project to playlab`

#### Step 3：纯 git mv 搬家（**关键 commit，必须独立**）

按 [`docs/learning/git-rename-history.md`](../../learning/git-rename-history.md) 规范：

```bash
git mv client apps/web
git mv server apps/api
git commit -m "chore: move client/server to apps/web apps/api"
```

**此 commit 内不修改任何文件内容**。git rename 检测必须 100% 命中。代码此刻是坏的，下个 commit 修复。

本地一次性配置：
```bash
git config diff.renames copies
git config diff.renameLimit 999999
```

#### Step 4：路径引用修复（独立 commit）

修改以下文件中所有 `client/` `server/` 路径引用：

**根目录配置**：
- `package.json` — `workspaces` 字段（待 Step 5 删除）
- `.gitignore` — 路径模式
- `playwright.config.js`（若 root 有）
- 任何 root 脚本

**`apps/web/` 内部**：
- `vite.config.js` — `root` / `resolve.alias` / `build.outDir`
- `vitest.config.js`
- `playwright.config.js`
- `eslint.config.js`
- `vercel.json` — rewrite 路径不变（仍 `/api/:path*` → Railway URL）
- `package.json#scripts` — 路径

**`apps/api/` 内部**：
- `jest.config.js`
- `eslint.config.js`
- `package.json#scripts`

**`supabase/` 目录**：
- 检查是否引用 `server/` 路径

commit：`chore: update path references for monorepo`

#### Step 5：pnpm + Turborepo 接入（独立 commit）

1. **删除 npm 痕迹**：
   ```bash
   rm package-lock.json
   rm apps/web/package-lock.json
   rm apps/api/package-lock.json
   rm -rf node_modules apps/web/node_modules apps/api/node_modules
   ```

2. **root `package.json` 改造**：
   - 删 `workspaces` 字段
   - 加 `packageManager: "pnpm@9.15.0"`
   - scripts 改用 turbo：
     ```json
     {
       "scripts": {
         "dev": "turbo run dev",
         "build": "turbo run build",
         "test": "turbo run test",
         "lint": "turbo run lint",
         "test:e2e": "turbo run test:e2e"
       }
     }
     ```
   - devDeps 加 `turbo`，删 `concurrently`

3. **新建 `pnpm-workspace.yaml`**：
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

4. **新建 `.npmrc`**：
   ```ini
   auto-install-peers=true
   strict-peer-dependencies=false
   public-hoist-pattern[]=*eslint*
   public-hoist-pattern[]=*prettier*
   public-hoist-pattern[]=@types/*
   ```

5. **新建 `turbo.json`**：
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": ["dist/**", ".output/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "test": {
         "dependsOn": ["^build"],
         "outputs": ["coverage/**"]
       },
       "test:e2e": {
         "dependsOn": ["^build"],
         "cache": false
       },
       "lint": {}
     }
   }
   ```

6. **`.gitignore` 加 `.turbo/`**

7. **corepack enable + pnpm install**：
   ```bash
   corepack enable
   corepack prepare pnpm@9.15.0 --activate
   pnpm install
   ```

8. 跑通 `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm lint`

commit：`chore: switch to pnpm + turborepo`

#### Step 6：建 `packages/shared` 占位（独立 commit）

```
packages/shared/
  package.json
  src/
    index.js
```

`packages/shared/package.json`：
```json
{
  "name": "@playlab/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js"
}
```

`packages/shared/src/index.js`：
```js
export const PLAYLAB_VERSION = '0.0.0';
```

`pnpm install` 后验证 workspace 链接生效（`apps/web/node_modules/@playlab/shared` 应是 symlink）。

commit：`chore: scaffold packages/shared`

#### Step 7：CI / GitHub Actions 同步（独立 commit）

修改 `.github/workflows/*.yml`：
- 装 pnpm（用 `pnpm/action-setup` action）
- 装 Node 24（`actions/setup-node@v4` with `node-version: 24`）
- cache pnpm store
- 所有 `client/` `server/` 路径替换
- job 命令改 `pnpm` / `pnpm turbo run xxx`

> 注：本步只更新现有 workflows 的路径 / 工具链。新增 `deploy.yml`（CI 全套门控）放 Phase 1.6。

commit：`ci: migrate workflows to pnpm + turborepo`

#### Step 8：文档路径同步（独立 commit）

`docs/*` 中所有 `client/` `server/` `kinetic-arcade` 字样：

- `docs/project-context.md`
- `docs/development-workflow.md`
- `docs/environment.md`
- `docs/api-conventions.md`
- `docs/testing-strategy.md`
- `docs/release-process.md`
- `docs/security-boundaries.md`
- `docs/ai-collaboration.md`
- `docs/ai-tooling.md`
- `docs/project-inventory.md`
- `docs/cleanup-candidates.md`
- `docs/coding-style.md`
- `AGENTS.md`、`CLAUDE.md`

走 spec-debt 紧急例外通道（本 plan 阻塞，必须立即改）。

commit：`docs: update path references after monorepo migration`

### 5.4 部署平台手动操作（你来做）

**这些不在 git 里，不能由 Codex 做，必须用户在 Vercel / Railway UI 操作**。

#### Vercel

1. Project Settings → General：
   - Project Name：`kinetic-arcade-client` → `playlab-web`
2. Build & Development Settings：
   - Root Directory：`client` → `apps/web`
   - Install Command：`pnpm install`
   - Build Command：`pnpm turbo run build --filter=@playlab/web`
   - Output Directory：保持 `dist`（Vite 默认）
3. 环境变量：检查是否有路径相关的 env，按需更新
4. 触发一次 redeploy 验证 preview

#### Railway

1. Service Settings：
   - Service Name：`kinetic-arcade-server` → `playlab-api`
2. Build Settings：
   - Root Directory：`server` → `apps/api`
   - Build Command：`pnpm install && pnpm turbo run build --filter=@playlab/api`（如有 build；当前 Koa 无 build 步骤可省）
   - Start Command：`pnpm --filter=@playlab/api start`
3. 环境变量：检查 `PORT` 等保持不变
4. **Wait for CI toggle 保持 ON**（Phase 0.0 已开）
5. 等 Railway 重新部署，**记下新的 production URL**（可能从 `kinetic-arcade-server-production.up.railway.app` 变成 `playlab-api-production.up.railway.app`）

#### 同步 Railway 新 URL 回代码

6. 改 `apps/web/vercel.json` 中 rewrite destination 为新 Railway URL
7. 提交补丁 commit：`fix: update vercel rewrite to new railway url`
8. 重新触发 Vercel deploy，验证 `/api/*` 调用成功

#### GitHub repo 改名

9. GitHub repo Settings → General → Repository name：`home` → `playlab`
10. 本地更新 remote：
    ```bash
    git remote set-url origin git@github.com:<user>/playlab.git
    ```
11. 验证 Vercel ↔ GitHub 集成、Railway ↔ GitHub 集成均正常（GitHub 自动 301 旧 URL，但建议手动确认）
12. 检查 deploy hooks（如有硬编码 repo name 需改）

### 5.5 验证矩阵

#### 本地

| 检查 | 命令 | 期望 |
|---|---|---|
| 依赖安装 | `pnpm install` | 无错误，workspace 链接生效 |
| 开发服 | `pnpm dev` | web + api 双端启动 |
| 构建 | `pnpm build` | `apps/web/dist/` 生成 |
| 单测 | `pnpm test` | 全绿 |
| Lint | `pnpm lint` | 全绿 |
| E2E | `pnpm test:e2e` | 全绿 |
| Turbo cache | 二次 `pnpm build` | 命中 cache |
| git history | `git log --follow apps/web/src/main.js` | 显示完整历史 |

#### Preview

- Vercel preview deploy 跑通
- Railway preview / production env 跑通
- 前端调 `/api` 不 404
- 登录 / 提分 / 排行榜 / 皮肤切换 手测一轮全 OK

### 5.6 风险与回滚

| 风险 | 概率 | 兜底 |
|---|---|---|
| pnpm 严格 hoist 撞 peer dep | 中 | 加 `public-hoist-pattern`；不到必须不上 `shamefully-hoist=true` |
| git rename history 断 | 中 | Step 3 严格执行；合并前 `git log --follow` 验证 |
| Vercel / Railway 环境变量丢 | 低 | 改前导出环境变量列表存档 |
| Railway 新 URL 漂移 | 高（必发生） | Step 5.4-6 同步 |
| CI 在迁移分支期间全红 | 高（必发生） | 迁移分支不直接对 develop 触发 CI；合并 PR 前最后再跑一次 |
| Phase 1 工时超预算 | 中 | 软冻结窗口扩展到 14 天上限；无法完成时回滚到 Phase 0.5 末态 |

**回滚策略**：

- Phase 1 PR 合 develop 前发现致命问题 → revert PR，回到 Phase 0.5 末态
- 合并后发现问题 → 单 commit 反向 revert（因为每步都是独立 commit，可定向）
- Vercel / Railway 配置改坏 → UI 改回旧 root directory；部署回滚到旧版本

### 5.7 完成标准

- 全部 8 个 commit 合并 develop
- 部署平台 5.4 全部手动操作完成
- Vercel + Railway preview / production 双端跑通
- 验证矩阵 5.5 全绿
- `AGENTS.md` 软冻结声明删除
- 通知用户软冻结结束

---

## 6. Phase 1.5 — 迁移后 major 升级

软冻结结束后开始。每个 group 一个独立分支 + 独立 PR。

### 6.1 Group 1：vite 5 → 7

- 分支：`chore/upgrade-vite-7`
- 内容：
  - `vite ^5.0.0` → `^7.x`
  - `@vitejs/plugin-vue ^5.0.0` → `^6.x`
- 注意点：
  - Vite 6 引入 Environment API（多环境配置形态变化）
  - Rolldown bundler 切换中（默认仍 Rollup，可保留）
- 验证：build / dev / preview 三关
- 工时：半天 - 1 天

### 6.2 Group 2：vitest 1 → 3

- 分支：`chore/upgrade-vitest-3`
- 基于 Group 1 合并后
- 内容：
  - `vitest ^1.0.0` → `^3.x`
  - `@vitest/coverage-v8 ^1.6.1` → `^3.x`
- 注意点：config 形态微调；snapshot 格式可能变
- 验证：所有单测 + coverage 跑通
- 工时：半天

### 6.3 Group 3：pinia 2 → 3

- 分支：`chore/upgrade-pinia-3`
- 基于 Group 2 合并后
- 内容：`pinia ^2.1.0` → `^3.0.x`
- 注意点：composition store API 部分签名变化；逐 store 检查
- 验证：所有 store + 依赖 store 的组件功能跑通
- 工时：半天 - 1 天

### 6.4 Group 4：koa 2 → 3 + 周边

- 分支：`chore/upgrade-koa-3`
- **最危险的一组**，独立 PR + 详细测试
- 内容：
  - `koa ^2.15.0` → `^3.x`
  - `koa-router ^12.0.0` → `^13.x`
  - `koa-bodyparser ^4.4.0` → `@koa/bodyparser ^5.x`（**包改名**）
- 注意点：
  - koa 3 移除 legacy generator middleware（项目应该未用，需 grep 确认）
  - ctx 个别属性 API 调整
  - bodyparser scoped 包名变了，import 全替换
- 验证：所有 API 端点逐个测；E2E 全跑
- 工时：1 天

### 6.5 Group 5：jest 29 → 30

- 分支：`chore/upgrade-jest-30`
- 内容：
  - `jest ^29.7.0` → `^30.x`
  - `@types/jest ^29.5.0` → `^30.x`
- 注意点：snapshot / globals / config 调整
- 验证：所有后端单测跑通
- 工时：半天

### 6.6 升级期间策略

- 每个 PR 合并后让 develop preview 跑半天观察
- 不连续两天合并 major bump
- 任一 group 升级炸了 → 该 group 单独回滚，不影响后续
- pinia 改造面意外大 → pinia 推到最后（顺序变 1→2→4→5→3）

---

## 7. Phase 1.6 — CI 全套补完

### 7.1 目的

迁移 + 升级全部稳定后，把 CI 计划剩下部分（Vercel deploy hook / Railway staging env / GHA deploy.yml）一次性配在新 playlab/apps 结构上。Phase 0.0 已经把 main=develop sync + Wait for CI toggle 做完。

### 7.2 执行步骤

> 全部来源：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md) §Phase 2-§Phase 7。完整步骤参考原计划，本节只列时间线锚点和 Phase 1 迁移后的差异。

#### Step 1：Railway 新建 staging environment

> 来源：CI 计划 §Phase 2

- 在 `playlab-api`（Phase 1 改名后）下新建 `staging` env 跟 `develop`
- 复制 production env 变量（含 `ALLOWED_ORIGINS` 含 develop preview Vercel URL）
- 开 Wait for CI ON
- production env 同时切换跟踪分支为 `main`（Phase 0.0 没动这个，是因为当时跟 develop；现在 Phase 1.6 切到 main）

#### Step 2：Vercel 关 main 自动部署 + 创建 Deploy Hook

> 来源：CI 计划 §Phase 3

- `playlab-web`（Phase 1 改名后）→ Settings → Git → 关 main 自动部署
- 创建 main 的 Deploy Hook，记下 URL

#### Step 3：GitHub secret + deploy.yml

> 来源：CI 计划 §Phase 4-§Phase 5

- repo（已改名 `playlab`）→ Secrets → 加 `VERCEL_DEPLOY_HOOK_MAIN`
- 新分支 `feat/ci-deploy-gating` → `.github/workflows/deploy.yml`：
  - on: workflow_run（依赖现有 CI workflow 全绿）
  - 触发 Vercel deploy hook

#### Step 4：测试验证

> 来源：CI 计划 §Phase 6

- develop 流：push develop → CI → Railway staging 部署
- main 流：合 main → CI → Vercel + Railway production 部署
- CI 失败场景：故意写一个失败 PR，验证 Vercel / Railway 都不部署

#### Step 5：文档同步

> 来源：CI 计划 §Phase 7

更新：
- `AGENTS.md` 部署架构章节（当前现状 vs 目标架构 → 改成"已落地"）
- `docs/release-process.md`（双 env 双分支流程）
- `docs/development-workflow.md`（CI 门控说明）
- `docs/environment.md`（staging env 变量表）
- `docs/security-boundaries.md`（如涉及）
- `docs/ARCHITECTURE.md`（部署形态切换）

### 7.3 完成标准

- Railway staging env + production env 双存在；都跟 CI
- Vercel main 自动部署关闭；deploy hook 生效
- GHA deploy.yml 跑通；CI 失败时双端都不部
- 文档全部反映新架构
- `AGENTS.md` 部署章节"现状 vs 目标"双段落删除，留单段"现行架构"

---

## 8. 完成后续衔接

Phase 1.6 全部完成 = 平台化重构基座准备就绪 + CI 门控完整闭环。下一步按 vision §3 优先级开 P0 子 plan：

```
P0（基座，Phase 1.6 完成后开始）
  A. 数据模型扩展      → 子 plan 待创建
  B. RBAC + auth 抽 packages → 子 plan 待创建（含 Q1 L1 抽法）
  C. 模块化目录        → 子 plan 待创建
  D. 服务端分层        → 子 plan 待创建
  J. 监控/Sentry       → 子 plan 待创建
```

P0 §B 子 plan 内：
- 抽出 `packages/auth-client` + `packages/auth-server`
- 同时定 role enum / session schema / audit_logs append-only
- 顺手把 `packages/shared` 用 TS 化（M3 渐进 TS 第一步）

---

## 9. 关联文档与链接

- vision 母文档：[`platform-refactor-vision.md`](./platform-refactor-vision.md)
- CI 计划原文：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md)
- git rename 学习笔记：[`docs/learning/git-rename-history.md`](../../learning/git-rename-history.md)（本地未入仓，见 SD-001）
- spec 演进台账：[`docs/audits/spec-debt.md`](../../audits/spec-debt.md)
- 系统设计审计：[`docs/audits/system-design-audit.md`](../../audits/system-design-audit.md)
- 项目上下文：[`docs/project-context.md`](../../project-context.md)
- 开发流程：[`docs/development-workflow.md`](../../development-workflow.md)

## 10. 变更日志

- 2026-05-07：初稿，基于 14 项决策汇总（D1-D7、U1-U3、M1-M4、Q1）
- 2026-05-07：CI 顺序定 P1=C / P2=A，新增 Phase 0.0（最小 CI 门控）+ Phase 1.6（CI 全套补完），编织 [`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md) 进时间线
