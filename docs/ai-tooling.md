# AI 工具

本文档记录 Codex、Claude Code 以及相关 CLI、MCP、插件、skills 的使用边界。`AGENTS.md` 仍是主规则源；如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## CLI vs MCP 选择原则

- 可复现、可审计、适合写入文档或 CI 的操作，优先使用 CLI。
- 页面观察、截图、点击、输入、DOM/CSS/network/cookie 调试，优先使用浏览器工具、Playwright 或 MCP。
- 官方文档查询、外部系统只读信息查询、结构化上下文读取，可以使用 MCP。
- npm scripts 和 CI 是标准自动化入口；不要把 MCP 作为 CI 必需依赖。
- 有 CLI 不代表必须排斥 MCP；CLI 更适合执行，MCP 更适合观察和结构化理解。
- 涉及生产、数据库写入、部署、支付、密钥、GitHub merge/release 的操作，无论使用 CLI 还是 MCP，都必须先确认。

## 工具权限分级

### L1 只读工具

可直接用于分析：

- 代码搜索：`rg`
- 文件读取：`Get-Content`
- Git 只读：`git status`、`git diff`、`git log`、`git branch -vv`
- 文档查询
- 浏览器页面观察、截图
- 外部系统只读查询

### L2 本地可写工具

可按任务执行，但必须遵守分支和工作区规则：

- 编辑仓库文件
- 运行测试、lint、build
- 启动本地 dev server
- Playwright 本地测试
- 生成本地报告、截图、trace
- 修改 `.env.example`、docs、测试文件

### L3 高风险可写工具

必须先说明影响范围、回滚方式、验证步骤，并等待确认：

- Supabase `db push`、`db pull`、迁移、RLS、生产数据
- Vercel/Railway 配置
- 生产环境变量
- GitHub PR merge、release、tag、branch 删除
- 支付配置、webhook、退款、订单状态
- 修改全局 MCP/plugins/skills/Claude/Codex 用户配置

### L4 禁止自动执行工具

默认不执行，除非用户明确逐项授权：

- 删除生产数据
- `git push --force`
- `rm -rf` / 递归删除不明确路径
- 泄露或打印密钥
- 将敏感信息上传第三方
- 未确认的生产部署或数据库写入

## Supabase MCP 边界

- **当前阶段 Supabase MCP 不作为必需工具**；后续如接入，默认只读、只连接本地或测试环境。
- **不使用生产 `service_role` key 配置 MCP**。生产 service_role 拥有全表读写权限，泄漏即库失守。
- Supabase MCP 的任何**写操作、迁移、RLS 修改、生产查询、生产配置读取**都必须先方案 + 用户确认，按 L3 风险处理。
- MCP 调用 Supabase 后如发现写入了生产，立即停止并按 `docs/security-boundaries.md` 安全事件响应流程处理。

## 浏览器与 UI 验证工具

- Playwright CLI 是标准 E2E 和 UI 回归验证工具。
- 涉及前端可见 UI、交互、路由、表单、样式、游戏画面或关键用户流程的改动，必须实际打开页面验证。
- 需要用户看到每一步页面时，优先使用 Playwright headed、UI mode 或 debug mode。
- Browser 插件或本地浏览器可用于临时人工观察和交互确认。
- Chrome DevTools / browser MCP 用于 DOM、CSS、network、cookie、console 和性能调试，不作为 CI 必需依赖。
- 普通 UI 验证至少保留关键页面截图；复杂交互、动画、游戏或难复现问题优先保留 trace/video。
- UI 验证最终汇报必须说明打开的页面、验证的交互、视口尺寸和发现的问题。

常用命令示例：

```bash
npm run test:e2e --workspace=client -- --headed
npm run test:e2e --workspace=client -- --ui
npm run test:e2e --workspace=client -- --debug
```
