# Railway → Zeabur 后端平台迁移（紧急 infra plan）

> 创建：2026-05-18
> 状态：**待执行** — 等用户确认是否走紧急例外开工
> 母 plan：无（独立 infra 紧急 plan，非平台化重构子 plan）
> 主分支：`develop`
> 预计工时：1-2 天落地 + 1-2 周观察
> 模型主力：用户 ~60%（Zeabur / Vercel UI、env 录入、域名 DNS、付款）/ Claude Code ~40%（vercel.json 改动 + 文档 + PR）
>
> **AGENTS.md 准入风险等级：高**
>
> 理由：
> - 部署平台切换（影响 cookie / CSRF / Supabase 调用延迟）
> - 生产环境变量从 Railway 搬到 Zeabur（敏感值 handling）
> - 修改 `client/vercel.json` 触发 Vercel 生产部署
> - 影响用户登录态（session 内存存储 + 平台切换时全体踢出登录）
>
> 必须按 AGENTS.md「功能与变更准入标准」高风险流程：方案 + 用户确认 + 测试 / 回滚 / 安全影响说明全部到位后才执行。
>
> **前置依赖**：
> - 用户对"走紧急例外暂停 Phase 1"决策确认 ✅（2026-05-18 用户口头确认）
> - Zeabur 账号已注册 ✅（用户 2026-05-18 完成）
> - Zeabur 充值方式：微信 / 支付宝 ✅
> - Phase 1 已暂停（见 [`phase-1-monorepo-migration.md`](./phase-1-monorepo-migration.md) §前置阻塞）
> - AGENTS.md 软冻结"已知例外"已登记本 plan

---

## 背景

**触发原因**：Railway Trial $5 credit 即将耗尽，用户无国际信用卡，无法升级 Hobby 订阅，后端服务面临断服风险。

**为什么 Zeabur**：
- 华人团队，支持**支付宝 / 微信**付款（解决无信用卡问题）
- Developer Plan $5/月含 $5 免费额度，与 Railway Hobby 等价
- 部署体验最接近 Railway（git push → 自动构建 → 上线）
- Node.js / Koa 直接跑，无需改架构（不是 serverless）
- 海外节点可选，无需 ICP 备案，跟 Railway 一样

**为什么不是其他选项**：
- 腾讯云 CloudBase：强制 serverless 架构，要重写 Koa
- 阿里云轻量 VPS：自运维 + 国内节点要备案
- ClawCloud Run：2026-05-11 停服
- Render Free：要先做 session 持久化改造（变量更多）

**为什么现在做、而不是 Phase 1 后**：
- 现在做：只改 `vercel.json` rewrite URL + root dir = `server/`（现状）
- Phase 1 后做：rewrite URL + root dir = `apps/api/`（与 Phase 1 改造重叠，撞车风险大）
- 业务连续性 > 工程化改造

## 🎯 本次只做什么

把后端运行环境从 Railway 切到 Zeabur，**保持现有分支跟踪关系**（Zeabur 跟 `develop`，等同 Railway 现状）。

## ❌ 明确不做什么

- ❌ 不改任何业务代码（仅改 `client/vercel.json` rewrite + 文档）
- ❌ 不做 session 持久化改造（独立 plan，迁完之后做）
- ❌ 不做 rate limiter 迁 Redis（同上）
- ❌ 不做 develop/main 分支对齐（独立 plan：[`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md)，迁完之后做）
- ❌ 不动 Supabase 任何配置
- ❌ 不动 GitHub Actions / branch ruleset
- ❌ 不立刻删 Railway service（保留 1-2 周作为热备）
- ❌ 不在 Zeabur 上同时开 staging env（保持单 env，跟当前 Railway 一致；staging 留 ci-deploy-gating plan）

---

## 关键风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 节点位置选错导致 Supabase 延迟暴涨 | 用户感觉变慢 | A1 步骤强制选最靠近 Supabase 区域的节点 |
| 切流后 cookie/CSRF 配置不对 | 全体登录失败 | Phase C 用 Vercel preview 完整 E2E 后才切 prod |
| Zeabur redeploy 清空 session | 全体用户被踢出 | 已知风险，记录到 plan 未覆盖风险；后续独立 plan 解决 |
| Railway 急停导致没有回滚目标 | 出问题无法立即恢复 | Phase E5 明确"1-2 周观察期内不停 Railway" |
| 软冻结违规改 `vercel.json` 撞 Phase 1 迁移分支 | 迁移分支需三方 merge | Phase 1 已暂停，迁移分支不动；恢复时统一处理 |
| 敏感 env 值在 chat/log/PR 中泄漏 | 密钥泄漏 | B4 步骤强制在 Zeabur secret 面板手动输入，不输出值 |

---

## Phase A：迁移前准备（零风险，可立即做）

- [ ] **A1** Zeabur 节点选择：查 Supabase 项目所在区域（看 pooler URL），Zeabur 选同区域节点
- [ ] **A2** 整理环境变量清单：对照 `docs/environment.md` 列出必须项（**只列名，不回显值**）
- [ ] **A3** 确认 `server/package.json#engines.node` 与 `.nvmrc`；若 `.nvmrc` 缺失，单独 PR 补
- [ ] **A4** 确认 `server/package.json#scripts.start` 启动命令
- [ ] **A5** 备份 Railway 当前配置截图（service settings、env vars 名称列表、最后一次 deploy log）

## Phase B：Zeabur 端搭建（无生产影响）

- [ ] **B1** Zeabur 创建 Project
- [ ] **B2** 关联 GitHub repo `wang-home`
- [ ] **B3** 创建 Service：
  - Type: Git
  - Branch: `develop`（与现有 Railway 一致）
  - Root directory: `server/`
  - Build / Start：默认 Nixpacks，必要时手动指定 `npm install` + `npm start`
- [ ] **B4** 录入环境变量（**严禁明文出现在 chat / PR / log**，在 Zeabur secret 面板手动输入）：
  - `SESSION_SECRET`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `ALLOWED_ORIGINS`（临时同时含：Vercel prod 域名 + Vercel preview 通配 + Zeabur `*.zeabur.app` URL）
  - `NODE_ENV=production`
  - 其他业务变量按 `docs/environment.md`
  - **不需要** `PORT`（Zeabur 自动注入）
  - **不需要** `SUPABASE_SERVICE_ROLE_KEY`（当前代码仅用 anon key + RLS，未调用 service role）
- [ ] **B5** 首次部署，观察 build log → service 启动 log
- [ ] **B6** 健康检查：访问 `https://<zeabur-url>/api/health`（或现有 health endpoint）确认 200
- [ ] **B7** 绑定 Zeabur 自定义子域名（如 `api-zeabur.<your-domain>`）+ HTTPS 自动签发；便于回滚切流量

## Phase C：联调验证（用 Vercel preview，不动生产）

- [ ] **C1** 本地临时改 `client/vite.config.js` dev proxy target 指向 Zeabur URL，手测：
  - POST `/api/auth/register`
  - POST `/api/auth/login` → cookie 是否带 `HttpOnly Secure SameSite=Lax`
  - GET 登录态接口 → session 持久化
  - POST `/api/game-sessions/start` → CSRF Origin 通过
  - POST 提交分数 → leaderboard 更新
  - 刷新页面登录态不丢
- [ ] **C2** E2E 跑通：`npm run test:e2e --workspace=client`
- [ ] **C3** Supabase 延迟基线对比（DevTools Network TTFB）
- [ ] **C4** Zeabur 日志面板观察异常

## Phase D：生产切换（高风险，分两步）

### D1：develop 切流（Vercel preview 走 Zeabur）

- [ ] **D1.1** 修改 `client/vercel.json` rewrite destination：Railway URL → Zeabur 自定义域名（**不用** `*.zeabur.app`）
- [ ] **D1.2** Push 到 `claude/infra-emergency-zeabur-switch` 分支 → 开 PR → 标签 `infra/emergency`
- [ ] **D1.3** PR 合 develop → Vercel preview 自动部署
- [ ] **D1.4** 完整 E2E 验证 preview
- [ ] **D1.5** 观察 24 小时无报错

### D2：main 切流（真正生产切换）

- [ ] **D2.1** develop → main PR
- [ ] **D2.2** Vercel production deploy 完成
- [ ] **D2.3** 立即手测生产域名（登录 / 提交分数 / 排行榜）
- [ ] **D2.4** Railway service **不停**，保留作为热备
- [ ] **D2.5** 移除 `ALLOWED_ORIGINS` 中临时加的 Vercel preview 通配

## Phase E：迁移后收尾（观察期 ≥ 1 周后做）

- [ ] **E1** 更新 `docs/project-context.md`：后端部署平台 Railway → Zeabur
- [ ] **E2** 更新 `docs/ARCHITECTURE.md` §1 标题与正文
- [ ] **E3** 更新 `docs/environment.md`（删 Railway-specific 引用）
- [ ] **E4** 删除 / 归档 Railway 部署相关文档片段
- [ ] **E5** Railway 上停服并删除 service（**最早 D2.3 后 14 天**）
- [ ] **E6** 更新 `AGENTS.md` "部署与上线"章节里的 Railway 引用 → Zeabur
- [ ] **E7** 移除 `AGENTS.md` Phase 1 软冻结"已知例外"中 Zeabur 条目
- [ ] **E8** 更新 [`phase-1-monorepo-migration.md`](./phase-1-monorepo-migration.md) §前置阻塞 → 解除阻塞
- [ ] **E9** 更新 [`ci-deploy-gating-and-branch-alignment.md`](./ci-deploy-gating-and-branch-alignment.md)：Railway dashboard 步骤 → Zeabur dashboard

---

## 🔙 回滚预案

| 阶段 | 触发条件 | 回滚动作 | 耗时 |
|---|---|---|---|
| Phase A-C | 任何异常 | 不做任何 prod 变更（生产未切） | 0 |
| Phase D1 后 | preview 异常 | revert `vercel.json` commit → push | 3-5 分钟 |
| Phase D2 后 | 生产异常 | revert + 合 main → Vercel 自动重部 | 5-10 分钟 |
| Phase E5 后 | Railway 已删 | 重建 Railway service（极慢） | 1-2 小时 |

**铁律**：E5（删 Railway）必须放在最后，至少 D2.3 后 14 天。

---

## ⚠️ 未覆盖风险（已知，本 plan 不解决）

1. **Session 内存存储**（`koa-session` MemoryStore + `ARCHITECTURE.md` §2、§7）：Zeabur redeploy/restart/scale 会清空 → 全体用户被踢出登录。后续独立 plan 解决（迁 session 到 Supabase / Redis）。
2. **Rate limiter 内存存储**（`ARCHITECTURE.md` §7）：同上，重启清零；单实例下不致命。
3. **DNS 切换缓存**：若 Railway 配过自定义域名，DNS TTL 期内可能解析到旧后端。建议 Phase A 前先把 Railway 自定义域名 TTL 降到 60s。
4. **Phase 1 monorepo 迁移撞车**：Phase 1 恢复时，root directory 从 `server/` 改成 `apps/api/`，需在 Zeabur dashboard 同步改。已在 phase-1 plan §前置阻塞 "恢复时必须重审" 列出。

---

## 📦 PR 拆分

| PR | 分支 | 内容 | 标签 |
|---|---|---|---|
| 1（本 PR） | `claude/docs-zeabur-migration-prep` | 本 plan + phase-1 plan 暂停块 + AGENTS.md 例外条目 | `docs` + `infra` |
| 2 | `claude/infra-emergency-zeabur-switch` | 只改 `client/vercel.json` rewrite | `infra/emergency` |
| 3 | `claude/docs-zeabur-migration-cleanup` | Phase E 文档清理（迁移稳定后） | `docs` |

---

## 📋 执行记录

> 按 `AGENTS.md` 战术子 plan 执行记录强制：每个 step 完成立即填表，不批量回填、不省略执行人。

| Step | 时间 | 执行人 | 说明 / 链接 |
|---|---|---|---|
| A1 节点选择 | | | |
| A2 env 清单 | | | |
| A3 Node 版本确认 | | | |
| A4 启动命令确认 | | | |
| A5 Railway 配置备份 | | | |
| B1 Zeabur Project 创建 | | | |
| B2 关联 GitHub | | | |
| B3 Service 创建 | | | |
| B4 env 录入 | | | |
| B5 首次部署 | | | |
| B6 健康检查 | | | |
| B7 自定义域名绑定 | | | |
| C1 本地 proxy 验证 | | | |
| C2 E2E | | | |
| C3 Supabase 延迟基线 | | | |
| C4 日志面板检查 | | | |
| D1.1 vercel.json 改动 | | | |
| D1.2 PR 创建 | | | |
| D1.3 合 develop | | | |
| D1.4 preview E2E | | | |
| D1.5 24h 观察 | | | |
| D2.1 develop → main PR | | | |
| D2.2 Vercel prod deploy | | | |
| D2.3 prod 手测 | | | |
| D2.4 Railway 保留状态 | | | |
| D2.5 ALLOWED_ORIGINS 清理 | | | |
| E1-E9 文档收尾 | | | |

---

## 📝 决策日志

| 日期 | 决策 | 决策人 | 理由 |
|---|---|---|---|
| 2026-05-18 | 选 Zeabur Developer Plan 而非 Free Plan | 用户 | Free 自动休眠 + 0 自定义域名 + 仅 free region，不满足生产后端要求 |
| 2026-05-18 | 平台切换与分支对齐拆开做（本 plan 不做对齐） | 用户 | 一次只动一个变量；对齐留 ci-deploy-gating plan |
| 2026-05-18 | 走 AGENTS.md 软冻结"紧急例外"，Phase 1 暂停 | 用户 | 业务连续性 > 工程化改造 |
| 2026-05-18 | 保持 Zeabur 跟 develop（不切到 main） | Claude 建议、待用户确认 | 与 Railway 现状一致，减少切换变量 |
