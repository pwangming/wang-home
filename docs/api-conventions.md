# API 访问规范

> 本文档承接 `AGENTS.md` 中"API 访问"节的核心禁令，记录前后端 API 调用约定、helper 用法与跨环境兼容性细节。
> 如本文档与 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。

## 路径约定

- 前端 API 请求**默认使用相对路径** `/api`，不直连 Railway URL。
- 本地开发：Vite dev server 将 `/api` proxy 到后端 `http://127.0.0.1:4000`（见 `client/vite.config.js`）。
- 预览/生产：Vercel 通过 `client/vercel.json` 把 `/api/*` rewrite 到 Railway 后端。
- 后端新增接口必须挂在 `/api/*` 下，并兼容 Vercel rewrite + Vite proxy + CSRF Origin 校验。

## 为什么不能直连 Railway URL

浏览器同源策略：跨域请求中 `HttpOnly` session cookie 不会自动携带（除非明确配置 `withCredentials` + 服务端 `Access-Control-Allow-Credentials`，且仍受 SameSite 限制）。把 `/api` 走同源 rewrite 后，浏览器视后端请求为同域，cookie 自然带上，登录态稳定。

把 `VITE_API_BASE` 改成 Railway 直连 URL 会立即破坏：

- session cookie 不再随请求发送 → 所有写接口认证失败
- CSRF Origin 校验失败（前端域名 ≠ Railway 域名）
- `Secure` cookie 在跨域 + 非 HTTPS 场景设置失败

## 前端 helper 使用

新增 API 调用时优先复用 `client/src/lib/api.js` 中的 helper，不要在组件中散落手写 `fetch`。

helper 应统一处理：

- 基础路径前缀（`/api`）
- `Content-Type` 头
- credentials（`include` / `same-origin`）
- 错误响应解析与统一异常类型
- 响应 envelope 解构
- 必要时的重试 / 超时策略

新增接口时如发现 helper 不支持某场景，**优先扩 helper**，不在组件里绕过。

## 响应 envelope

后端响应建议保持一致结构：

```json
{
  "success": true,
  "data": <payload>,
  "error": null,
  "meta": { "page": 1, "total": 100, "limit": 20 }
}
```

或失败：

```json
{
  "success": false,
  "data": null,
  "error": { "code": "INVALID_INPUT", "message": "..." }
}
```

- 错误响应不暴露内部细节（堆栈、SQL、文件路径）
- 错误码使用稳定标识符（不依赖文案）
- 分页接口必须含 meta

## 后端路由组织

- 路由按资源分文件：`server/src/routes/<resource>.js`
- 写接口必须以 session `user_id` 为准，忽略客户端提交的 `user_id`
- 所有路由前缀统一为 `/api`
- 中间件顺序：`session` → `csrf` → `rateLimit` → `auth`（按需） → handler

## CSRF 与 Origin 校验

- 写接口必须经 CSRF 中间件
- CSRF 校验依赖 `Origin` 头，白名单从 `ALLOWED_ORIGINS` 读取
- 新增前端预览域名必须同步 `ALLOWED_ORIGINS`，否则写接口 403
- GET 接口默认不走 CSRF（无副作用），但仍需做用户输入校验

## 跨环境兼容性 checklist

新增/修改 API 时确认：

- [ ] 路径以 `/api` 开头
- [ ] 本地 dev（Vite proxy）可访问
- [ ] Vercel preview alias 可访问（rewrite 兼容）
- [ ] CSRF 校验通过（必要域名在 `ALLOWED_ORIGINS` 中）
- [ ] cookie 行为本地与 staging 一致
- [ ] 前端调用走 `client/src/lib/api.js` helper
- [ ] 错误响应结构与 envelope 一致
- [ ] 新增写接口已加限流（如属于 `AGENTS.md` 限流必需列表）

## 常见反模式

| 反模式 | 问题 | 正确做法 |
|---|---|---|
| 在组件里写 `fetch('/api/...')` | 重复样板、错误处理不一致 | 用 `client/src/lib/api.js` helper |
| `VITE_API_BASE=https://*.railway.app` | 跨域 cookie / CSRF 破坏 | 留空或 `/api` |
| 后端读 `body.user_id` 直接写库 | IDOR 漏洞 | 用 session `ctx.state.user.id` |
| 写接口走 GET | 缓存代理可能记录 query 串、CSRF 防护薄弱 | 用 POST/PUT/PATCH/DELETE |
| 错误返回 stack trace | 信息泄漏 | 返回错误码 + 友好 message |
| 新接口忘加限流 | 暴力刷 / DoS | 按 `docs/security-boundaries.md` 限流策略加 |

## 文档与变更协同

新增 API 时：

1. 路由代码 + 单元测试 + 集成测试
2. 前端 helper 扩展 + 单元测试
3. 如涉及 cookie / CSRF / 限流，更新 `docs/security-boundaries.md`
4. PR 描述列出新接口 path、参数、响应、错误码、限流配置
