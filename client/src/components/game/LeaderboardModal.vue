<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    :mask-closable="true"
    preset="card"
    class="leaderboard-modal"
    :style="{ width: modalWidth }"
  >
    <template #header>
      <div class="modal-header">
        <h2 class="modal-title">排行榜</h2>
        <button class="close-btn" @click="$emit('update:show', false)">✕</button>
      </div>
    </template>

    <div class="leaderboard-content">
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</button>
        <button class="tab" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">我的排名</button>
      </div>

      <div class="leaderboard-table">
        <div class="table-header">
          <div class="col-rank">排名</div>
          <div class="col-player">玩家</div>
          <div class="col-score">分数</div>
          <div class="col-time">时间</div>
        </div>

        <div class="table-body">
          <div
            v-for="entry in displayEntries"
            :key="entry.id"
            class="table-row"
            :class="[`rank-${entry.rank}`, { highlight: entry.isMine }]"
          >
            <div class="col-rank">
              <span v-if="entry.rank === 1" class="rank-icon">🥇</span>
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
        <NeonButton type="default" @click="$emit('update:show', false)">收起</NeonButton>
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
  if (activeTab.value === 'mine') {
    return myRank.value ? [myRank.value] : []
  }
  return entries.value
})

const modalWidth = computed(() => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth < 480) return '95vw'
    if (window.innerWidth < 768) return '90vw'
    if (window.innerWidth < 1024) return '80vw'
  }
  return 'min(672px, 90vw)'
})

function formatTime(seconds) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function normalizeLeaderboardRows(rows) {
  return rows.map((row, index) => ({
    id: row.user_id,
    rank: index + 1,
    name: row.username || '匿名玩家',
    avatar: row.avatar_url || null,
    score: row.best_score || 0,
    duration: null,
    isMine: false
  }))
}

function normalizeMyRankRow(row) {
  if (!row) return null
  return {
    id: row.user_id,
    rank: row.rank,
    name: row.username || '我',
    avatar: row.avatar_url || null,
    score: row.best_score || 0,
    duration: null,
    isMine: true
  }
}

async function fetchLeaderboard() {
  try {
    const [listData, myRankData] = await Promise.all([
      api.leaderboard.list(1, 20),
      api.leaderboard.getMyRank().catch(() => ({ rank: null }))
    ])

    entries.value = normalizeLeaderboardRows(listData?.leaderboard || [])
    myRank.value = normalizeMyRankRow(myRankData?.rank || null)
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err)
    entries.value = []
    myRank.value = null
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    fetchLeaderboard()
  }
})
</script>

<style scoped>
/* === 1920x1080 Baseline === */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: clamp(18px, 1.5vw, 22px);
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: clamp(16px, 1.2vw, 22px);
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
}

.close-btn:hover {
  color: var(--text-primary);
}

.leaderboard-content {
  padding: clamp(12px, 1.5vw, 20px) 0;
}

.tabs {
  display: flex;
  gap: clamp(6px, 0.8vw, 12px);
  margin-bottom: clamp(16px, 2vw, 28px);
}

.tab {
  padding: clamp(6px, 0.8vw, 10px) clamp(16px, 2vw, 28px);
  background: none;
  border: 1px solid var(--card-border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: clamp(12px, 0.9vw, 14px);
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: var(--neon-green);
  color: #000;
  border-color: var(--neon-green);
}

.tab:hover:not(.active) {
  border-color: var(--text-secondary);
}

.leaderboard-table {
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: clamp(10px, 1vw, 14px) clamp(12px, 1.5vw, 20px);
  background: var(--input-bg);
  font-size: clamp(10px, 0.75vw, 12px);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: clamp(0.5px, 0.05vw, 1px);
}

.table-row {
  display: flex;
  padding: clamp(12px, 1.2vw, 18px) clamp(12px, 1.5vw, 20px);
  border-top: 1px solid var(--card-border);
  align-items: center;
}

.table-row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.02);
}

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
  width: clamp(40px, 5vw, 60px);
  font-weight: bold;
}

.col-player {
  flex: 1;
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 14px);
  min-width: 0;
}

.col-score {
  width: clamp(80px, 10vw, 120px);
  text-align: right;
  font-weight: bold;
  color: var(--neon-green);
  font-size: clamp(13px, 0.9vw, 15px);
}

.col-time {
  width: clamp(60px, 7vw, 80px);
  text-align: right;
  color: var(--text-secondary);
  font-size: clamp(12px, 0.85vw, 14px);
}

.rank-icon {
  font-size: clamp(16px, 1.3vw, 22px);
}

.rank-num {
  color: var(--text-secondary);
  font-size: clamp(13px, 0.9vw, 15px);
}

.player-avatar {
  width: clamp(28px, 2.5vw, 36px);
  height: clamp(28px, 2.5vw, 36px);
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name {
  color: var(--text-primary);
  font-size: clamp(13px, 0.9vw, 15px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-footer {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .table-header,
  .table-row {
    padding-left: 12px;
    padding-right: 12px;
  }

  .col-rank {
    width: 40px;
  }

  .col-score {
    width: 80px;
    font-size: 13px;
  }

  .col-time {
    width: 60px;
    font-size: 12px;
  }

  .player-avatar {
    width: 28px;
    height: 28px;
  }

  .player-name {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .tabs {
    margin-bottom: 12px;
  }

  .tab {
    padding: 6px 16px;
    font-size: 12px;
  }

  .col-time {
    display: none;
  }

  .table-header .col-time,
  .table-row .col-time {
    display: none;
  }

  .table-header .col-score,
  .table-row .col-score {
    width: 70px;
    font-size: 13px;
  }
}
</style>
