<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <AuthCallbackHandler />
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { darkTheme } from 'naive-ui'
import AuthCallbackHandler from './components/AuthCallbackHandler.vue'
</script>
