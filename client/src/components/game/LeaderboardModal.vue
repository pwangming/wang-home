<template>
  <n-modal v-model:show="showInternal" :mask-closable="true" preset="card" title="排行榜" style="max-width: 500px; width: 90%;">
    <div v-if="isLoading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="realtimeError" class="realtime-error">
      {{ realtimeError }}
    </div>
    <div v-else class="leaderboard-content">
      <div v-if="myRank" class="my-rank">
        <span>你的排名: </span>
        <span class="rank-number">第 {{ myRank.rank }} 名</span>
        <span class="rank-score">{{ myRank.best_score }} 分</span>
      </div>
      <n-data-table :columns="columns" :data="leaderboard" :bordered="false" />
    </div>
  </n-modal>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { NModal, NDataTable, NTag } from 'naive-ui'
import { api } from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show'])

const showInternal = ref(props.show)
const isLoading = ref(false)
const error = ref('')
const realtimeError = ref('')
const leaderboard = ref([])
const myRank = ref(null)

let channel = null

const columns = [
  {
    title: '排名',
    key: 'rank',
    width: 60,
    render: (row, index) => index + 1
  },
  {
    title: '玩家',
    key: 'username'
  },
  {
    title: '最高分',
    key: 'best_score',
    sorter: (a, b) => a.best_score - b.best_score
  }
]

watch(() => props.show, (newVal) => {
  showInternal.value = newVal
  if (newVal) {
    fetchLeaderboard()
    subscribeToRealtime()
  } else {
    unsubscribe()
  }
})

watch(showInternal, (newVal) => {
  emit('update:show', newVal)
  if (!newVal) {
    unsubscribe()
  }
})

async function fetchLeaderboard() {
  isLoading.value = true
  error.value = ''
  try {
    const data = await api.leaderboard.list(1, 20)
    leaderboard.value = data.leaderboard || []
  } catch (err) {
    error.value = '加载排行榜失败'
    console.error('Failed to fetch leaderboard:', err)
  } finally {
    isLoading.value = false
  }
}

async function fetchMyRank() {
  try {
    const data = await api.leaderboard.getMyRank()
    myRank.value = data.rank
  } catch {
    myRank.value = null
  }
}

function subscribeToRealtime() {
  realtimeError.value = ''
  channel = supabase
    .channel('leaderboard-refresh')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'leaderboard_events'
      },
      () => {
        // Refetch leaderboard when new verified score is added
        fetchLeaderboard()
        fetchMyRank()
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        realtimeError.value = '排行榜实时更新已断开，请关闭后重新打开'
      }
    })
}

function unsubscribe() {
  if (channel) {
    channel.unsubscribe()
    channel = null
  }
  realtimeError.value = ''
}

onMounted(() => {
  if (props.show) {
    fetchLeaderboard()
    fetchMyRank()
    subscribeToRealtime()
  }
})

onUnmounted(() => {
  unsubscribe()
})
</script>

<style scoped>
.loading, .error {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.error {
  color: #f56c6c;
}

.realtime-error {
  padding: 12px;
  background: rgba(245, 108, 108, 0.1);
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 4px;
  color: #f56c6c;
  font-size: 14px;
  margin-bottom: 16px;
}

.leaderboard-content {
  min-height: 200px;
}

.my-rank {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
}

.rank-number {
  font-weight: bold;
  color: #4ade80;
}

.rank-score {
  margin-left: auto;
  color: #909399;
}
</style>
