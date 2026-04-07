export function ok(ctx, data = null, meta = null) {
  ctx.status = 200
  ctx.body = { success: true, data, ...(meta ? { meta } : {}) }
}

export function created(ctx, data = null) {
  ctx.status = 201
  ctx.body = { success: true, data }
}

export function fail(ctx, status, error) {
  ctx.status = status
  ctx.body = { success: false, error }
}
