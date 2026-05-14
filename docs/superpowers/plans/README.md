# 贪吃蛇项目迭代计划索引

本目录存放分任务的详细实施计划，供 Claude Code 方案/审查 + Codex 执行时双方共享上下文。

> **2026-05-06 平台化重构 vision 上线**：项目方向已扩展为多模块平台（游戏 + AI 应用 + 后台），见 [`platform-refactor-vision.md`](./platform-refactor-vision.md)（讨论中）。该 vision 落地后会派生多个子 plan，可能影响下方迭代 3（成就）/ 迭代 4（支付）的执行节奏与边界。讨论稳定前，下方现有计划保持原状。
>
> **2026-05-07 Monorepo Phase 1 子 plan 创建**：vision 派生的第一个子 plan 已创建 → [`monorepo-phase1-migration.md`](./monorepo-phase1-migration.md)（**战略母 plan**，不直接交 Codex 执行）。包含 Phase 0.0（CI 最小门控）+ Phase 0.5（迁移前升级）+ Phase 1（pnpm + Turborepo + apps/packages + Node 24 + 改名 playlab）+ Phase 1.5（vite/vitest/pinia/koa/jest major 升级）+ Phase 1.6（CI 全套补完）五段时间线。各 Phase 派生独立战术子 plan 后逐个交接执行。**项目从此进入平台化重构期，下方既有迭代计划暂缓**。
>
> **战术子 plan 派生进度**：
>
> | Phase | 战术子 plan | 状态 |
> |---|---|---|
> | 0.0 | [`phase-0-0-minimal-ci-gating.md`](./phase-0-0-minimal-ci-gating.md) | ✅ **已执行**（Steps 1-4.1 完成 2026-05-07；Step 5 留 Phase 0.5 PR 合并时观察） |
> | 0.5 | [`phase-0-5-pre-migration-upgrades.md`](./phase-0-5-pre-migration-upgrades.md) | ✅ **已执行**（11 个升级 commit via PR #84 合并 develop 2026-05-08） |
> | 1 | [`phase-1-monorepo-migration.md`](./phase-1-monorepo-migration.md) | 🚦 **待执行**（草稿派生 2026-05-14；§决策 §A-§H 全部确认 2026-05-14；准备开 §0 准备工作 commit） |
> | 1.5 | _未派生_ | 等 Phase 1 完成 |
> | 1.6 | _未派生_ | 等 Phase 1.5 完成 |

> **2026-04-21 审查对齐修订**：按“现有代码 vs 计划”重新校准优先级与依赖，新增 2.0 事件契约迁移计划，详见底部《审查对齐修订记录（2026-04-21）》。

## 🔒 项目级约束（所有迭代前置）

1. **单实例部署约束**：当前 Railway 生产环境为单实例。Rate limiter 和所有内存状态基于此前提。scale 到 ≥2 实例前，所有 `server/src/middleware/rateLimit.js` 的 limiter 必须迁移到 Redis。迭代 4（支付）前重新确认。
2. **ProfileModal 结构治理**：2.1 完成 tab 容器改造后，3/4/2.3 只加 tab 内容，不改结构。
3. **game event payload 版本化**：从 2.0 起 `emit('eatFood', { type, score })` 用对象；`handleGameOver(finalScore, speedMult, scoreMult, gameContext)` 第 4 参保留给成就系统累计。

---

## 迭代 1：Bug 修复 + 基础功能打通

| 计划 | 文件 | 状态 | 工时 | Codex 执行占比 |
|---|---|---|---|---|
| 1.2 忘记密码安全加固 | [1.2-forgot-password-hardening.md](./1.2-forgot-password-hardening.md) | 🔥 P0 阻塞项（优先开工） | 1.5~2.5h | ~40% |
| 1.1 得分实时更新 Bug | [1.1-fix-score-realtime.md](./1.1-fix-score-realtime.md) | ✅ 方案已确认 | 30~45min | ~90% |
| 1.3 记住我打通 | [1.3-remember-me.md](./1.3-remember-me.md) | ✅ 方案已确认 | 1~1.5h | ~60% |

## 迭代 2：功能增强

| 计划 | 文件 | 状态 | 工时 | Codex 执行占比 |
|---|---|---|---|---|
| 2.0 事件契约迁移（新增） | [2.0-event-contract-migration.md](./2.0-event-contract-migration.md) | ✅ 方案已确认（解耦 2.2/3 的接口演进风险） | 1~2h | ~80% |
| 2.1 修改用户信息 | [2.1-profile-edit.md](./2.1-profile-edit.md) | ✅ 方案已确认（拆 2.1a/2.1b，含 tab 容器 + callback 回调治理） | 3~5h | ~50% |
| 2.2 食物变化 | [2.2-food-variety.md](./2.2-food-variety.md) | ✅ 方案已确认（含 gameContext 接口） | 3~4h | ~85% |
| 2.3 皮肤系统基建 | [2.3-skins.md](./2.3-skins.md) | ✅ 方案已确认（无支付依赖，独立前端） | 2~3h | ~90% |

## 迭代 3：成就系统

| 计划 | 文件 | 状态 | 工时 | Codex 执行占比 |
|---|---|---|---|---|
| 3. 成就系统 | [3-achievement-system.md](./3-achievement-system.md) | ✅ 方案已确认 | 8~14h（3 个子 PR） | ~55% |

## 迭代 4：支付（Learning MVP）

| 计划 | 文件 | 状态 | 工时 | Codex 执行占比 |
|---|---|---|---|---|
| 4. 接入支付 | [4-payment-integration.md](./4-payment-integration.md) | ✅ 商业决策已定，研究后开工 | 1~1.5 周 | ~40% |

---

## 建议执行顺序（2026-04-21 修订）

```
1.2 → 1.1 → 1.3 → 2.1a → 2.0 → 2.1b → 2.2 → 2.3 → 3 → 4
```

**顺序理由：**

- 1.2 是 P0 阻塞项：`reset` 限流缺失 + `updateUser` 调用签名错误，会影响 2.1
- 2.1a 先做 tab 容器与 callback 入口治理，避免 2.3/3 再次改结构
- 2.0 独立迁移事件契约（`scoreUpdate` / `eatFood payload` / `handleGameOver 第4参`），降低 2.2 与 3 的耦合风险
- 2.1b 再落地安全敏感路由（update-password / update-email）
- 2.2 在 2.3 前：food 颜色与 gameContext 数据口径先定型
- 2.3 以 2.1a 的 tab 容器为硬依赖
- 3 依赖 2.2 的 gameContext 接口
- 4 依赖 2.3 的皮肤 store（entitlement → activeSkin）

## 依赖关系矩阵

| 计划 | 硬依赖 | 软依赖 | 风险 |
|---|---|---|---|
| 1.1 | — | — | 低 |
| 1.2 | — | — | 中（认证链路 + 外部 SDK） |
| 1.3 | — | — | 低 |
| 2.1a（tab+callback 治理） | **1.2** | — | 中 |
| 2.0（事件契约迁移） | 1.1 | — | 低 |
| 2.1b（password/email） | **1.2**、2.1a | — | 中 |
| 2.2 | 2.0 | 2.1a | 低 |
| 2.3 | **2.1a** | 2.2（food 颜色增强） | 低 |
| 3 | **2.2**（gameContext 接口）、**2.1a**（ProfileModal tab 入口） | — | 中 |
| 4 | **2.3**（皮肤 store）、**单实例约束复核** | — | 高 |

## AI 分工总原则

参见 `../../ai-collaboration.md`。简言之：

- **Claude Code**：架构设计、方案推演、风险识别、需求拆解、代码审查
- **Codex**：落地编码、测试验证、开发流程整理、仓库内文档维护

## 共享约定

- 每个计划文件都包含：现状摘要、方案决策、改动清单、TDD 步骤、模型分工表、验收标准、风险清单、PR 信息
- Codex 执行时，先读对应计划文件再动手
- 执行中若发现计划不符合实际（如代码已变），先更新计划文件或在汇报中指出偏差再继续（以项目 `AGENTS.md` 为准）

---

## 📝 评审修订记录（2026-04-20）

对 7 份计划做综合评审，识别 12 项漏洞、3 项功能割裂、依赖顺序错误，用户已全部接受并要求修订。

**关键改动：**

1. 新增 `2.3-skins.md`（皮肤系统从 4.3 剥离为独立前端迭代）
2. 执行顺序调整：2.1 提到 2.2 前（因依赖 1.2），新增 2.3 在 2.2 后 3 前
3. 2.2 新增 `gameContext` 接口（`handleGameOver` 第 4 参），为成就系统打基础
4. 2.2 `emit('eatFood', { type, score })` payload 对象化，便于后续扩展
5. 2.1 新增 `useAuthCallback.js` 多 type 分支改动（email_change）
6. 2.1 新增 ProfileModal tab 容器结构改造（一次性，后续共享）
7. 1.3 加 koa-session `'session'` 字符串行为的验证任务
8. 1.2 加 rate limiter 测试隔离方案（`__resetAll` 或工厂函数）
9. 3 成就 `/check` 端点加 schema 校验
10. 3 `leaderboard_top10` 成就实现路径明确（方案选择）
11. 4 raw body 中间件改造具体写到改动清单
12. README 声明项目单实例部署约束

每份 plan 文件底部新增"评审修订"小节记录具体变更。

---

## 📝 审查对齐修订记录（2026-04-21）

基于“当前代码实现 vs 计划文档”逐条审查，补充以下修订：

1. 1.2 上调为 P0：明确先修 `reset` 限流与 `updateUser` 调用签名问题
2. 新增 `2.0-event-contract-migration.md`：把接口演进从 2.2/3 中剥离为独立小 PR
3. 2.1 拆为 2.1a（tab+callback 基建）/2.1b（安全路由），顺序前置 2.1a
4. 2.3 依赖修正：硬依赖 2.1a，2.2 仅为软依赖（食物颜色增强）
5. 3 的规则引擎从“表达式 evaluator”降级为“白名单规则函数”
6. 4 增补 Day-1 gate：依赖安装、payments 路由骨架、raw body 冒烟验证
7. 1.1 测试路径统一到现有 `client/tests/**` 目录约定
