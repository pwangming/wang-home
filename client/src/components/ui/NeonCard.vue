<template>
  <div class="neon-card" :class="{ 'neon-card--glow': glow }">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  glow: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.neon-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  padding: 32px;
}

.neon-card--glow {
  box-shadow: 0 0 30px var(--neon-green-glow);
}
</style>
