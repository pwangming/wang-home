export function useAuthCallback({ api, authStore, router, message }) {
  async function handleCallback() {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))
    const queryParams = new URLSearchParams(window.location.search)
    const type = params.get('type') || queryParams.get('type')
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const supportedTypes = ['signup', 'email_change', 'recovery']

    if (!accessToken || !supportedTypes.includes(type)) return
    if (type === 'recovery' && window.location.pathname === '/reset-password') return

    try {
      const result = await api.auth.callback(accessToken, refreshToken)
      authStore.user = result.user
      authStore._startHeartbeat()
      history.replaceState(null, '', window.location.pathname)
      const successMessage = {
        signup: '邮箱验证成功！欢迎加入',
        email_change: '邮箱已更新为新地址',
        recovery: '已登录，请尽快修改密码'
      }[type]
      message.success(successMessage)

      if (type === 'recovery') {
        router.push('/reset-password?step=set-new')
      }
    } catch {
      history.replaceState(null, '', window.location.pathname)
      message.error('邮箱链接验证失败，请重试')
      router.push('/login')
    }
  }

  return { handleCallback }
}
