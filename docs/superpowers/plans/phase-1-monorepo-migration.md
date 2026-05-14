# Phase 1：Monorepo 迁移本体（战术子 plan）

> 状态：**待执行** — §决策待审 §A-§H 全部确认 2026-05-14（见 §变更日志）
> 母 plan：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md) §5
> 分支：`codex/chore-monorepo-phase1`（母 plan §5.1 命名）
> 基分支：`develop`
> 预计工时：**3-5 天**（8 commit + 部署平台联调 + 验证）
> 模型主力：用户 40%（Vercel / Railway / GitHub UI）/ Codex / Claude Code 60%（代码 + 配置）
> Claude Code 角色：方案审查 + git mv 拆 commit 监督 + 部署联调审查 + 执行（与 Codex 分工见 `docs/ai-collaboration.md`）
>
> **AGENTS.md 准入风险等级：高**
>
> 理由：
> - 部署平台 root directory 改名 + GitHub repo 改名（影响 Vercel / Railway / Webhook 集成）
> - 全仓 `git mv` 搬家（rename history 断裂风险）
> - 包管理器切换 npm → pnpm（lockfile + hoisting 风险）
> - Node 20 → 24（生产 runtime 切换）
> - 软冻结 develop 分支 7 天（影响其他工作）
>
> 必须按 AGENTS.md「功能与变更准入标准」高风险流程：方案 + 用户确认 + 测试 / 回滚 / 安全影响说明全部到位后才执行。
>
> **前置依赖**：
> - Phase 0.0 ✅（Railway Wait for CI ON）
> - Phase 0.5 ✅（minor 升级落 develop via PR #84）
> - Dependabot 暂停（本 plan §0 准备工作）
> - 用户对 §决策待审 全部明确确认

---

## ✅ 决策确认（2026-05-14，用户审定）

母 plan §10 中影响 Phase 1 执行的子集 + 本子 plan 派生时新出现项，全部确认结果：

| ID | 项 | 确认结果 | 备注 |
|---|---|---|---|
| A | Plan 拆分粒度 | ✅ 一份 plan / 一个分支 / 多 commit / 单 PR | 部署 + git mv + lockfile 切换原子性要求；拆开破原子性 |
| B | `packages/shared` 初始内容 | ✅ 最小占位（仅 `PLAYLAB_VERSION`） | 真实业务常量留 P0 §B RBAC 子 plan |
| C | 软冻结期间 develop 紧急 bug 处理 | ✅ 允许中断；迁移分支不 rebase；合并时一次性三方 merge 解冲突 | rebase 会破坏 git mv rename 检测；三方 merge 自动识别路径变 vs 内容变 |
| D | pnpm 版本 | ✅ `pnpm@9.15.0`（精确锁，corepack 激活）| pnpm 10 留 Phase 1.5 末或 1.6 独立 PR；变量最少化 |
| E | Node 24 LTS 版本号锁定 | ✅ `engines.node: "24.x"` + 新增 `.nvmrc` 值 = `24` | engines 表达兼容范围；`.nvmrc` 给本地工具链对齐 |
| F | `corepack` 启用方式 | ✅ `package.json#packageManager: "pnpm@9.15.0"` + 文档提示 `corepack enable` | Node 官方标准字段；不加 `engines.pnpm` 避免重复 |
| G | GitHub repo 改名时机 | ✅ Phase 1 末（部署联调全绿 + 24h 观察后） | 改名是低风险操作但"不确定窗口"在迁移期间最难诊断 |
| H | Vercel 改名次序 | ✅ 先 Project Name → 同步 CORS/Auth 引用点（"先加新保旧"） → 再 Root Directory | URL 漂移影响面广（Railway CORS / Supabase redirect / 文档），先 expose 同步好再动 build |

---

## 🎯 本次只做什么

把仓库结构从 `npm workspaces`（client/server 二包）迁到 `pnpm + Turborepo + apps/* + packages/shared`，同时：
- 项目改名 `kinetic-arcade` → `playlab`
- npm scope `@playlab`
- Node 20 → 24
- GitHub repo `home` → `playlab`
- Vercel 项目 / Railway service root directory 同步切换

8 个独立 commit + 部署平台 UI 操作 + 验证矩阵。

## ❌ 明确不做什么

- ❌ 不做依赖 major 升级（vite 7 / vitest 3 / pinia 3 / koa-bodyparser 改名 / jest 30 → Phase 1.5）
- ❌ 不引入 React / Java（M1 / M2 已决）
- ❌ 不动业务代码逻辑（仅路径 + 配置 + 元数据）
- ❌ 不在 `packages/shared` 填真实业务常量（默认建议 B：最小占位；留 P0 §B RBAC 子 plan）
- ❌ 不启用 Turborepo Remote Cache（D4 决策；推到模块数 ≥ 5 时再开）
- ❌ 不升 TS（M3 渐进；Phase 1.5 后新包 TS 化）
- ❌ 不动 CI deploy gating 全套（Vercel deploy hook / staging env / GHA deploy.yml → Phase 1.6）
- ❌ 不动 Supabase schema / 业务数据
- ❌ 不在 Phase 1 期间合并任何业务 PR（软冻结）

## 🔍 现状漂移说明（与母 plan §5 偏差）

母 plan §5 写于 2026-05-07，本子 plan 派生于 2026-05-14；7 天内的实际偏差：

| 项 | 母 plan | 实际 | 本子 plan 决策 |
|---|---|---|---|
| 待升 koa | Phase 1.5 Group 4 与 koa-router / bodyparser 一起升 | Dependabot 已抢跑合并 koa 2→3 + koa-router 12→14（PR #65 / #68） | Phase 1 不再需处理 koa；Phase 1.5 Group 4 仅剩 bodyparser 改名 |
| 11 个 `kinetic-arcade` 引用 | 母 plan 未列 | grep 实测：3 package.json + 1 vercel.json + 1 docs/release-process.md + 5 lockfile / archive | Step 2 改名清单按实测列；Step 8 文档清单细化 |
| `.nvmrc` | 母 plan §5.3 Step 1 写"若有"则改 | 实测：仓库无 `.nvmrc` | Step 1 决策（决策 E）：是否新建 |
| Dependabot | 母 plan 未列 | 已加 major bump ignore + 仍 weekly 自动开 minor PR | 本子 plan §0 准备工作必须先暂停 |

---

## 🚧 §0 准备工作（动 Step 1 前必做）

### 0.1 暂停 Dependabot + auto-merge

**目的**：Phase 1 软冻结期 7 天内，避免 Dependabot 抢跑合 PR 撞 lockfile / 路径变更 commit。

#### 0.1.1 改 `.github/dependabot.yml`

把 4 个 `updates:` 项的 `schedule.interval` 全改 `monthly`（最长可推迟），并加注释说明：

```yaml
# Phase 1 monorepo 迁移期间临时改 monthly（2026-05-14 起）；
# Phase 1.6 完成后改回 weekly + 改路径 /client → /apps/web、/server → /apps/api
schedule:
  interval: monthly
```

> 备选：直接注释整个 `updates:` 块。但 monthly 更显式且 GitHub 原生支持。

#### 0.1.2 临时禁用 `develop-pr-auto-merge.yml`

在 `if:` 加跳过 dependabot 作者的条件：

```yaml
jobs:
  develop-pr:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false && github.actor != 'dependabot[bot]'
```

> 备选：整个 workflow 文件改名为 `.disabled` 后缀。但条件式更精细 — 用户手动开的 PR 仍受益自动 merge。

#### 0.1.3 把这 2 处改动作为 Step 0 的独立 commit

commit message：`chore(ci): pause dependabot auto-merge during phase 1 migration`

并入 Phase 1 PR；Phase 1.6 完成后另开 PR 反向恢复（同时改路径）。

### 0.2 软冻结声明

#### 0.2.1 在 `AGENTS.md` 顶部加临时章节

```markdown
## Phase 1 monorepo 迁移软冻结（临时，2026-MM-DD 起）

> 关联：`docs/superpowers/plans/phase-1-monorepo-migration.md`
> 失效条件：Phase 1 PR 合并 develop + 部署平台联调全跑通后**删除本章节**

冻结期间 develop 上**禁止**：
- 新增文件 / 新增目录
- 改文件名 / 移动文件
- 改 import / require 路径
- 改 root `package.json` / 各 config 路径
- 大型重构

冻结期间 develop 上**允许**：
- 文档内容修订（不改文件名 / 不挪位置）
- 单文件内 bug 修复（不影响 import / 路径）
- 配置值微调（如 timeout 数值）
- 紧急安全补丁（认证 / 支付 / 生产数据）

紧急 bug 处理（决策 C 默认）：允许中断；迁移分支不 rebase；合并迁移分支时一次性解冲突。
```

#### 0.2.2 commit message：`docs(agents): declare phase 1 soft freeze`

可与 §0.1 合一个 commit：`chore: pause dependabot + declare phase 1 freeze`

### 0.3 备份与确认

| 项 | 命令 / 操作 | 用途 |
|---|---|---|
| Vercel env 列表 | Vercel UI 截图或导出 | 部署平台改名前留底 |
| Railway env 列表 + production URL | Railway UI 截图 | 同上；URL 用于 §5.4 步骤 6 对照 |
| 当前 develop tip SHA | `git rev-parse origin/develop` | 回滚锚点 |
| 当前 main tip SHA | `git rev-parse origin/main` | 同上 |

### 0.4 完成标准

- `.github/dependabot.yml` schedule = monthly
- `.github/workflows/develop-pr-auto-merge.yml` 跳过 dependabot bot
- `AGENTS.md` 软冻结声明已加
- 备份截图已存档（用户操作）
- Step 0 commit 已推 `codex/chore-monorepo-phase1` 分支

---

## 📦 执行步骤（Step 1-8，每步独立 commit）

> 完整内容见母 plan §5.3。本节列：每步前置自检、执行命令、commit message、提交后验证。

### Step 1：Node 24 升级

#### 前置自检
- 本地已安装 Node 24（`node -v` ≥ 24.0.0）
- `npm test` / `npm run build` 在 Node 20 下当前 develop 通过（基线）

#### 执行
1. 改 `package.json#engines.node`：`"20.x"` → `"24.x"`
2. 改 `client/package.json#engines.node`（如有；当前实测 root 才有）
3. 改 `server/package.json#engines.node`（如有）
4. 新增 `.nvmrc` 文件，内容 = `24`（决策 E）
5. `npm install`（更新 npm 内部 Node 校验）
6. `npm test`、`npm run build`、`npm run lint` 三件事跑通
7. 本地手测金链路（登录 / 提分 / 排行榜 / 皮肤）

#### commit
`chore: bump node engines to 24.x`

#### 提交后验证
- CI 全绿（PR 内）
- preview 部署不受影响（Node 20→24 切换不在本 commit；CI runner 仍按 workflow `node-version` 字段；Step 7 才同步）

### Step 2：项目改名 — 代码层

#### 前置自检
- `grep -rn "kinetic-arcade" --include="*.json" --include="*.yml" --include="*.md"` 确认实测点
- 注意区分：npm `name`（要改 `playlab` / `@playlab/*`）vs 字符串引用（按上下文）

#### 执行
1. root `package.json#name`：`kinetic-arcade` → `playlab`
2. `client/package.json#name`：`kinetic-arcade-client` → `@playlab/web`
3. `server/package.json#name`：`kinetic-arcade-server` → `@playlab/api`
4. `client/vercel.json` 中如有项目名引用，同步改
5. `docs/release-process.md` 中 `kinetic-arcade` 字样改 `playlab`
6. 不改 archive 目录（历史快照保留原名）
7. `npm install`（更新 lockfile 中 name 字段）
8. `npm test` / `npm run build` 跑通

#### commit
`chore: rename project to playlab`

#### 提交后验证
- `grep -rn "kinetic-arcade" --include="*.json" --include="*.yml" --include="*.md"` 仅 archive 命中
- CI 全绿

### Step 3：纯 git mv 搬家（**关键 commit，必须独立**）

#### 前置自检
```bash
git config diff.renames copies
git config diff.renameLimit 999999
git status --porcelain  # 必须空
```

#### 执行
```bash
git mv client apps/web
git mv server apps/api
mkdir -p packages
git commit -m "chore: move client/server to apps/web apps/api"
```

#### **此 commit 内禁止任何文件内容修改**。代码此刻是坏的（路径引用全断），下一步修。

#### 提交后验证
- `git log --follow apps/web/src/main.js` 显示完整历史（一直追到 `client/src/main.js` 时代）
- `git log --follow apps/api/src/index.js`（或入口文件）同上
- `git diff HEAD~1 --stat` 应只看到 R100（rename 100%）

### Step 4：路径引用修复

#### 前置自检
- Step 3 已合并到当前分支
- 列出所有需改文件（见母 plan §5.3 Step 4）

#### 执行
**根目录配置**：
- `package.json`：`workspaces` 字段（保留至 Step 5 删除；Step 4 仅改路径 `client` → `apps/web`、`server` → `apps/api`）
- `.gitignore`：路径模式
- 任何 root 脚本

**`apps/web/` 内部**：
- `vite.config.js` — `root` / `resolve.alias` / `build.outDir`
- `vitest.config.js`
- `playwright.config.js`
- `eslint.config.js`
- `vercel.json` — rewrite destination 路径不变（仍 `/api/:path*` → Railway URL）
- `package.json#scripts` 内绝对路径

**`apps/api/` 内部**：
- `jest.config.js`
- `eslint.config.js`
- `package.json#scripts`

**`supabase/` 目录**：
- 检查是否引用 `server/` 路径

#### commit
`chore: update path references for monorepo`

#### 提交后验证
- `npm install`、`npm test`、`npm run build` 在 npm workspaces 下仍跑通（pnpm 切换在 Step 5）
- 本地手测金链路

### Step 5：pnpm + Turborepo 接入

#### 前置自检
- 决策 D 已确认（pnpm 版本 = `9.15.0`）
- 决策 F 已确认（`packageManager` 字段 + corepack）
- `corepack` 已可用（Node 24 自带）；本地一次性 `corepack enable`

#### 执行
完整步骤见母 plan §5.3 Step 5（删 lockfile、改 root package.json、新建 pnpm-workspace.yaml / .npmrc / turbo.json、`.gitignore` 加 `.turbo/`、corepack enable + pnpm install）。

要点：
1. 删 npm 痕迹：`rm package-lock.json client/package-lock.json server/package-lock.json` 并清 `node_modules`
2. root `package.json`：删 `workspaces`，加 `packageManager: "pnpm@9.15.0"`（决策 D），scripts 改 turbo
3. 新建 `pnpm-workspace.yaml` / `.npmrc` / `turbo.json`
4. corepack enable + pnpm install
5. 跑通 `pnpm dev` / `pnpm build` / `pnpm test` / `pnpm lint`

#### commit
`chore: switch to pnpm + turborepo`

#### 提交后验证
- `pnpm install` 无 peer dep 警告（或仅可接受白名单）
- workspace 链接生效：`ls apps/web/node_modules/@playlab` 应见 symlink（如 Step 6 已建）
- `pnpm build` 二次跑命中 turbo cache（输出含 `cache hit`）

### Step 6：建 `packages/shared` 占位

#### 前置自检
- 决策 B 已确认（默认：最小占位）

#### 执行
按母 plan §5.3 Step 6：
```
packages/shared/
  package.json  # name: @playlab/shared, version: 0.0.0, type: module
  src/
    index.js    # export const PLAYLAB_VERSION = '0.0.0';
```

`pnpm install` 后验证 workspace 链接。

#### commit
`chore: scaffold packages/shared`

#### 提交后验证
- `apps/web/node_modules/@playlab/shared` 是 symlink → `packages/shared`
- `apps/api/node_modules/@playlab/shared` 同上
- `pnpm --filter=@playlab/shared list` 正常

### Step 7：CI / GitHub Actions 同步

#### 前置自检
- Step 5 / 6 已合
- `.github/workflows/ci.yml` / `codeql.yml` / `develop-pr-auto-merge.yml` 备份

#### 执行
修改 `.github/workflows/*.yml`：
- 装 pnpm（用 `pnpm/action-setup@v4` + `version: 9.15.0`）
- Node 24（`actions/setup-node@v4` with `node-version: 24`、`cache: pnpm`）
- 所有 `client/` `server/` 路径替换为 `apps/web` / `apps/api`
- job 命令改 `pnpm` / `pnpm turbo run xxx`
- `develop-pr-auto-merge.yml` 已在 §0.1.2 改过；此处只更 Node / pnpm setup（不动 dependabot 跳过条件）

> 不在本步：新增 `deploy.yml`（CI 全套门控）→ Phase 1.6

#### commit
`ci: migrate workflows to pnpm + turborepo`

#### 提交后验证
- PR 内 CI 全绿
- CI runner 装的是 Node 24 + pnpm 9.15.0

### Step 8：文档路径同步

#### 前置自检
- 列出所有需改文档（母 plan §5.3 Step 8）
- 走 `docs/audits/spec-debt.md` 紧急例外通道（Phase 1 阻塞）

#### 执行
全仓 grep `client/` `server/` `kinetic-arcade` 字样，按上下文修：

- `AGENTS.md`、`CLAUDE.md`
- `docs/project-context.md`
- `docs/development-workflow.md`（**新增 pnpm + corepack 配置段，按决策 F**：协作者首次 `corepack enable` 提示 + `pnpm install` 流程）
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
- `docs/ARCHITECTURE.md`

#### commit
`docs: update path references after monorepo migration`

#### 提交后验证
- `grep -rn "client/\|server/" docs/ AGENTS.md CLAUDE.md` 命中点全是历史/快照引用（archive）
- 主活文档无 `kinetic-arcade` 字样

---

## 🌐 §5.4 部署平台手动操作（用户做，Codex 不能做）

> 完整内容见母 plan §5.4。本节列：执行时机锚点 + checklist。

### 时机锚点

| 操作 | 时机 | 触发条件 |
|---|---|---|
| 备份 Vercel / Railway env + URL | §0 准备工作内 | 任何代码 commit 前 |
| Vercel 改 Project Name + Root Directory + Build Command | Step 5 合后（pnpm 已切） | 本地 `pnpm build` 跑通 |
| Railway 改 Service Name + Root Directory + Build/Start Command | 同上 | 同上 |
| 记录 Railway 新 URL → 改 `apps/web/vercel.json` rewrite | 上面 Railway 改完后 | Railway 重新部署成功，新 URL 可见 |
| 提交 `fix: update vercel rewrite to new railway url` commit | 紧跟上一步 | 此 commit 不计入"8 commit"，是 Step 5 后衔接 |
| GitHub repo 改名 `home` → `playlab` + remote 更新 | Phase 1 末（决策 G）| Vercel + Railway 部署联调全绿 |
| 检查 Vercel ↔ GitHub / Railway ↔ GitHub 集成 | repo 改名后立刻 | repo 改名命令完成 |

### Vercel checklist（决策 H：先 Project Name → 同步引用点 → 再 Root Directory）

**Stage 1：改 Project Name + 同步下游引用点（"先加新保旧"）**

- [ ] Vercel UI → Settings → General → Project Name：`kinetic-arcade-client` → `playlab-web`
- [ ] 等 Vercel 新 production URL 出现（约 30 秒）；记下新 URL
- [ ] grep 仓库内所有 `kinetic-arcade-client` / 旧 Vercel URL 引用点：
  ```bash
  grep -rn "kinetic-arcade-client\|kinetic-arcade-client.vercel.app" --include="*.json" --include="*.js" --include="*.md"
  ```
- [ ] **Railway production env `ALLOWED_ORIGINS`：加新 URL，保留旧 URL**（过渡期）
- [ ] **Supabase Dashboard → Auth → URL Configuration → redirect 白名单：加新 URL，保留旧 URL**（过渡期）
- [ ] `apps/api/src/middleware/cors.js`（或同等位置）如硬编码 URL，同样加新保旧
- [ ] `docs/environment.md` 示例 URL 同步（如有）

**Stage 2：改 Root Directory + Build**

- [ ] Vercel UI → Build & Development Settings → Root Directory：`client` → `apps/web`
- [ ] Install Command：`pnpm install`
- [ ] Build Command：`pnpm turbo run build --filter=@playlab/web`
- [ ] Output Directory：保持 `dist`
- [ ] 触发 redeploy → 验证 preview 跑通

**Stage 3：清理旧 URL（推到 Phase 1.6 完成后做）**

- [ ] Railway `ALLOWED_ORIGINS` 删旧 Vercel URL
- [ ] Supabase redirect 白名单删旧 URL
- [ ] 本子 plan 不做此步；记入 Phase 1.6 收尾

### Railway checklist

- [ ] Service Name：`kinetic-arcade-server` → `playlab-api`
- [ ] Root Directory：`server` → `apps/api`
- [ ] Build Command：`pnpm install && pnpm turbo run build --filter=@playlab/api`（Koa 当前无 build 步骤可省）
- [ ] Start Command：`pnpm --filter=@playlab/api start`
- [ ] 环境变量：`PORT` 等保持
- [ ] **Wait for CI toggle 保持 ON**（Phase 0.0 已开）
- [ ] 等重新部署，记下新 production URL（可能从 `kinetic-arcade-server-production.up.railway.app` 变 `playlab-api-production.up.railway.app`）

### 同步新 URL 回代码（Codex/Claude Code 做）

- [ ] 改 `apps/web/vercel.json` rewrite destination 为新 Railway URL
- [ ] commit：`fix: update vercel rewrite to new railway url`
- [ ] Vercel 重新 deploy，验证 `/api/*` 调用成功（preview 上手测登录 / 提分）

### GitHub repo 改名

- [ ] Repo Settings → General → Repository name：`home` → `playlab`
- [ ] 本地：`git remote set-url origin git@github.com:<user>/playlab.git`
- [ ] 验证 `git fetch` 成功
- [ ] 验证 Vercel ↔ GitHub 集成仍正常（GitHub 自动 301 旧 URL，建议手动确认）
- [ ] 验证 Railway ↔ GitHub 集成
- [ ] 检查 deploy hooks（如有硬编码 repo name 需改；当前仓未配 deploy hook）

---

## 📁 预计修改文件 / 模块（汇总）

| 类别 | 文件 / 目录 | Commit 锚点 |
|---|---|---|
| Engines | `package.json` / `client/package.json` / `server/package.json` | Step 1 |
| 改名 | 3 × `package.json#name` + `client/vercel.json` + `docs/release-process.md` | Step 2 |
| 搬家 | `client/` → `apps/web/`、`server/` → `apps/api/` | Step 3（纯 rename）|
| 路径修 | root `package.json`、`.gitignore`、各 `vite.config.js` / `vitest.config.js` / `playwright.config.js` / `eslint.config.js` / `vercel.json` / `jest.config.js` | Step 4 |
| 包管理器 | root `package.json`（删 workspaces 加 packageManager / scripts）、新建 `pnpm-workspace.yaml` / `.npmrc` / `turbo.json`、删 3 个 `package-lock.json` | Step 5 |
| 新增包 | `packages/shared/package.json` / `src/index.js` | Step 6 |
| CI | `.github/workflows/ci.yml` / `codeql.yml` / `develop-pr-auto-merge.yml` | Step 7 |
| 文档 | `AGENTS.md` / `CLAUDE.md` / `docs/*.md`（13 个）| Step 8 |
| Dependabot 暂停 | `.github/dependabot.yml` / `develop-pr-auto-merge.yml`（if 条件）| Step 0 |
| 软冻结声明 | `AGENTS.md` 顶部临时章节 | Step 0 |
| 部署同步 | `apps/web/vercel.json`（Railway 新 URL）| §5.4 衔接 commit |

---

## 🧪 测试与验证（母 plan §5.5）

### 本地（每 Step 后必跑）

| 检查 | 命令 | 期望 |
|---|---|---|
| 依赖装 | `pnpm install`（Step 5 后）/ `npm install`（Step 5 前）| 无错；workspace 链接生效（Step 5 后）|
| 开发服 | `pnpm dev` / `npm run dev` | web + api 双端启动 |
| 构建 | `pnpm build` / `npm run build` | `apps/web/dist/` 生成 |
| 单测 | `pnpm test` / `npm test` | 全绿 |
| Lint | `pnpm lint` / `npm run lint` | 全绿 |
| E2E | `pnpm test:e2e` / `npm run test:e2e` | 全绿 |
| Turbo cache | 二次 `pnpm build`（仅 Step 5 后）| 命中 cache |
| Git 历史 | `git log --follow apps/web/src/main.js` | 显示完整历史（追到 `client/src/main.js`）|

### Preview / Production

- [ ] Vercel preview deploy 跑通（PR 自动触发）
- [ ] Railway preview / production 双端跑通
- [ ] 前端调 `/api/*` 不 404
- [ ] 金链路手测：登录 / 注册 / 提分 / 排行榜 / 皮肤切换

### Phase 1 合并 develop 后

- [ ] develop 分支 CI 全绿
- [ ] develop preview 跑通
- [ ] Vercel + Railway production 部署成功（main 同步跟着）
- [ ] 软冻结声明删除（Step 8 已包含或单 commit）

---

## ✅ 验收标准

- 全部 Step 0-8 + 部署联调 commit 合并 develop（共约 9-10 个 commit）
- 部署平台 §5.4 全部手动操作完成
- Vercel + Railway preview / production 双端跑通
- 测试矩阵全绿
- `AGENTS.md` 软冻结声明删除
- §0.1 Dependabot 暂停状态明确（保留至 Phase 1.6 完成；Phase 1.6 完成后另开 PR 反向恢复）
- §执行记录 表全部填完
- 通知用户软冻结结束
- 顶部 §决策待审 表全部确认状态写入 §变更日志

---

## 🔄 回滚方式（母 plan §5.6）

### 合并 develop 前
- Phase 1 PR 整 revert / abandon → 回到 Phase 0.5 末态（develop tip = ec3a7b2 当时）
- 部署平台 UI 改回旧 root directory + service name
- 解除软冻结声明
- 恢复 Dependabot schedule = weekly（撤 §0.1）

### 合并 develop 后
- 单 commit 反向 revert（每 Step 独立，可定向）
- 部署平台改回旧 root（保留旧名）
- 紧急情况整 PR revert + 部署平台同步回滚

### 部署平台坏
- Vercel：UI 改回旧 root directory；redeploy 旧版本
- Railway：UI 改回旧 root + service name；redeploy 旧版本
- GitHub repo 改名后回滚：Settings 改回旧名（GitHub 自动 301 维持）

### 备份位
- 用户在 §0.3 截图存档的 env 列表 / URL

---

## ❓ 未决问题

> 母 plan §10 6 项中影响 Phase 1 的子集 + 派生时新出现项

1. ~~**决策待审 §A-§H**~~ ✅ 全部确认 2026-05-14（见顶部 §决策确认表）
2. **packages/shared TS 化时机**：Phase 1 默认 JS 占位；M3 渐进 TS。第一个真实导出（P0 §B RBAC 子 plan）时再 TS 化。
3. **Phase 1 期间 hotfix 通道走 main 还是 develop**：母 plan 未明确。建议：紧急 hotfix 走 main（不进迁移分支冲突区），develop 上的 fix 通过 cherry-pick 由用户决定要不要带到 main。本子 plan 默认按此。
4. **Vercel build cache 失效成本**：改 Project Name + Root Directory 会 invalidate cache，首次 build 时间↑（约 +30s-1min）。可接受。
5. **Railway 新 URL 漂移**：URL 切换瞬间，前端 `/api/*` 短暂 404（Vercel rewrite 还指旧 URL）。窗口期：Railway 部署完成 → Vercel rewrite commit 推 → Vercel redeploy（约 2-5 min）。建议：在用户低峰期（凌晨）做。
6. **GitHub repo 改名后 webhook URL 变化**：GitHub 自动 301 但 webhook URL 也跟着变（GitHub 自动同步给已知集成）。Vercel / Railway 集成会自动跟，但其他第三方（如 codecov / sonar）需手动检查。当前仓只有 Vercel / Railway / Dependabot 三个 GitHub App，三者均自动跟。

---

## 🚦 执行顺序（严格）

```
§0 准备工作（含 Dependabot 暂停 + 软冻结声明 commit）
  ↓
Step 1 Node 24
  ↓
Step 2 项目改名（代码层）
  ↓
Step 3 git mv 搬家（纯 rename，零内容修改）
  ↓
Step 4 路径引用修复
  ↓
Step 5 pnpm + Turborepo
  ↓
[部署平台联调：Vercel / Railway 改名 + Root + 命令；记录新 Railway URL]
  ↓
[衔接 commit：fix: update vercel rewrite to new railway url]
  ↓
Step 6 packages/shared 占位
  ↓
Step 7 CI workflows 同步
  ↓
Step 8 文档路径同步（含软冻结声明删除）
  ↓
[GitHub repo 改名（Phase 1 末，决策 G 默认）]
  ↓
PR 合并 develop（main 跟着部署）
```

---

## 📊 执行记录（每个完成点必填）

> 规范：feedback_plan_execution_logging — 每个 step 完成立即填，不批量回填、不省略执行人

| Step | 完成时间 | 执行人 | Commit / PR | 备注 / 偏差 |
|---|---|---|---|---|
| §0.1 暂停 Dependabot | _待填_ | _待填_ | _待填_ | _待填_ |
| §0.2 软冻结声明 | _待填_ | _待填_ | _待填_ | _待填_ |
| §0.3 备份 env / URL | _待填_ | _用户_ | _截图存档位_ | _待填_ |
| Step 1 Node 24 | _待填_ | _待填_ | _待填_ | _待填_ |
| Step 2 改名 | _待填_ | _待填_ | _待填_ | _待填_ |
| Step 3 git mv | _待填_ | _待填_ | _待填_ | rename 100% 验证：_待填_ |
| Step 4 路径修 | _待填_ | _待填_ | _待填_ | _待填_ |
| Step 5 pnpm + turbo | _待填_ | _待填_ | _待填_ | _待填_ |
| Vercel 改名 + Root | _待填_ | _用户_ | _截图_ | _待填_ |
| Railway 改名 + Root | _待填_ | _用户_ | _截图 + 新 URL_ | _待填_ |
| 衔接 commit Vercel rewrite | _待填_ | _待填_ | _待填_ | _待填_ |
| Step 6 packages/shared | _待填_ | _待填_ | _待填_ | _待填_ |
| Step 7 CI workflows | _待填_ | _待填_ | _待填_ | _待填_ |
| Step 8 文档同步 | _待填_ | _待填_ | _待填_ | 软冻结声明删除：_待填_ |
| GitHub repo 改名 | _待填_ | _用户_ | _截图_ | _待填_ |
| PR 合并 develop | _待填_ | _待填_ | _PR #_ | _待填_ |

---

## 🔗 关联

- 母 plan：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md)
- vision 母文档：[`platform-refactor-vision.md`](./platform-refactor-vision.md)
- CI 计划：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md)
- 上游 Phase 0.0：[`phase-0-0-minimal-ci-gating.md`](./phase-0-0-minimal-ci-gating.md)
- 上游 Phase 0.5：[`phase-0-5-pre-migration-upgrades.md`](./phase-0-5-pre-migration-upgrades.md)
- git rename 学习笔记：[`docs/learning/git-rename-history.md`](../../learning/git-rename-history.md)
- spec 演进台账：[`docs/audits/spec-debt.md`](../../audits/spec-debt.md)

---

## 📝 变更日志

- 2026-05-14：初稿派生（Claude Code）；§决策待审 §A-§H 待用户确认；§0 准备工作含 Dependabot 暂停 + 软冻结声明
- 2026-05-14：§决策待审 §A-§H 全部用户确认；
  - §A 维持一份 plan；§B 最小占位；§C 允许中断 + 不 rebase；§D `pnpm@9.15.0`；
  - §E `engines.node: "24.x"` + `.nvmrc=24`；§F `packageManager` + corepack；
  - §G Phase 1 末改名；§H 先 Project Name → 同步 CORS/Auth（"先加新保旧"）→ 再 Root Directory。
  - Step 1 / Step 5 / Step 8 / §5.4 Vercel checklist 同步更新；状态从"待用户审定" → "待执行"
