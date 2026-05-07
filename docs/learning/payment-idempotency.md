# 支付系统幂等性 + 事务 — 学习笔记

> 本文为个人学习笔记，**不是执行计划**。对应实施见 `docs/superpowers/plans/4-payment-integration.md`。

## 场景

Stripe webhook 处理 `checkout.session.completed` 事件：

1. 查订单 `purchases`
2. 改订单 `status='completed'`
3. 插权益 `user_entitlements`

看似直白，但**不加幂等保护必炸**。

---

## 为何必须幂等

### A. Stripe 重发机制

- Stripe 3 秒内收不到 `200` 会**重发**同一事件
- 触发重发的场景：server GC 暂停、部署重启、网络抖动、超时
- 同一 `event.id`（`evt_xxx`）可能到达 5 次甚至更多

### B. 并发重发

- Stripe 极少数场景会并发重发同一事件
- 两个进程同时到 step 1，都读到 `status='pending'`
- 不加锁 → 两个都走完 INSERT → 权益重复

### C. Check-then-Act 竞态

经典反模式：

```js
const purchase = await db.query('SELECT status FROM purchases WHERE stripe_session_id=?', [id])

if (purchase.status === 'completed') {
  return 200  // 看似幂等，实际不是
}

await updateStatus(id, 'completed')
await insertEntitlement(userId)
```

检查（SELECT）和动作（UPDATE/INSERT）**不原子**。并发两个请求都通过检查 → 都执行动作。

Postgres 默认 **READ COMMITTED** 隔离级别下两事务互不见对方未提交数据，竞态必然发生。

---

## 幂等的 3 道防线

### L1：事件层（Stripe event.id）

- 建 `processed_events` 表，primary key = `event.id`
- 每次处理前插入该表，冲突说明已处理，直接返回 200
- 最保险，开销最大
- 生产推荐，学习阶段可跳

### L2：业务层（stripe_session_id UNIQUE）

- `purchases.stripe_session_id` UNIQUE 约束
- 同一 session 重复插入 → 数据库拒绝
- 天然幂等锚点，**本项目用**

### L3：状态层（UPSERT）

- `user_entitlements` 主键 `(user_id, entitlement_id)`
- `INSERT ... ON CONFLICT DO NOTHING` 重复无副作用
- 兜底

---

## 方案对比

| 方案 | 原子性 | 复杂度 | 推荐 |
|---|---|---|---|
| 应用层"查-改-插" | ❌ 竞态 | 低 | **别用** |
| 条件 UPDATE + 应用层 UPSERT | 部分 | 中 | 可用，需补偿 |
| Postgres 函数 + `FOR UPDATE` | ✅ 完全原子 | 中 | **本项目推荐** |
| 事件表 + 事务 | ✅ 完全 + 审计 | 高 | 生产级 |

---

## 方案 A：Postgres 函数 + 行锁（推荐）

### SQL

```sql
create or replace function grant_entitlement(
  p_session_id text,
  p_user_id uuid,
  p_entitlement_id text
)
returns text as $$
declare
  v_purchase_id uuid;
  v_status text;
begin
  -- 1. 锁订单行
  select id, status into v_purchase_id, v_status
  from purchases
  where stripe_session_id = p_session_id
  for update;

  if v_purchase_id is null then
    return 'no_purchase';
  end if;

  if v_status = 'completed' then
    return 'already_completed';
  end if;

  -- 2. 改状态
  update purchases
  set status = 'completed', completed_at = now()
  where id = v_purchase_id;

  -- 3. 授权益
  insert into user_entitlements (user_id, entitlement_id, granted_by_purchase)
  values (p_user_id, p_entitlement_id, v_purchase_id)
  on conflict (user_id, entitlement_id) do nothing;

  return 'granted';
end;
$$ language plpgsql;
```

### 关键机制

**`FOR UPDATE` 行锁**
- 第一个事务拿锁，第二个 SELECT 阻塞等待
- 第一个提交后，第二个看到 `status='completed'`，进 `already_completed` 分支
- 无竞态

**函数 = 隐式事务**
- 任何一步失败 → 全回滚，状态不会半更新

**`ON CONFLICT DO NOTHING` 双保险**
- 即便锁失效（理论不会），主键冲突不报错

### 调用

```js
const { data: result } = await supabase.rpc('grant_entitlement', {
  p_session_id: session.id,
  p_user_id: session.metadata.userId,
  p_entitlement_id: 'skin_pack_v1'
})

// result: 'granted' | 'already_completed' | 'no_purchase'
// 三种都返 200 给 Stripe
ctx.status = 200
```

---

## 方案 B：条件 UPDATE + UPSERT（替代）

不想写 Postgres 函数时用：

```js
// 原子 UPDATE，仅改 pending → completed
const { data } = await supabase
  .from('purchases')
  .update({ status: 'completed', completed_at: new Date().toISOString() })
  .eq('stripe_session_id', session.id)
  .eq('status', 'pending')           // 关键条件
  .select()
  .single()

if (!data) {
  // 没改到 = 已 completed 或不存在
  const { data: existing } = await supabase
    .from('purchases')
    .select('status')
    .eq('stripe_session_id', session.id)
    .single()
  if (existing?.status === 'completed') return ctx.status = 200
  ctx.status = 400
  return
}

// UPSERT 权益
await supabase
  .from('user_entitlements')
  .upsert({
    user_id: data.user_id,
    entitlement_id: 'skin_pack_v1',
    granted_by_purchase: data.id
  }, { onConflict: 'user_id,entitlement_id' })

ctx.status = 200
```

**原理**：
- `UPDATE ... WHERE status='pending'` 是原子的，Postgres 内部加行锁
- 并发两个请求只有**一个**能改成功，另一个 WHERE 不匹配

**缺点**：UPDATE 和 UPSERT 之间仍有窗口
- 若进程在 UPDATE 后 UPSERT 前崩溃 → 订单是 completed 但权益没写
- 缓解：Stripe 重发时，UPDATE 失败，但可补检查"completed 但无权益时补写"

---

## 测试方法

### 手动：Stripe CLI 重发

```bash
stripe trigger checkout.session.completed
stripe events list --limit 5
stripe events resend evt_xxxxxxxxx
```

预期：`user_entitlements` 仍为 1 行。

### 自动：并发单元测试

```js
it('concurrent webhook 只解锁一次', async () => {
  await seedPendingPurchase(sessionId, userId)

  const results = await Promise.all(
    Array(10).fill(0).map(() => postWebhook(sessionId))
  )

  expect(results.filter(r => r.status === 200).length).toBe(10)

  const { data } = await db
    .from('user_entitlements')
    .select()
    .eq('user_id', userId)
  expect(data.length).toBe(1)
})
```

---

## 关键知识点总结

| 概念 | 要点 |
|---|---|
| 幂等性 | 同一操作执行 N 次结果等同执行 1 次 |
| Check-then-Act 反模式 | 检查与动作非原子 → 必有竞态 |
| `FOR UPDATE` | 行锁，并发事务按序执行 |
| `ON CONFLICT DO NOTHING` | 主键冲突时静默跳过，幂等兜底 |
| 条件 UPDATE 原子性 | `UPDATE WHERE status=?` 是原子的 |
| 事务边界 | Postgres 函数内自动事务，失败全回滚 |

---

## 扩展阅读

- Stripe 官方：https://stripe.com/docs/webhooks/best-practices
- PostgreSQL row locking：https://www.postgresql.org/docs/current/explicit-locking.html
- 《Designing Data-Intensive Applications》Ch 7 事务
