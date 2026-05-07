# 发布流程

> 本文档承接 `AGENTS.md` 中"部署与上线"节的核心禁令，记录从开发分支到生产的完整发布路径与回滚步骤。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## ⚠️ 实施状态

**本文档同时记录当前态与目标态；CI 门控与分支对齐方案尚未落地**。

| 项 | 当前现状 | 目标态 |
|---|---|---|
| Vercel production 跟踪分支 | `main` ✓ | `main` |
| Railway production env 跟踪分支 | `develop`（与 main 不对称） | `main` |
| Railway staging env | **不存在** | 跟 `develop`（待新建） |
| Railway "Wait for CI" toggle | **关闭** | 双 env 都开 |
| Vercel main 自动部署 | 启用（不等 CI） | 关闭，由 GitHub Actions 触发 |
| `.github/workflows/deploy.yml` | **不存在** | 新增，CI 全绿后 curl Vercel deploy hook |
| GitHub Secret `VERCEL_DEPLOY_HOOK_MAIN` | **未配置** | 配置为 main Deploy Hook URL |

落地步骤见 `docs/superpowers/plans/ci-deploy-gating-and-branch-alignment.md`。标 `[目标态]` 的内容在落地前不要按字面执行；未标目标态的当前态检查清单和回滚规则可按当前现实执行。

## 部署架构概览（目标态）

| 环境 | 前端 | 后端 | 触发分支 |
|---|---|---|---|
| Vercel preview | `client-git-<branch>-<scope>.vercel.app`（含 develop alias） | 共享 Railway 后端 | 任何 push 到非生产分支 |
| Vercel production | `client-<scope>.vercel.app` 或自定义域名 | Railway production env | `main` |
| Railway staging | — | `kinetic-arcade-server-staging` `[目标态]` | `develop` |
| Railway production | — | `kinetic-arcade-server-production`（实施后跟 `main`） | `main` |

## 标准发布路径 `[目标态]`

> 以下流程描述目标态。CI 门控落地前，第 6 步"Railway staging env 在 CI 通过后部署"实际为"Railway production env 立即部署（不等 CI）"；第 5 步 develop→main 部分实际为"Vercel production 立即部署（不等 CI），Railway 不部署"。

### 1. 功能/修复分支 → develop

1. 从 develop 切短生命周期分支（`codex/<type>-<task>` 或 `claude/<type>-<task>`）
2. 实现 + 本地自检（见 `docs/development-workflow.md` §2）
3. 推送 + 开 PR 到 `develop`
4. PR 触发 GitHub CI（lint / test-client / test-server / build / audit）
5. CI 全绿后由 `.github/workflows/develop-pr-auto-merge.yml` 自动 squash 合并并删除分支
6. develop 接收新 commit → Vercel 出 develop preview alias，Railway staging env 在 CI 通过后部署
7. 在 staging（preview alias + Railway staging URL）验证关键流程

### 2. develop → main（生产发布）

1. 在 staging 完成发布候选所有功能验证
2. 从 develop 开 PR `release: <date or scope>` → `main`
3. PR 必须通过 main ruleset 全部 required checks（Lint / Test Client / Test Server / Build Client / Security Audit）
4. **不挂 auto-merge**；由人手动合并
5. 合并触发 Vercel production 部署（CI 门控后）+ Railway production 部署（CI 门控后）
6. 部署完成后立即在 production 域名验证关键流程
7. 通过 `vercel ls` 取最新 production URL 发用户

### 3. release/* 分支（暂未启用）

当前简化流程：feature → develop → main。
当上线风险或发布窗口变复杂时再启用 release/*：

- 从稳定 develop 切 `release/<version>`
- release 分支只接发布阻塞修复，不加新功能
- release 验证通过 → 合 main
- release 上的修复必须同步回 develop

## 部署时序 `[目标态]`

> 当前未实施。落地后此节生效。

```
push to develop
  ├─ Vercel: 立即出 develop preview（不门控）
  └─ Railway staging: 等 CI 全绿才部署（native Wait for CI）

push to main
  ├─ Vercel: production 部署被 GitHub Actions deploy.yml 在 CI 全绿后触发
  └─ Railway production: 等 CI 全绿才部署（native Wait for CI）
```

### 当前实际部署时序

```
push to develop
  ├─ Vercel: 立即出 develop preview（不门控）
  └─ Railway production env: 立即部署（Wait for CI 关闭，与 CI 并行）

push to main
  ├─ Vercel production: 立即部署（不等 CI）
  └─ Railway: 不部署（main 未挂 Railway env）
```

差距 → 需按 plan 落地。

## 当前态上线检查清单

合并到 main 前必须按当前部署现实确认：

- [ ] 所有相关 GitHub CI checks 绿色
- [ ] Vercel develop preview 完成关键流程验证（登录、注册、游戏开始-结算、排行榜、支付测试流程如启用）
- [ ] Railway 当前仍由 production env 跟踪 `develop`；本次变更已说明该不对称部署风险
- [ ] 涉及环境变量改动：Vercel/Railway 当前实际环境已列清楚；生产变量改动已获得用户确认
- [ ] 涉及数据库迁移：已先在本地 Supabase 验证；任何远程 `db push` / production 数据库操作已单独获得用户确认
- [ ] 涉及支付：sandbox 验证完成，prod 切换风险已说明
- [ ] 涉及认证/session/CSRF：本地行为已验证；preview/production 行为差异已说明
- [ ] 不把当前共享 Supabase 或 Railway production env 冒充为独立 staging
- [ ] PR 描述包含变更范围、测试结果、回滚方式
- [ ] 用户已确认（中/高风险变更）

## 目标态上线检查清单 `[目标态]`

独立 Railway staging env、独立 staging Supabase 和 CI 门控落地后，合并到 main 前必须确认：

- [ ] 所有相关 GitHub CI checks 绿色
- [ ] develop preview / Railway staging 完成关键流程验证（登录、注册、游戏开始-结算、排行榜、支付测试流程如启用）
- [ ] 涉及环境变量改动：staging + production 双环境已同步
- [ ] 涉及数据库迁移：迁移脚本已在 staging Supabase 验证；回滚脚本就位
- [ ] 涉及支付：sandbox 验证完成，prod 切换风险已说明
- [ ] 涉及认证/session/CSRF：本地 + staging 双环境行为一致
- [ ] PR 描述包含变更范围、测试结果、回滚方式
- [ ] 用户已确认（中/高风险变更）

## 回滚步骤

### Vercel 前端回滚

```bash
vercel ls                                    # 找上一个 ready production deployment
vercel rollback <deployment-url>             # 即时回滚
```

或从 Vercel dashboard → Deployments → 选旧 deployment → Promote to Production。

### Railway 后端回滚

Railway dashboard → 对应 environment → Deployments → 选旧 commit → Redeploy。

> 数据库迁移已应用的情况下，单独回滚后端代码可能与 schema 不兼容；必要时同步回滚迁移（见下条）。

### 数据库迁移回滚

1. 先确认目标环境（staging vs production）
2. 确认备份状态：daily backup 是否可用、PITR 是否启用、最早/最新可恢复点是否覆盖本次变更
3. 破坏性迁移前导出一份手动逻辑快照（`supabase db dump` / `pg_dump`），文件只放本地或安全备份位置，不提交仓库
4. 编写 down 迁移或反向迁移
5. 当前态：先在本地 Supabase 验证 down 迁移；任何远程数据库回滚必须再次获得用户确认
6. 目标态 `[目标态]`：先在 staging Supabase 验证 down 迁移，再应用到 production
7. 同步回滚后端代码
8. 验证关键流程

未编写 down 迁移的迁移视为不可逆；上线前必须先补 down 或拒绝合并。

### Supabase 备份 / 快照机制

- Daily backups：Supabase Dashboard → Database → Backups 可查看并恢复；不同付费方案保留天数不同。恢复会造成项目不可用一段时间，恢复点越早潜在数据丢失越多。
- PITR：付费 add-on，可按秒级粒度恢复到保留窗口内的指定时间点；启用后不再同时生成 daily backups。恢复同样会造成停机，执行前必须记录目标恢复时间、预计影响和负责人确认。
- 手动逻辑快照：上线前可用 Supabase CLI `db dump` 或 `pg_dump` 导出。快照文件包含敏感数据时按密钥级别保护，不上传、不提交、不贴到 issue / PR / 文档。
- Storage 对象：数据库备份只覆盖 Storage metadata，不恢复实际对象文件；涉及 Storage 删除或迁移时必须单独设计对象备份/恢复方案。

参考：Supabase 官方 Database Backups / PITR 文档（`https://supabase.com/docs/guides/platform/backups`）。

### 支付配置回滚

支付服务商配置回滚需在对应平台 dashboard 操作 + Railway env 变量回退；任何支付配置变更必须保留前一份配置快照供回滚使用。

## 发布汇报模板

> 本模板在 `docs/development-workflow.md` §8 通用汇报基础上扩展，仅用于合并到 `main` 的生产发布。普通任务不用此模板。

每次合并到 main 后必须按以下格式汇报：

```text
发布分支：
合并 PR：
本次包含的改动：
GitHub CI 结果：
staging 验证结果：
production 验证结果：
环境变量/数据库/支付变更：
Vercel production URL：
Railway production deployment：
剩余风险或观察项：
回滚方式：
```

## 异常处理

| 情况 | 处理 |
|---|---|
| CI 卡住超 30 分钟 | 取消 workflow，重试；若多次卡住先排查再合并 |
| 部署成功但 production 验证失败 | 立即按上文回滚 Vercel/Railway；用户告知；开 hotfix 分支 |
| 数据库迁移在 production 失败 | 不强行重试；按迁移日志找根因；必要时回滚到 pre-migration snapshot |
| 支付沙箱通过但 production 失败 | 立即关闭支付入口（feature flag 或路由禁用）；联系支付服务商；不重试相同 webhook |
| Vercel Deploy Hook 触发失败 | `gh workflow run deploy.yml` 重新触发；或 dashboard 手动 redeploy |

### 回滚 vs forward-fix 决策标准

| 场景 | 默认动作 | 原因 |
|---|---|---|
| 登录/注册/session/cookie/CSRF 大面积失败 | 立即回滚 | 阻断核心访问，且安全边界可能受影响 |
| 支付重复扣款、错误扣款、webhook 状态错乱 | 立即关闭入口并回滚相关变更 | 直接影响资金与用户权益 |
| 数据库迁移造成数据丢失、写入失败或 RLS 越权 | 停止写入并回滚/恢复备份 | 影响用户数据完整性或隐私 |
| production 白屏、游戏无法开始、排行榜写入失败 | 立即回滚前后端到上一可用版本 | 核心用户路径不可用 |
| 小范围 UI 文案、样式瑕疵、非核心页面轻微问题 | forward-fix | 回滚成本高于小修风险 |
| 仅 monitoring/logging/非用户路径告警 | 评估后 forward-fix | 不直接影响用户流程，可保留现场排查 |
| 回滚会扩大数据不兼容或破坏新写入数据 | 暂停入口，制定修复脚本后 forward-fix | 回滚本身风险高于定向修复 |
