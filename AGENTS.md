# Kinetic Arcade Agent Guide

本文件是本仓库的 AI 协作主规则源，作为 Codex/Agent 在本仓库工作的默认指南。适用于整个仓库。

执行涉及前端/后端业务代码、Supabase、构建/部署/CI 改动的任务前，必须先阅读 `docs/project-context.md`。首次进入项目或不熟悉项目结构时也必须读。

以下任务可按需读取：纯文档改动、typo / 注释 / 格式化、纯讨论或方案 brainstorming。

如本文件与 `docs/*.md` 冲突，以本文件为准，并在任务中指出需要修正文档冲突。

## 文档结构与读取规则

- `AGENTS.md` 是 AI 协作主规则源，只放必须每次生效的硬规则、关键边界和详细文档索引。
- `CLAUDE.md` 只导入 `AGENTS.md`，并保留 Claude Code 专属补充，不重复维护项目规则。
- 仓库内项目文档默认使用中文；代码、命令、API、错误信息和专有名词保留原文。
- `docs/*.md` 用于当前有效的流程、规范、检查清单和项目级说明。
- `docs/superpowers/plans/` 用于需求探讨、实现计划、阶段性方案和历史计划记录；执行前必须确认对应计划是否仍是当前有效方案。
- `docs/audits/` 用于系统评估、审计、缺陷盘点等快照型文档；记录"当前是什么样、有哪些问题"，**不作为当前执行依据**，是后续 plans 的输入。
- `docs/archive/` 用于已归档的历史方案，默认不作为当前执行依据；只有用户明确要求回溯历史时才读取。
- `docs/learning/` 用于学习笔记、参考资料，默认不作为项目规范依据。
- 执行具体任务前，Agent 必须根据任务类型读取对应 docs 文档；不要默认全量读取所有 docs。
- 新增或调整规则时：硬规则 → `AGENTS.md`；详细步骤、变量表、清单 → `docs/*`；需求讨论与阶段性计划 → `docs/superpowers/plans/`；评估快照与缺陷盘点 → `docs/audits/`；过期方案 → `docs/archive/`；学习笔记 → `docs/learning/`。
- 不得因 `docs/archive/`、`docs/learning/` 或 `docs/audits/` 中出现某个方案 / 问题描述就默认它是当前要执行的方案；落地必须经过 `docs/superpowers/plans/`。

## 重构期 Spec 冻结约束（临时，2026-05-06 起）

> 关联：`docs/superpowers/plans/platform-refactor-vision.md` §7、`docs/audits/spec-debt.md`
> 失效条件：平台化重构结束 + Spec Final Audit 通过后**删除本章节**

平台化重构期间，对 `AGENTS.md` 与 `docs/*`（不含 `docs/audits/`、`docs/learning/`、`docs/superpowers/plans/`）的修订采用冻结 + 批量机制：

- 重构过程中发现的 spec 缺口 / 冲突 / 过严 / 过松，**先记入 `docs/audits/spec-debt.md` 台账，不当场改规范**
- **紧急例外**（涉及认证 / 数据库 / 支付 / 密钥 / 生产数据的 spec 风险）允许立即修订，仍需在台账登记
- spec 修订走独立分支 + 独立 PR：`*/spec-*` 前缀；**不与业务代码 PR 混合**
- 每个里程碑（P0 / P1 / P2 完成）做一次 **Spec Reconciliation Pass**，批量处理 `待批量` 项
- 标准化前置：新规范需 **N≥2 真实模块验证**才写入 `docs/*`

Agent 执行职责：

- 发现 spec 问题时**默认动作 = 写入 `docs/audits/spec-debt.md`**，不在当前 PR 顺手改 `AGENTS.md` / `docs/*`
- 是否升级为"紧急"由用户决定，不要自行判断
- 当用户提议改规范时，提醒本章节存在，确认是否走台账机制

## 规范冲突与偏差处理

- 执行过程中一旦发现当前任务、代码实现、文档说明、工具行为或既有计划与 `AGENTS.md` / 当前有效 `docs/*` 不一致，必须立即提醒用户。
- 提醒时必须说明：冲突点在哪里、影响什么、继续按当前逻辑执行的风险、可选解决方案。
- 默认不自行静默选择"改规范"或"绕过规范"；应让用户确认是修改规范、修改当前执行逻辑，还是将该偏差记录为临时例外。
- 若冲突涉及认证、数据库、支付、部署、密钥、生产数据或用户数据，必须暂停相关高风险操作，等用户明确确认后再继续。

## 功能与变更准入标准

所有任务开始前，先判断变更类型、影响范围和风险等级。

- **低风险**（可直接执行）：文档小修改；注释、拼写、格式修正；单文件无行为变化的小调整；用户指定的简单替换；不影响构建/部署/认证/数据库/支付/用户数据的轻微 UI 文案。
- **中风险**（先给方案再执行）：新增普通功能、跨文件改动；前端状态/API helper/路由/表单逻辑改动；后端普通接口/业务逻辑/错误处理改动；测试结构调整；生成文件策略调整；项目清理、脚本调整、开发流程调整。
- **高风险**（先方案、等确认、说明测试/回滚/安全影响）：认证、授权、session、cookie、CSRF；数据库 schema、RLS、迁移、seed、生产数据；支付、订单、退款、webhook、外部回调；部署配置、环境变量、密钥、生产服务；大范围重构或架构调整；GitHub release/merge、`main`、`release/*` 操作；影响用户数据、登录态、分数提交、排行榜、公平性、付费权益的改动。

中/高风险开始前必须回答：

- 目标是什么？明确不做什么？
- 影响哪些模块和环境？
- 是否涉及认证、数据库、支付、部署、密钥或用户数据？
- 需要哪些测试？是否需要实际页面验证？
- 如何回滚？有哪些未覆盖风险？

## AI 分工协作（核心）

- Claude Code 主要负责架构设计、方案推演、风险识别、需求拆解和 Codex 实施前的设计输入。
- Codex 主要负责落地编码、测试验证、代码审查、开发流程整理和仓库内文档维护。
- 同一时间只允许一个 AI 作为主驾驶修改仓库；另一个只做方案、审查或独立任务。
- 当用户的方案、假设或命名不符合最佳实践、安全边界或维护性要求时，Agent 必须直接指出并给出更稳妥的替代方案，不为迎合用户而附和。

详细分工边界、交接模板、冲突仲裁、PR 标签策略见 `docs/ai-collaboration.md`。

## 安全边界（核心禁令）

- 涉及认证、授权、session、cookie、CSRF、数据库、支付、外部 API、密钥和用户输入的改动属于高风险，必须先给方案并等待确认。
- 默认不读取、不输出、不修改生产密钥、token、连接串、支付密钥。
- 涉及用户输入的后端接口必须做服务端校验，不能只依赖前端校验。
- 支付相关功能必须从一开始区分 sandbox/test/prod，不允许混用。
- 涉及安全边界的实现完成后，必须做安全审查并在汇报中说明剩余风险。

详细规则见 `docs/security-boundaries.md`。

## 环境变量（核心禁令）

- 真实 `.env`、密钥、token、连接串、支付密钥不得提交。
- 不在文档中写入真实 project ref、生产域名密钥、连接串、token；使用占位符。
- 默认不读取或修改真实 `.env`；用户明确要求排查环境问题时才可读取，且不在回复中回显敏感值。
- 前端变量必须以 `VITE_` 开头，且只能含浏览器可见的非敏感值；后端密钥不得暴露给前端。
- 新增、删除、重命名环境变量时必须同步更新 `.env.example` 和 `docs/environment.md`。

详细变量表与同步规则见 `docs/environment.md`。

## API 访问（核心禁令）

- 前端 API 请求默认使用相对路径 `/api`，不直连 Railway URL（会破坏跨域 cookie）。
- 后端新增接口默认挂在 `/api/*` 下，并确保与 Vercel rewrite、Vite proxy、CSRF Origin 校验兼容。

详细规则、helper 用法、CSRF 注意见 `docs/api-conventions.md`。

## 分支流程

- `develop` 是固定主开发分支，新功能、修复、流程整理默认从 `develop` 切短生命周期分支。
- `main` 只代表生产稳定版本，不直接在 `main` 上开发。
- Codex 默认分支：`codex/<type>-<task>`；Claude Code 默认分支：`claude/<type>-<task>`。
- 提交信息使用 Conventional Commits（`feat:`、`fix:`、`refactor:`、`docs:`、`test:`、`chore:`、`perf:`、`ci:`）。
- 全局已禁用 AI attribution（`~/.claude/settings.json`）；提交人保持 git config 真实用户身份。
- 一个分支只解决一个明确目标，避免混合功能、重构、清理、流程改动。
- 开始任务前必须检查 `git status --short --branch` 与 `git branch -vv --all`；发现未提交改动先判断是否相关，不覆盖、不还原、不顺手提交用户改动。

详细命名规则、PR 流程、auto-merge 配置、生成文件策略、本地自检见 `docs/development-workflow.md`。

## 部署与上线（核心禁令）

- **当前部署架构（现状）**：Vercel production 跟 `main`，Railway production env 跟 `develop`，前后端跟踪分支不对称；Wait for CI 当前关闭，部署不等 GitHub CI 完成。
- **目标架构（规划中，尚未实施）**：双方对齐——`main` → Vercel production + Railway production env；`develop` → Vercel preview + Railway staging env；Wait for CI 启用 + GitHub Actions 触发 Vercel deploy hook。详见 `docs/superpowers/plans/ci-deploy-gating-and-branch-alignment.md`。
- 部署配置、生产环境变量、Railway/Vercel 设置、生产数据库迁移、支付配置修改属于高风险，必须先方案 + 确认 + 回滚说明。
- Vercel 通过 `client/vercel.json` 将 `/api/*` rewrite 到 Railway 后端；不得破坏该规则。
- 任何会修改生产数据库、支付配置、部署环境变量、GitHub release/merge 的操作，都必须先明确获得用户确认。
- 最终发布汇报必须说明发布分支、测试结果、预览验证结果、环境变量/数据库/支付是否有变更、剩余风险。

详细发布流程、上线检查清单、回滚步骤见 `docs/release-process.md`。

## 测试原则（底线）

- 不允许弱化断言来让测试通过。
- 不允许删除失败测试，除非先解释并等待确认。
- 不允许 mock 掉核心逻辑后声称已经测试。
- 不只测 happy path。
- 修 bug 必须补回归测试；如不能补，必须说明原因和剩余风险。
- 涉及前端可见 UI、路由、表单、样式、游戏画面或关键交互改动时，除单元测试/构建外，必须做实际页面验证。

推荐 TDD 顺序：

```text
写测试（RED）→ 运行确认失败 → 写实现（GREEN）→ 运行确认通过 → 重构
```

详细测试矩阵、各类改动对应验证、覆盖率策略见 `docs/testing-strategy.md`。

## 代码规范（底线）

- 单文件不超过 800 行，超过需拆分。
- 单函数不超过 50 行，嵌套不超过 4 层。
- 优先返回新对象，避免原地修改。
- 显式处理错误，不静默吞异常。
- 前端代码不保留 `console.log/warn/error`，后端启动日志除外。
- 保持改动范围聚焦，不做无关重构。

详细命名、注释、错误处理、import 顺序、文件组织见 `docs/coding-style.md`。

## MCP / 插件 / Skills 边界（核心）

- 只读工具可用于代码搜索、文档查询、页面观察和方案分析。
- 数据库写、Supabase 迁移、生产数据修改、Vercel/Railway 部署配置、GitHub merge/release、支付配置、密钥与环境变量修改属于高风险，必须先方案 + 确认。
- 不随意修改全局 MCP、plugins、skills 或 Claude/Codex 用户级配置。
- 涉及支付、认证、数据库、外部 API、Cookie/Session 的工具调用或代码改动，完成后必须做安全审查。

详细 MCP 列表、读写权限、工具分工见 `docs/ai-tooling.md`。

## 项目文件清理（核心）

- 不凭感觉删除"看起来没用"的文件。
- 清理前必须先做文件审计，列出候选文件、当前用途、引用情况、删除风险和建议动作。
- 删除文件必须小步进行，每个清理分支只处理一类清理目标。

详细分类、流程、不可动文件清单见 `docs/cleanup-candidates.md`。

## 任务完成、审查与提交

完成任务前必须完成与风险等级匹配的本地自检、测试和 diff 审查；具体清单见 `docs/development-workflow.md` §3。

涉及功能代码时必须做代码审查；涉及认证、用户输入、数据库、外部 API、Cookie/Session、支付时必须做安全审查。无 CRITICAL/HIGH 问题后再提交。

每个任务完成后必须按 `docs/development-workflow.md` §8 的汇报模板说明。生产发布任务额外按 `docs/release-process.md` "发布汇报模板"补充。

## 详细文档索引

| 主题 | 文档 |
|---|---|
| 项目上下文与常用命令 | `docs/project-context.md` |
| 架构决策记录 | `docs/ARCHITECTURE.md` |
| 日常开发流程（含分支命名、PR、生成文件、自检） | `docs/development-workflow.md` |
| 环境变量 | `docs/environment.md` |
| API 访问规范 | `docs/api-conventions.md` |
| 测试策略矩阵与覆盖率 | `docs/testing-strategy.md` |
| 代码规范细则 | `docs/coding-style.md` |
| 发布上线流程 | `docs/release-process.md` |
| 安全边界细则 | `docs/security-boundaries.md` |
| AI 协作分工 | `docs/ai-collaboration.md` |
| MCP / 插件 / Skills 工具边界 | `docs/ai-tooling.md` |
| 项目文件审计 | `docs/project-inventory.md` |
| 清理候选清单 | `docs/cleanup-candidates.md` |
| 阶段性计划索引 | `docs/superpowers/plans/README.md` |
| 系统评估与审计快照 | `docs/audits/` |

涉及部署架构、认证/session、CSRF、排行榜、RLS、限流或数据库 profile 建档规则的改动前，必须阅读 `docs/ARCHITECTURE.md`。
