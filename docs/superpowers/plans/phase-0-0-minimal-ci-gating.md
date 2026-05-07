# Phase 0.0：最小 CI 门控（战术子 plan）

> 状态：**已执行（Step 1-4.1 完成；Step 5 验证 2 留后续观察；Step 6 完成报告已写）**
> 完成时间：2026-05-07
> 母 plan：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md) §3
> 来源：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md) §Phase 1 + §Phase 2 节选
> 分支：`release/sync-main-with-develop`（开 sync PR 用）；Railway toggle 不走 git
> 基分支：`main`（sync PR 的 base）
> 预计工时：**半天**（含等 CI 跑完）
> 模型主力：**用户 100%**（手动合并 + Railway UI 操作）；Codex 协助开 PR + 监控 CI
> Claude Code 角色：方案审查；本子 plan 已含审查结论
>
> **AGENTS.md 准入风险等级：高**（涉及 main 分支 + Railway production env）
> 必须先方案 + 用户确认 + 测试 / 回滚 / 安全影响说明（本 plan 已含）

---

## 🎯 本次只做什么

1. 把 `develop` HEAD 同步合并到 `main`，让两分支指向同一 commit
2. Railway production env 翻 **Wait for CI** toggle 为 ON

完成后效果：合并到 `develop` 或 `main` 的 PR，必须等 GitHub CI 全绿后 Railway 才会重新部署。

## ❌ 明确不做什么

- ❌ 不动 Vercel（自动部署 / Deploy Hook 不改）
- ❌ 不在 Railway 新建 staging environment
- ❌ 不写 `.github/workflows/deploy.yml`
- ❌ 不改 GitHub branch ruleset
- ❌ 不改 Railway production env 的跟踪分支（仍跟 `develop`，等 Phase 1.6 切到 `main`）
- ❌ 不更新 `AGENTS.md` 部署架构章节（等 Phase 1.6 一次性同步）
- ❌ 不动业务代码、依赖版本、目录结构

理由：上述全部放 Phase 1.6 在新 playlab/apps 结构上一次配完，避免 Phase 1 改名 / 改 root directory 时重做。

## 📁 预计修改文件 / 模块

**git 内**：

- 无文件改动（sync PR 是分支合并，无 diff 内容）

**git 外**（用户在 UI 操作）：

- Railway Dashboard → 项目 → production env → Settings → Wait for CI toggle

## 🧪 新增或调整的测试

- 无单元测试 / 集成测试改动
- 无 TDD 步骤（非业务功能）

## 👀 实际页面验证

### 验证 1：sync 后 main 正常部署

`develop` → `main` 合并完成后：

- Vercel main production deploy 触发（仍跟 main，自动部署未关）
- 访问生产域名（用户已知地址），首页 / 登录 / 蛇游戏 / 排行榜各点一遍
- 期望：所有功能正常，无回归

### 验证 2：Railway Wait for CI 生效

故意构造一次 CI 失败：

1. 在 develop 开一个 PR，加一行 `it.fail('phase-0-0 wait-for-ci verification')` 到 `client/tests/` 任一测试文件
2. push 触发 CI
3. ruleset 仍要求 CI 通过才能合并 PR — 所以 PR 不能合
4. **改测试方案**：直接 push 一个 commit 到 develop 分支（如 ruleset 不强制 develop CI passing 才能 push，则可绕过 PR）
5. 观察：Railway production env **不应触发部署**
6. 立即 revert 失败 commit，让 develop 回到 green

> 备选：如 ruleset 阻止直接 push，可临时让一个 PR 的 CI 在合并阶段 fail（如把 require status check 临时降级），但风险高，**不推荐**。

> **简化版**（推荐）：Wait for CI toggle 翻 ON 后，下一次 develop 正常 PR 合并时观察"CI 全绿 → Railway 才部署"的时序即可，不刻意构造失败。失败场景留 Phase 1.6 deploy.yml 上线时一并验证。

## ✅ 验收标准

| 项 | 期望 | 验证方式 |
|---|---|---|
| main = develop | `git log main..develop --oneline` 输出空 | 终端 |
| sync PR 已合并 main | GitHub PR `release: sync main with develop` 状态 merged | GitHub PR UI |
| main Vercel deploy 正常 | production 域名手测金链路全 OK | 浏览器 |
| Railway Wait for CI = ON | Railway Dashboard 显示 toggle 为 enabled | Railway UI |
| 下一次 develop PR 合并：CI 通过后 Railway 才部署 | Railway deploy 时间晚于 GitHub Actions checks 完成时间 | Railway deploy log + GitHub Actions log 时间戳对比 |

## 🔄 回滚方式

| 出错点 | 回滚 |
|---|---|
| sync PR 合并后 main 上有问题 | 在 main 上 revert 该 merge commit；通过 PR 走标准 ruleset |
| sync PR 撞 ruleset 必检项失败 | 不强行 merge；先修 develop 让 CI 全绿，再重开 sync PR |
| Railway Wait for CI 翻 ON 后部署卡住 | Railway UI 翻回 OFF；调查 GitHub Actions 是否有 unrelated 卡住的 workflow |
| Railway 误关其他 env 配置 | 改前导出 production env 变量列表存档；改坏后从备份恢复 |

## ❓ 未决问题

1. **main 是否落后 develop**：执行前需 `git log main..develop --oneline` 确认 diff 大小。若空则跳过 sync PR，只做 Railway toggle。
2. **GitHub 当前 main ruleset 必检项**：根据 `ci-deploy-gating-and-branch-alignment.md` 是 5 项（Lint / Test Client / Test Server / Build Client / Security Audit）。sync PR 必须全部通过。如有挂掉的 workflow 先修。
3. **Vercel main 自动部署在 sync 后会触发**：是预期行为，但需确认当前 main HEAD 部署后无回归（参考验证 1）。
4. **Railway 计费**：Trial 计划当前余额 ~$3.46（按原 CI 计划 §计费）。Phase 0.0 只动 toggle 不加 service，零额外消耗。

## 🚦 执行顺序（严格）

```
Step 1：检查 git log main..develop --oneline
  ├── 输出空 → 跳到 Step 4
  └── 有 diff → Step 2

Step 2：开 sync PR
  ├── 分支：release/sync-main-with-develop（从 main 切，merge develop 进来）
  └── PR title：release: sync main with develop
  └── PR body：列举 develop 领先的 commit，说明无业务变更，仅同步基线

Step 3：等 CI 全绿 → 用户手动合 PR → 验证 1（main production 手测）

Step 4：用户登 Railway Dashboard
  ├── 项目 → production env → Settings
  ├── 找 Wait for CI toggle → 翻 ON
  └── 截图存档

Step 5：下一次 develop 合并时观察 Railway deploy 时序（验证 2 简化版）

Step 6：完成报告
  └── 按母 plan §3.4 完成标准逐项核对
```

## 📊 执行记录（每个完成点必填）

> **规则**：每个步骤完成后立即在此表追加一行；不批量回填、不省略执行人。执行人写明：用户 / Codex / Claude Code / 自动（CI / Vercel / Railway）。

| 时间（UTC） | 步骤 | 完成内容 | 执行人 | 链接 / 备注 |
|---|---|---|---|---|
| 2026-05-07 08:30 | Step 1 | 检查 `git log main..develop --oneline` — 21 commits ahead | Claude Code | 输出非空，需走 Step 2 |
| 2026-05-07 08:35 | Step 2 | 从 main 切 `release/sync-main-with-develop`，merge develop（含 AGENTS.md / CLAUDE.md 冲突，取 develop 版本），开 sync PR | Claude Code | [PR #81](https://github.com/pwangming/wang-home/pull/81) |
| 2026-05-07 09:05:35 | Step 2.1 | sync PR CI 8/8 全绿（Lint / Test Client / Test Server / Build Client / Security Audit / CodeQL / Analyze / Vercel） | 自动 | — |
| 2026-05-07 09:05:52 | Step 3 | 用户手动合 sync PR；merge commit `2fd431b` | 用户（pwangming） | PR #81 MERGED |
| 2026-05-07 ~09:10 | Step 3.1 | 验证 1：main production Vercel deploy ready（14s 构建） | 自动 + 用户 | https://client-gy09ckbs8-wangwang4467-1105s-projects.vercel.app |
| 2026-05-07 ~09:15 | Step 3.2 | 验证 1：金链路手测（首页 / 登录 / 蛇游戏 / 排行榜 / 皮肤 / profile） | 用户 | 全 OK |
| 2026-05-07 ~09:16 | Step 4 | Railway production env Wait for CI toggle 翻 ON | 用户 | 截图见 Step 4.1 |
| 2026-05-07 ~09:16 | Step 4.1 | 截图存档 Railway toggle ON 状态（含 GitHub permissions 警告） | 用户 | 本地存档 `Snipaste_2026-05-07_17-16-44.png`；⚠ Railway 警告 "Make sure you have accepted our updated GitHub permissions required for this feature" — 待用户确认是否已点权限授权 |
| 后续观察 | Step 5 | 验证 2：观察下一次 develop 合并的 CI → Railway deploy 时序 | 后续 | Phase 0.5 第一个 PR 合并时回填本行 |
| 2026-05-07 09:30 | Step 6 | 完成报告填写 + plan §执行记录 一次性更新 | Claude Code | 见下方 §完成报告 |

## 📋 完成报告（已填）

```text
本次完成：
- main = develop 同步：✅ 已完成
  - sync PR：https://github.com/pwangming/wang-home/pull/81
  - merge commit：2fd431b
  - 合并人：pwangming（用户手动）
  - 合并时间：2026-05-07 09:05:52Z
  - 冲突解决：AGENTS.md / CLAUDE.md 取 develop 版本（develop 是 governance bundle 的 canonical 源）
- Railway Wait for CI toggle：✅ ON
  - 平台：Railway production env
  - 截图存档：Snipaste_2026-05-07_17-16-44.png
  - ⚠ 待用户确认：Railway UI 警告 "Make sure you have accepted our updated GitHub permissions"
    若 GitHub permissions 未授权，toggle 看似 ON 但实际不生效；下次 develop PR 合并时观察 Railway deploy 时序即可验证
- 验证 1（main production 手测）：✅ 全绿
  - production 域名：https://client-gy09ckbs8-wangwang4467-1105s-projects.vercel.app
  - 测试金链路：首页 / 登录 / 蛇游戏 / 排行榜 / 皮肤切换 / profile，全 OK
- 验证 2（下一次 develop 部署时序）：⏳ 留 Phase 0.5 第一个 PR 合并时观察 + 回填 §执行记录 Step 5

未做（推到后续 Phase）：
- Vercel main 自动部署关闭 → Phase 1.6
- Vercel main Deploy Hook 创建 → Phase 1.6
- Railway staging env 新建 + 跟 develop → Phase 1.6
- Railway production env 切换跟踪分支为 main → Phase 1.6
- .github/workflows/deploy.yml → Phase 1.6
- AGENTS.md 部署架构章节同步（"现状 vs 目标" 双段落改成单段"现行架构"） → Phase 1.6

剩余风险：
- Railway GitHub permissions 是否真授权：用户截图含警告，待 Step 5 实际观察才能确认
- Wait for CI ON 后若有遗漏的 workflow 卡住，可能阻塞所有部署 → Phase 0.5 前两次合并需重点监控
- 软冻结期未启动（Phase 1 才启动），develop 在 Phase 0.0 → 0.5 → 1 之间可正常合 PR

下一步：
- 派生 Phase 0.5 战术子 plan（迁移前 minor 升级一批），同样按"Codex 执行计划模板"格式 + §执行记录 表
- Phase 0.5 第一个 PR 合并时观察 Railway deploy 时序，回填本 plan §执行记录 Step 5
```

## 🔗 关联

- 母 plan：[`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md) §3
- CI 计划原文：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md)
- 部署现状描述：`AGENTS.md` "部署与上线（核心禁令）"

## 📝 变更日志

- 2026-05-07：初稿，按 ai-collaboration.md "Codex 执行计划模板" 派生于母 plan §3
- 2026-05-07：加 §执行记录 章节，强制每个完成点记录时间 / 执行人 / 链接
- 2026-05-07：执行完成 — Steps 1-4.1 落地，Step 5 留后续观察，Step 6 完成报告写入；plan 状态由"待执行"改为"已执行"
