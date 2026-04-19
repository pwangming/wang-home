export function useAuthCallback({ api, authStore, router, message }) {
  async function handleCallback() {
    const hash = window.location.hash
    if (!hash.includes('type=signup')) return

    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken) return

    try {
      const result = await api.auth.callback(accessToken, refreshToken)
      authStore.user = result.user
      authStore._startHeartbeat()
      history.replaceState(null, '', window.location.pathname)
      message.success('邮箱验证成功！欢迎加入')
    } catch {
      history.replaceState(null, '', window.location.pathname)
      message.error('邮箱验证失败，请重试登录')
      router.push('/login')
    }
  }

  return { handleCallback }
}
