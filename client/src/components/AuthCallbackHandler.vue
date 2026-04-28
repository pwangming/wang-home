<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useAuthCallback } from '../composables/useAuthCallback.js'
import { api } from '../lib/api.js'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()
const { handleCallback } = useAuthCallback({ api, authStore, router, message })

onMounted(() => {
  handleCallback()
})
</script>

<template>
  <span style="display: none;" aria-hidden="true" />
</template>
