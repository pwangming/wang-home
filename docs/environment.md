# 环境变量

本文档记录本项目环境变量的用途、作用范围和维护规则。`AGENTS.md` 仍是环境变量安全边界的主规则源。

## 基本原则

- 真实 `.env`、密钥、token、数据库连接串、支付密钥不得提交。
- 文档中不写真实 project ref、连接串、token、支付配置标识等敏感或可识别生产信息；统一使用占位符。
- Agent 默认不得读取或修改真实 `.env`；排查环境问题确需读取时，必须由用户明确要求，且不得回显敏感值。
- 新增、删除或重命名环境变量时，必须同步更新对应 `.env.example` 和本文档。
- 前端变量必须以 `VITE_` 开头，并且只能包含浏览器可见的非敏感值。
- 后端密钥只能放在 server、Railway、Supabase 或支付平台对应环境中，不得暴露给前端。
- `local`、`preview/test`、`production` 必须区分配置，尤其是支付和数据库相关变量。

## 文件位置

| 文件 | 用途 | 备注 |
|---|---|---|
| `client/.env.example` | 前端本地变量模板 | 可提交 |
| `client/.env.local` | 前端本地真实变量 | 不提交，不默认读取 |
| `server/.env.example` | 后端本地变量模板 | 可提交 |
| `server/.env` | 后端本地真实变量 | 不提交，不默认读取 |
| Vercel Environment Variables | 前端 preview/production 变量 | 通过 Vercel 管理 |
| Railway Variables | 后端 preview/production 变量 | 通过 Railway 管理 |
| Supabase Dashboard | Supabase Auth/DB 相关配置 | 高风险操作需确认 |

## 前端变量

前端变量会被 Vite 注入浏览器，不能包含服务端密钥、数据库连接串、支付密钥或任何不可公开的值。

| 变量 | 环境 | 是否敏感 | 用途 | 备注 |
|---|---|---:|---|---|
| `VITE_SUPABASE_URL` | local/preview/production | 否 | Supabase URL，供前端 Realtime 等浏览器侧能力使用 | local 通常指向 `http://127.0.0.1:54321` |
| `VITE_SUPABASE_ANON_KEY` | local/preview/production | 否 | Supabase anon key | anon key 可暴露给浏览器，但仍不要在文档中写真实值 |
| `VITE_API_BASE` | 特殊情况 | 否 | 前端 API base | 默认不要设置，让 API 走 `/api`；禁止配置为 Railway 直连 URL |

### 前端示例

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 后端变量

后端变量用于 Koa 服务、session、CSRF、Supabase 服务端调用和运行环境控制。真实值不得提交。

| 变量 | 环境 | 是否敏感 | 用途 | 备注 |
|---|---|---:|---|---|
| `SUPABASE_URL` | local/preview/production | 否 | 后端连接 Supabase 的 URL | production 必填 |
| `SUPABASE_ANON_KEY` | local/preview/production | 是 | 后端 Supabase client 使用的 key | production 必填，不在文档中写真实值 |
| `SESSION_SECRET` | local/preview/production | 是 | Koa session 签名密钥 | production 必填，必须是随机强密钥 |
| `PORT` | local/preview/production | 否 | 后端监听端口 | 本地默认 `4000` |
| `ALLOWED_ORIGINS` | local/preview/production | 否 | CORS/CSRF 允许的前端 Origin，逗号分隔 | 必须包含对应前端域名 |
| `NODE_ENV` | local/preview/production/test | 否 | 控制生产 cookie、安全 header、测试行为 | production 必须为 `production` |

### 后端示例

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key-here
SESSION_SECRET=change-me-to-a-random-string
PORT=4000
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
```

## Supabase 配置变量

`supabase/config.toml` 中引用了一些可选 provider secret。未启用对应 provider 时无需配置。

| 变量 | 环境 | 是否敏感 | 用途 | 备注 |
|---|---|---:|---|---|
| `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN` | local/preview/production | 是 | Twilio SMS provider auth token | 当前 provider 默认未启用 |
| `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` | local/preview/production | 是 | Apple OAuth provider secret | 当前 provider 默认未启用 |
| `OPENAI_API_KEY` | local | 是 | Supabase Studio AI 功能 | 不作为项目运行必需变量 |
| `S3_HOST` | local/preview/production | 视情况 | Supabase experimental S3 配置 | 当前不作为项目运行必需变量 |
| `S3_REGION` | local/preview/production | 否 | Supabase experimental S3 配置 | 当前不作为项目运行必需变量 |
| `S3_ACCESS_KEY` | local/preview/production | 是 | Supabase experimental S3 配置 | 当前不作为项目运行必需变量 |
| `S3_SECRET_KEY` | local/preview/production | 是 | Supabase experimental S3 配置 | 当前不作为项目运行必需变量 |

## 平台环境

### local

- 前端：`client/.env.local`
- 后端：`server/.env`
- Supabase：优先使用 `supabase start` 启动本地 Supabase。
- API：前端走 `/api`，由 Vite proxy 转发到本地后端。

### preview/test

- 前端变量由 Vercel preview/test 环境管理。
- 后端变量由 Railway 对应环境管理。
- `ALLOWED_ORIGINS` 必须包含 Vercel preview/test 前端域名。
- 不使用生产支付密钥或生产数据库写操作。

### production

- 前端生产变量由 Vercel production 环境管理。
- 后端生产变量由 Railway production 环境管理。
- `SESSION_SECRET`、`SUPABASE_URL`、`SUPABASE_ANON_KEY` 必须存在。
- `NODE_ENV` 必须为 `production`。
- `ALLOWED_ORIGINS` 必须只包含明确允许的生产/必要预览域名。
- 修改生产环境变量属于高风险操作，必须先说明影响范围、回滚方式和验证步骤，并等待用户确认。

## 支付变量预留

接入支付前必须先确定服务商和环境命名。支付变量从一开始必须区分 sandbox/test/prod，不能混用。

建议命名原则：

- 使用清晰前缀，例如 `<PAYMENT_PROVIDER>_SECRET_KEY`、`<PAYMENT_PROVIDER>_WEBHOOK_SECRET`。
- sandbox/test 和 production 不共用变量值。
- webhook secret 只放后端或平台环境变量，不暴露给前端。
- 任何支付变量新增都必须同步 `.env.example` 和本文档。

## 新增变量流程

新增、删除或重命名环境变量时：

1. 判断变量属于前端、后端、Supabase、部署平台还是支付服务。
2. 判断是否敏感，敏感值不得写入文档或示例。
3. 更新对应 `.env.example`。
4. 更新本文档的变量表。
5. 如涉及 Vercel、Railway、Supabase 或支付平台，说明需要在哪些环境配置。
6. 如涉及生产环境，先说明影响范围、回滚方式和验证步骤，并等待用户确认。
