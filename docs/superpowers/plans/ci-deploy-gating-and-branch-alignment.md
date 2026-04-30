# CI 门控部署 + 分支对齐方案

> 创建：2026-04-29
> 状态：待用户确认
> 影响范围：GitHub Actions、Vercel、Railway、AGENTS.md、`docs/*`

## 背景与问题

当前 PR 合并到 `develop` 或 `main` 后，Vercel/Railway 部署不等 GitHub Actions CI 完成。CI 卡住或挂掉时，可能出现"部署成功但 CI 没过"的状态。

排查过程发现的额外结构问题：

- Vercel production 跟 `main`，Railway production 跟 `develop` —— 前后端跟不同分支，不对称
- Railway 服务名带 `production` 后缀，但实际跟 develop，与 `AGENTS.md` 中"main = 生产"描述不符
- Railway "Wait for CI" toggle 当前为 OFF
- GitHub branch ruleset 已配 required status checks（develop 4 项、main 5 项），保证 PR 合并前 CI 必过；问题出在合并后阶段

## 目标

1. **前后端分支对齐**：`develop` → 双方 staging，`main` → 双方 production
2. **CI 门控**：合并到 `develop` / `main` 后，Vercel + Railway 都等 GitHub CI 全绿才触发部署
3. **PR preview 不门控**：push 到 PR 分支即出 Vercel preview，便于 UI 验证（不影响合并安全，ruleset 已拦着）

## 已确认的决策

| 项 | 决策 |
|---|---|
| 分支对齐 | 双方都开两环境：`main` = production，`develop` = staging/preview |
| PR preview | 保持现状，不门控 |
| Vercel 实现 | 断开 Git 生产自动部署 + GitHub Actions 在 CI 成功后调 Vercel Deploy Hook |
| Railway 实现 | 开 Railway native "Wait for CI" toggle（双 env 都开） + 新增 staging environment |

## 计费

Railway 当前 **Trial** 计划（一次性 $5 credit，不是月度）。已用 $1.55 / 21 天，剩 $3.46。

- 月化：单 env ~$2.20，双 env ~$4.40
- Trial 用完需升 **Hobby**（$5/月订阅含 $5 credit）
- Hobby 之后双 env 在 credit 内吃完，不超额，实际成本 = 订阅本身

## 执行顺序

```
1. 同步 main = develop（PR 手动合 main）
2. Railway dashboard：
   - 新建 staging env，跟 develop，开 Wait for CI，复制变量
   - 改 production env：跟 main，开 Wait for CI
3. Vercel dashboard：
   - 关 main 自动部署
   - 创建 main 的 Deploy Hook
4. GitHub repo：加 secret VERCEL_DEPLOY_HOOK_MAIN
5. 新分支提 PR：加 .github/workflows/deploy.yml
6. 测试 PR 验证（develop 流 + main 流 + CI 失败场景）
7. 更新文档（AGENTS.md / release-process.md / development-workflow.md / environment.md / security-boundaries.md）
```

## 详细步骤

### Phase 1：分支同步（前置）

切换 Railway production 跟踪分支前必须先确保 `main = develop`，否则 Railway 会从落后的 main HEAD 重新部署，生产后端可能回退到旧代码。

1. 检查差距：`git log main..develop --oneline`
2. 如有 diff：开 PR `release: sync main with develop` → main，走当前 main ruleset（需 Lint / Test Client / Test Server / Build Client / Security Audit 全绿）
3. 手动合并 develop → main

### Phase 2：Railway 配置（Dashboard 操作）

**先**新增 staging environment，**后**改 production 跟踪分支：

1. Railway 项目 → Settings → New Environment → 命名 `staging`
2. staging env：
   - 连同一 GitHub repo `pwangming/wang-home`，root `/server`
   - Branch 设为 `develop`
   - 开 **Wait for CI** ON
3. 复制 staging 环境变量（从当前 production env 完整复制）：
   - `DATABASE_URL`、`SUPABASE_*`、`SESSION_SECRET`、`ALLOWED_ORIGINS` 等
   - `ALLOWED_ORIGINS` 必须含 develop preview Vercel URL（`https://client-git-develop-*.vercel.app`）
   - Supabase key 暂时共享 production project；后续视需要拆独立 project
4. production env：
   - Branch 从 `develop` **改成 `main`**
   - 开 **Wait for CI** ON

> 改 production 跟踪分支瞬间会触发一次从 main HEAD 的部署。Phase 1 已保证 main = develop，部署内容等价。

### Phase 3：Vercel 配置（Dashboard 操作）

1. Vercel Project `client` → Settings → Git
2. 关闭 main 自动生产部署：
   - 优先方案：找 "Auto-deploy production branch" 类似开关 → 关闭
   - 退路：将 production branch 改为不存在的分支名（如 `__manual_deploy__`），main 推送只走 preview，不走 production
3. 创建 Deploy Hook：Settings → Git → Deploy Hooks → 新建：
   - 名：`main-production`
   - Branch：`main`
   - 复制 hook URL
4. GitHub repo Settings → Secrets and variables → Actions → 新建 `VERCEL_DEPLOY_HOOK_MAIN` = 上面 URL

### Phase 4：GitHub Actions deploy workflow

新增文件 `.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

permissions:
  contents: read

jobs:
  vercel-production:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Trigger Vercel production deploy
        env:
          HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK_MAIN }}
        run: |
          if [ -z "$HOOK" ]; then
            echo "VERCEL_DEPLOY_HOOK_MAIN not set" >&2
            exit 1
          fi
          curl -fsSL -X POST "$HOOK" -o /tmp/vercel-deploy.json
          cat /tmp/vercel-deploy.json
```

要点：
- `workflow_run` 在 CI workflow 完成后触发；`conclusion == 'success'` 保证 CI 全绿
- Railway 由 native Wait for CI 处理，**不在此 workflow 中调用**
- 不写 develop 的 deploy step：develop preview 由 Vercel Git 集成自动出，不门控

### Phase 5：文档同步

| 文档 | 改动 |
|---|---|
| `AGENTS.md` | "部署与上线流程"节修订：main = 生产源（Vercel + Railway production env）；develop = 集成/staging 源（Vercel preview + Railway staging env）；部署在 CI 全绿后触发 |
| `docs/release-process.md`（填充） | 完整发布流程：开发分支 → develop（PR + auto-merge）→ Vercel preview / Railway staging 验证 → main（PR 手动合并）→ Vercel production / Railway production 部署；回滚步骤 |
| `docs/development-workflow.md` | 第 5 节"PR 流程"补充门控时序；"合并后动作"明确 staging 验证看 Railway staging URL + Vercel develop preview alias |
| `docs/environment.md`（填充） | 三栏变量表：local / staging / production；Railway staging env 复制规则；ALLOWED_ORIGINS 配法 |
| `docs/security-boundaries.md`（填充） | Vercel Deploy Hook URL 视为 secret，泄漏后可被任意触发部署，明示轮换流程 |

### Phase 6：验证

1. 同步 main = develop 后，确认 Railway production 部署内容等价于切换前
2. **develop 流测试**：
   - 测试 PR → 推送 → Vercel preview 立刻出（不门控）✓
   - CI 通过 → auto-merge 到 develop
   - Railway staging env 等 CI 通过后才部署（看 Deployments 时间戳应在 CI 完成后）
3. **main 流测试**：
   - 从 develop 起 release PR 到 main
   - 手动合并
   - 观察：CI 跑完前，Vercel production / Railway production 不应有新部署
   - CI 全绿后：deploy.yml 触发 Vercel production 部署；Railway production 由 native Wait for CI 触发
4. **CI 失败场景**：故意推一个会失败的 CI（如 lint 错误），验证 Vercel/Railway 都不部署
5. **回滚演练**：`vercel rollback <previous-deployment>` + Railway dashboard 选旧 commit redeploy

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| Phase 1 main 与 develop 差距大，sync PR 引入大批量 release 风险 | sync PR 单独走，diff 全部 review；如有支付/认证类高风险改动按 AGENTS.md 高风险流程处理 |
| Railway 切换 production 跟踪后，环境变量与 main 代码不兼容 | Phase 2 切换前对比 develop env 变量与 main 代码引用，缺哪个补哪个 |
| Vercel Deploy Hook URL 泄漏 → 任意人可触发部署 | URL 只放 GitHub Secret，不写入代码或文档明文；轮换流程文档化 |
| `workflow_run` 触发的 deploy job 失败但不阻塞 CI 状态 | deploy.yml 失败可手动重试 `gh workflow run deploy.yml`；文档说明 |
| Railway staging env 变量误配，写到 production Supabase | Phase 2 第 3 步严格 review；后续可拆独立 staging Supabase project |
| Phase 1 sync 期间 Railway 误触发非预期部署 | sync 操作前先把 production env Wait for CI 开启 |

## 不在本计划范围

- 升 Railway Trial → Hobby（视 credit 余量自行决定时机）
- 拆分 staging Supabase 为独立 project（视后续需要）
- 重命名 Vercel Project（现叫 `client`，本次不动）
- AGENTS.md 全文减重 / 其他空 doc 填充（属于章节迁移计划，独立推进）

## Critical Files

修改：
- `.github/workflows/deploy.yml`（新增）
- `AGENTS.md`（部署 / 分支节）
- `docs/release-process.md`（填充）
- `docs/development-workflow.md`（已有，PR 节补充）
- `docs/environment.md`（填充）
- `docs/security-boundaries.md`（填充）

只读参考（不改）：
- `.github/workflows/ci.yml`（CI workflow 名 "CI" 是 deploy.yml workflow_run 依据）
- `.github/workflows/develop-pr-auto-merge.yml`
- `client/vercel.json`（仅 rewrites）

## 待确认点

请确认以下条目，确认后开 `claude/feat-ci-deploy-gating` 或交 Codex 落地：

- [ ] 整体方向（双 env + Vercel Actions 触发 + Railway Wait for CI）
- [ ] Phase 1 main 同步 develop（如有 diff，是否一次性整体合）
- [ ] Railway staging env 是否共享 production Supabase（暂定共享）
- [ ] Vercel Deploy Hook 命名 `main-production` OK 吗
- [ ] GitHub Secret 命名 `VERCEL_DEPLOY_HOOK_MAIN` OK 吗
- [ ] 验证步骤里 CI 失败场景演练，是否在测试分支做（不污染 main 历史）
- [ ] 完成后是否需要 Codex 直接落地，或先由 Claude Code 出更细的 PR 拆分
