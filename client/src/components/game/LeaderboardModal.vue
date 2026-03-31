<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    :mask-closable="true"
    preset="card"
    class="leaderboard-modal"
    :style="{ width: '672px' }"
  >
    <template #header>
      <div class="modal-header">
        <h2 class="modal-title">排行榜</h2>
        <button class="close-btn" @click="$emit('update:show', false)">✕</button>
      </div>
    </template>

    <div class="leaderboard-content">
      <!-- Tab 切换 -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          全部
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          我的排名
        </button>
      </div>

      <!-- 表格 -->
      <div class="leaderboard-table">
        <!-- 表头 -->
        <div class="table-header">
          <div class="col-rank">排名</div>
          <div class="col-player">玩家</div>
          <div class="col-score">分数</div>
          <div class="col-time">用时</div>
        </div>

        <!-- 排名列表 -->
        <div class="table-body">
          <div
            v-for="(entry, index) in displayEntries"
            :key="entry.id"
            class="table-row"
            :class="[`rank-${entry.rank}`, { highlight: entry.isMine }]"
          >
            <div class="col-rank">
              <span v-if="entry.rank === 1" class="rank-icon">👑</span>
              <span v-else-if="entry.rank === 2" class="rank-icon">🥈</span>
              <span v-else-if="entry.rank === 3" class="rank-icon">🥉</span>
              <span v-else class="rank-num">{{ entry.rank }}</span>
            </div>
            <div class="col-player">
              <img v-if="entry.avatar" :src="entry.avatar" class="player-avatar" />
              <span class="player-name">{{ entry.name }}</span>
            </div>
            <div class="col-score">{{ entry.score.toLocaleString() }}</div>
            <div class="col-time">{{ formatTime(entry.duration) }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <NeonButton type="default" @click="$emit('update:show', false)">
          收起
        </NeonButton>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NModal } from 'naive-ui'
import NeonButton from '../ui/NeonButton.vue'
import { api } from '../../lib/api.js'

const props = defineProps({
  show: Boolean
})

defineEmits(['update:show'])

const activeTab = ref('all')
const entries = ref([])
const myRank = ref(null)

const displayEntries = computed(() => {
  if (activeTab.value === 'mine' && myRank.value) {
    return [myRank.value]
  }
  return entries.value
})

function formatTime(seconds) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

async function fetchLeaderboard() {
  try {
    const data = await api.leaderboard.getLeaderboard()
    entries.value = data.entries || []
    myRank.value = data.myRank || null
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchLeaderboard()
  }
})
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 20px;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
}

.leaderboard-content {
  padding: 16px 0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.tab {
  padding: 8px 24px;
  background: none;
  border: 1px solid var(--card-border);
  border-radius: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: var(--neon-green);
  color: #000;
  border-color: var(--neon-green);
}

/* Table */
.leaderboard-table {
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: 12px 24px;
  background: var(--input-bg);
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.table-row {
  display: flex;
  padding: 16px 24px;
  border-top: 1px solid var(--card-border);
  align-items: center;
}

/* Alternating row backgrounds for rows beyond top 3 */
.table-row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.02);
}

.table-row:nth-child(even) {
  background: transparent;
}

/* Top 3 ranks use special colors (overrides alternating) */
.rank-1 {
  background: rgba(255, 215, 0, 0.1) !important;
}

.rank-2 {
  background: rgba(192, 192, 192, 0.1) !important;
}

.rank-3 {
  background: rgba(205, 127, 50, 0.1) !important;
}

.table-row.highlight {
  background: rgba(74, 222, 128, 0.1) !important;
}

.col-rank {
  width: 60px;
  font-weight: bold;
}

.col-player {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.col-score {
  width: 120px;
  text-align: right;
  font-weight: bold;
  color: var(--neon-green);
}

.col-time {
  width: 80px;
  text-align: right;
  color: var(--text-secondary);
}

.rank-icon {
  font-size: 20px;
}

.rank-num {
  color: var(--text-secondary);
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.player-name {
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  justify-content: center;
}
</style>
