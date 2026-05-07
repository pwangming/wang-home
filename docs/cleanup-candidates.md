# 清理候选清单

> 本文档承接 `AGENTS.md` 中"项目文件清理"节的核心禁令，记录详细分类规则、清理流程和当前候选文件登记表。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## 清理原则

- 不凭感觉删除"看起来没用"的文件。
- 删除前必须先做文件审计，列出候选文件、当前用途、引用情况、删除风险和建议动作。
- 清理候选按三类处理：可直接清理 / 需要确认 / 不轻易动。
- 删除文件必须小步进行，每个清理分支只处理一类清理目标。
- 删除前优先用 `rg`、package scripts、配置文件和测试引用确认是否仍被使用。
- 对意义不明但无法证明无用的文件，先记录到本文档，不直接删除。
- 清理完成后必须运行与清理范围相关的测试或构建。

## 三类划分

### 可直接清理

- 临时日志（`*.log`、`tmp/*`、`debug/*`）
- 调试输出文件（截图、trace、coverage 报告本地缓存）
- 重复备份（`*.bak`、`*-copy.*`、`*-old.*`）
- 明显无引用的废弃草稿（无 import、无 reference、不在任何 script 中）

### 需要确认

- 旧方案文档（`docs/superpowers/plans/` 中过期或被替代的）
- 历史调试脚本（`scripts/` 中无人使用的）
- 部署相关文件（即使看起来没用，可能被平台读取）
- AI 工具配置（`.claude/`、`.codex/` 等）
- 测试辅助文件（mock fixtures、helper utils）
- 被注释掉但留在仓库的代码片段

### 不轻易动

- Supabase migrations（`supabase/migrations/*.sql`）—— 历史不可篡改
- Vercel/Railway 配置（`client/vercel.json`、`railway.json/.toml` 如有）
- GitHub workflows（`.github/workflows/*`）
- `package-lock.json` / `npm-shrinkwrap.json`
- 认证/session/CSRF 相关代码（`server/src/middleware/auth.js`、`csrf.js`、`rateLimit.js`）
- 部署相关脚本（`scripts/deploy*` 等如有）

## 清理流程

1. **审计**：用 `rg` / `grep` / `find` 列出候选文件
2. **登记**：把候选写入下方"候选登记表"，标注三类之一与建议动作
3. **确认**：中类候选必须等用户确认；不轻易动类候选必须双重确认
4. **小步删除**：每个分支只处理一类，PR 描述列出删除文件 + 引用搜索结果
5. **验证**：运行相关测试或构建，确认无破坏
6. **登记结果**：更新本文档"清理记录"

## 引用搜索常用命令

```bash
# 搜文件名引用
rg --hidden --glob '!node_modules' --glob '!.git' '<filename>'

# 搜模块导入
rg --hidden --glob '!node_modules' "from ['\"][^'\"]*<module-name>"

# 搜配置引用
rg --hidden --glob '!node_modules' '<filename>' --type json --type yaml --type toml

# 搜测试引用
rg --hidden --glob 'tests/**' '<symbol>'
```

## 候选登记表

> 状态：`pending`（待审）/ `confirmed`（已确认删除）/ `keep`（保留，原因已记录）/ `done`（已删除）

| 文件路径 | 当前用途推测 | 引用情况 | 类别 | 建议动作 | 状态 | 决策日期 |
|---|---|---|---|---|---|---|
| _示例：_ `scripts/legacy-debug.sh` | 早期调试脚本 | `rg` 无引用 | 可直接清理 | 删除 | pending | — |

> 实际候选项发现后填入此表。当前为空。

## 清理记录

记录已执行的清理动作，便于回溯。

| 日期 | 分支 | 删除文件 | 原因 | 验证结果 |
|---|---|---|---|---|
| _示例：_ 2026-04-19 | `codex/chore-cleanup-old-logs` | `tmp/*.log` | 临时日志 | client+server 测试通过 |

## 已知不可动清单

明确确认要保留、即使未来看起来"没用"也不轻易删除：

- `client/src/components.d.ts`、`client/src/auto-imports.d.ts`：自动生成类型声明，由 Vite 插件维护
- `supabase/migrations/*.sql`：迁移历史
- `supabase/seed.sql`（如存在）：本地 seed 数据
- `.github/workflows/*.yml`：CI / 部署 / 安全扫描
- `client/vercel.json`：Vercel rewrite 规则
- `package-lock.json`：依赖锁定
- `.gitignore`、`.gitattributes`、`.editorconfig`
- `AGENTS.md`、`CLAUDE.md`
- `LICENSE`、`README.md`（如存在）

## 项目清理与项目审计的关系

- 本文档 = 清理候选 + 流程 + 不可动清单
- `docs/project-inventory.md` = 全量项目文件审计、归属、用途

清理前应先确认 `project-inventory.md` 中已记录该文件的归属；如未记录，先补审计再决定是否清理。
