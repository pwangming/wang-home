# 安全边界

> 本文档承接 `AGENTS.md` 中"安全边界"节的核心禁令，记录每类敏感操作的具体防护措施、审查清单和已知风险。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## 防护对象 → 措施总览

| 对象 | 主要风险 | 防护措施 | 实现位置 |
|---|---|---|---|
| Session cookie | 跨站窃取、CSRF | `httpOnly: true`、`sameSite: 'lax'`、生产 `secure: true` | `server/src/index.js` koa-session 配置 |
| CSRF | 跨站伪造写请求 | Origin 头校验 + `ALLOWED_ORIGINS` 白名单 | `server/src/middleware/csrf.js` |
| Supabase token | XSS 窃取长期凭证 | token 只存服务端 session，不下发浏览器 | `server/src/middleware/auth.js` |
| RLS | 用户读写他人数据 | `game_sessions` 仅自己读写；排行榜走后端聚合 | Supabase `policies/*.sql` |
| 限流 | 暴力登录、刷分 | IP + user_id 双维度，关键接口单独配额 | `server/src/middleware/rateLimit.js` |
| 密钥 | 泄漏 / 误提交 | `.gitignore` `.env`；不写入文档；Railway/Vercel 各自管理 | 仓库根 + 平台 dashboard |
| Deploy Hook URL `[目标态]` | 泄漏后任意触发部署 | 仅作为 GitHub Secret，按需轮换 | `.github/workflows/deploy.yml` + repo Secrets（**当前未配置**） |
| 用户输入 | 注入、XSS、IDOR | 服务端校验、参数化查询、`user_id` 以 session 为准 | 各路由 handler |
| 支付 | 重复扣款、伪造回调 | 幂等设计、签名校验、sandbox/prod 隔离 | 待实现，方案见 `docs/superpowers/plans/4-payment-integration.md` |

## Session / Cookie / CSRF

- 后端 session cookie 必须保持 `httpOnly: true`、`sameSite: 'lax'`、生产环境 `secure: true`。
- Railway 边缘终止 TLS，后端必须保持 `app.proxy = true` 以正确识别 `X-Forwarded-Proto`，否则 `Secure` cookie 设置失效。
- CSRF Origin 校验必须与 `ALLOWED_ORIGINS` 保持一致；新增前端域名或预览域名时必须同步更新。
- 涉及 session、cookie、CSRF 的改动必须说明本地、Vercel preview 和生产三个环境下的行为差异。
- Token 刷新逻辑在 `authMiddleware`：`getUser()` 失败 → `setSession(refreshToken)` → 更新 session cookie。前端不直接处理 refresh token。

## 用户输入校验

- 所有 POST/PUT/PATCH/DELETE 接口必须在服务端做参数校验，不能只依赖前端校验。
- 写接口必须以服务端解析出的 `user_id` 为准，忽略客户端提交的 `user_id`。
- 字符串字段必须设最大长度；数值字段必须设范围；枚举字段必须用白名单。
- 文件上传/路径参数必须做白名单或正则校验，防止路径穿越。

## 数据库 / RLS / 迁移

- `profiles`：公开可读，用户可改自己的。
- `game_sessions`：用户只能读写自己的原始记录。
- 排行榜数据由后端 API 聚合输出，不直接对前端暴露原始表。
- schema、RLS、索引、迁移、seed 改动必须说明目标环境、影响表、回滚方式和验证方式。
- **迁移验证策略**：
  - **当前阶段**（staging 与 production 共享 Supabase）：必须先在**本地 Supabase**（`supabase start`）执行迁移并验证；远程 `db push` 必须先用户确认。
  - **目标阶段** `[未实施]`：独立 staging Supabase project 落地后，必须先在 staging 验证再 push 到 production。
- 不可逆迁移合并前必须先补 down 脚本或拒绝合并。

## 密钥与凭证

- 默认不读取、不输出、不修改生产密钥、token、连接串、支付密钥。
- `SUPABASE_SERVICE_ROLE_KEY` 永不带 `VITE_` 前缀；只放后端 env。
- 任何在 PR 描述、commit message、文档中出现真实密钥的情况：立即 rotate，repo 内删除，并审查相关 history。
- Vercel Deploy Hook URL 视为 secret：泄漏后可被任意触发部署。**当前未配置**；CI 门控方案落地后才需要。
  - 落地后位置：`repo Settings → Secrets and variables → Actions`，命名 `VERCEL_DEPLOY_HOOK_MAIN`。
  - 轮换流程：Vercel dashboard 删除旧 hook → 新建 hook → 更新 GitHub Secret → 验证 deploy.yml 仍可触发。
  - 落地步骤见 `docs/superpowers/plans/ci-deploy-gating-and-branch-alignment.md` Phase 3–4。

## 限流策略

必须限流的接口：

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/game-sessions/start`
- `POST /api/leaderboard`

维度：

- IP（所有接口）
- `user_id`（已登录接口）

当前实现：内存限流器（`server/src/middleware/rateLimit.js`）。多实例后端场景必须替换为 Redis 实现，否则限流失效。

## 支付

- 支付相关变量、密钥从一开始必须区分 sandbox / test / prod，不允许测试密钥和生产密钥混用。
- 支付 webhook、订单状态变更、退款、重复回调、失败回调必须按幂等设计：基于 webhook id 或订单 id 去重。
- 任何支付配置变更（密钥、webhook URL、商家信息）属于高风险操作，必须先方案 + 用户确认。
- 支付沙箱与生产代码路径不允许靠"哪个 env 变量存在"区分；必须通过显式配置开关切换，避免误用。

## 安全审查清单

涉及以下任意一项时，完成实现后必须按此清单审查：

- [ ] 是否有未校验的用户输入？
- [ ] 数据库查询是否参数化？无字符串拼接？
- [ ] 写接口是否以 session `user_id` 为准？
- [ ] 错误响应是否泄漏内部细节（堆栈、SQL、文件路径）？
- [ ] 新增前端域名是否同步 `ALLOWED_ORIGINS`？
- [ ] 新增 cookie 是否设置 `httpOnly` / `sameSite` / 生产 `secure`？
- [ ] 新增第三方 API 调用是否处理超时、错误、敏感数据外泄？
- [ ] 新增日志是否避免输出 token、密码、cookie 值？
- [ ] 新增限流是否覆盖 IP + user_id？
- [ ] 涉及支付的改动是否幂等？sandbox/prod 是否隔离？
- [ ] 是否新增了高风险 RLS 策略变更？是否在 staging 验证？

## 已知未覆盖风险

- 内存限流器 → 多实例失效（需 Redis）
- 当前 staging 与 production 共享 Supabase project，破坏性 schema 测试可能污染生产数据
- Vercel 自定义域名 SSL/CSP 头未集中配置（依赖 Vercel 默认）
- 没有集中错误监控（Sentry 等）；生产异常依赖 Railway log
- 支付集成未实施，相关防护规则属于预留

## 安全事件响应

发现疑似安全问题时：

1. 立即停止相关写操作（feature flag 关闭或路由 503）
2. 不在 issue / PR / 公开渠道讨论细节
3. 评估影响范围（涉及哪些用户、哪些数据、是否有数据外泄）
4. 必要时立即 rotate 涉及的所有密钥
5. 修复后做完整安全审查再恢复
6. 事后按 `docs/incidents/README.md` 模板写复盘文档
