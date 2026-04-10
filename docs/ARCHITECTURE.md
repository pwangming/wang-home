# Kinetic Arcade — 架构决策记录

> 最后更新: 2026-04-10
> 记录历史中做出的关键架构决策及其原因，供后续迭代参考。

---

## 1. 部署架构：Vercel 代理 → Railway

**决策**: 前端 Vercel 通过 `/api/*` rewrite 将请求代理到 Railway 后端，而不是前端直连 Railway。

**原因**: 浏览器同源策略要求 session cookie 必须是同域的。若前端直接请求 Railway 域名（跨域），`HttpOnly` cookie 无法在跨域请求中正常携带，导致登录状态丢失。通过 Vercel 代理，浏览器视 `/api` 为同域请求，cookie 正常工作。

**影响**:
- **禁止**在前端设置 `VITE_API_BASE` 为 Railway 直连 URL，否则跨域 cookie 立即失效
- Railway 边缘终止 TLS，后端需要 `app.proxy = true` 信任 `X-Forwarded-Proto` 头，才能正确设置 `Secure` cookie
- `client/vercel.json` 的 rewrite 规则是此架构的核心，不能随意修改

---

## 2. 认证设计：Token 只在服务端

**决策**: Supabase `access_token` / `refresh_token` 只存于 Koa 服务端 session，不下发给浏览器。

**原因**: 防止 XSS 攻击直接窃取长期凭证。浏览器只持有服务端 session ID（通过 `HttpOnly Cookie`），无法读取 Supabase token。

**影响**:
- 所有写接口以服务端解析出的 `user_id` 为准，忽略客户端提交的 `user_id`
- Token 刷新在服务端 `authMiddleware` 自动完成（`getUser()` 失败 → `setSession(refreshToken)` → 更新 session cookie）
- 前端通过心跳机制（每 10 分钟 + `visibilitychange`）保持 session 活跃
- Cookie 配置: `httpOnly: true`, `sameSite: 'lax'`, `secure: true`（生产）

---

## 3. CSRF 防护：Origin 头校验

**决策**: 后端 CSRF 中间件通过校验请求 `Origin` 头实现防护，白名单由 `ALLOWED_ORIGINS` 环境变量配置。

**原因**: 项目使用 `SameSite=Lax` cookie，已具备基础跨站防护，额外的 Origin 校验作为纵深防御。

**影响**:
- Railway 必须设置 `ALLOWED_ORIGINS` 环境变量（值为 Vercel 前端域名），否则所有写接口被拒绝
- 本地开发 `ALLOWED_ORIGINS` 需包含 `http://localhost:3000`

---

## 4. 排行榜排名口径

**决策**: 每个用户取**最高分**参与排行榜，不用最新一局。

**排序规则**（优先级依次）:
1. `best_score` 降序
2. `best_score_at` 升序（相同分数，更早达到者靠前）
3. `user_id` 升序（最终稳定排序，防止抖动）

**数据访问**: 公共排行榜读取统一通过 Koa API 聚合输出，不允许前端直接查 Supabase（避免绕过排名口径、分页、限流）。

---

## 5. RLS 策略

**决策**: `game_sessions` 表对用户只开放自己记录的读写权限，排行榜不直接对前端暴露。

```sql
-- profiles: 公开可读，用户可改自己的
-- game_sessions: 用户只能读写自己的原始记录
-- 排行榜聚合: 通过后端 API 输出，不暴露原始表
```

**原因**: 防止用户伪造他人分数，公共排行榜数据由后端统一聚合校验后输出。

---

## 6. 视觉设计系统

**风格**: 霓虹 / Neon（深色背景 + 发光效果）

**核心色彩**:

| 用途 | 色值 |
|------|------|
| 主背景渐变 | `#1a1a2e` → `#16213e` |
| 霓虹绿强调 | `#4ade80` |
| 蓝色辅助 | `#409eff` |
| 卡片背景 | `rgba(26, 26, 46, 0.9)` |
| 卡片边框 | `#2a2a4e` |
| 文字主色 | `#ffffff` |
| 文字次要 | `#909399` |

**组件规范**:
- 卡片圆角: 16px，按钮/输入框圆角: 8px
- 阴影: CSS `box-shadow` 模拟发光
- 装饰元素: 大圆形模糊 + `backdrop-filter: blur()`

---

## 7. 限流策略

**必须限流的接口**: `POST /api/auth/login`、`POST /api/auth/register`、`POST /api/game-sessions/start`、`POST /api/leaderboard`

**限流维度**: IP（所有接口）+ `user_id`（已登录接口）

**注意**: 当前使用内存限流器，生产多实例场景需替换为 Redis 实现。

---

## 8. 数据库 Profile 建档规则

**决策**: 不依赖应用层"注册后手动插入 profiles"，通过数据库触发器在 `auth.users` 创建后自动建档。

**原因**: 防止出现"已注册但无 profile"的孤儿账号，导致排行榜用户名为空等问题。

---

## 历史计划存档

详细的实现计划和 TDD 步骤已归档至 `docs/archive/`，按日期命名，供追溯参考。
