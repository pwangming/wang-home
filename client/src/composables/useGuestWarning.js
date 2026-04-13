import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useGuestWarning() {
  const router = useRouter()
  const showGuestWarning = ref(false)
  const hasSeenGuestWarning = ref(false)

  function checkGuestWarning() {
    if (!hasSeenGuestWarning.value) {
      const seen = localStorage.getItem('guestWarningSeen')
      if (!seen) {
        showGuestWarning.value = true
      }
    }
  }

  function markGuestWarningSeen() {
    hasSeenGuestWarning.value = true
    localStorage.setItem('guestWarningSeen', 'true')
  }

  function continueAsGuest() {
    showGuestWarning.value = false
    markGuestWarningSeen()
  }

  function goToLogin() {
    showGuestWarning.value = false
    markGuestWarningSeen()
    router.push('/login')
  }

  return {
    showGuestWarning,
    hasSeenGuestWarning,
    checkGuestWarning,
    markGuestWarningSeen,
    continueAsGuest,
    goToLogin
  }
}
