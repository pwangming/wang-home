<template>
  <div ref="containerRef" class="snake-game">
    <canvas
      ref="canvasRef"
      :width="canvasSize"
      :height="canvasSize"
      @keydown="handleKeyDown"
      tabindex="0"
    />
    <div v-if="isPaused" class="pause-overlay">
      <div class="pause-text">已暂停</div>
      <div class="pause-hint">按 P 继续</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  speedMultiplier: {
    type: Number,
    default: 1.0
  },
  scoreMultiplier: {
    type: Number,
    default: 1.0
  }
})

const emit = defineEmits(['gameOver', 'eatFood', 'scoreUpdate'])

// Canvas setup
const canvasRef = ref(null)
const containerRef = ref(null)
const canvasSize = ref(400)
const gridSize = 20
let resizeObserver = null

function updateCanvasSize() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const size = Math.min(rect.width, rect.height)
  // Snap to grid for clean rendering
  canvasSize.value = Math.floor(size / gridSize) * gridSize || 400
}

// Game state
const snake = ref([])
const food = ref({ x: 0, y: 0 })
const direction = ref('right')
const score = ref(0)
const gameLoopId = ref(null)
const isGameRunning = ref(false)
const isPaused = ref(false)

// Base game speed (ms per tick)
const baseSpeed = 150

// Computed game speed based on multiplier
const gameSpeed = computed(() => {
  return baseSpeed / props.speedMultiplier
})

// Direction opposites to prevent 180-degree turns
const opposites = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
}

// Initialize game
function initGame() {
  const startX = Math.floor(canvasSize.value / gridSize / 2) * gridSize
  const startY = Math.floor(canvasSize.value / gridSize / 2) * gridSize
  snake.value = [
    { x: startX, y: startY },
    { x: startX - gridSize, y: startY },
    { x: startX - gridSize * 2, y: startY }
  ]
  direction.value = 'right'
  score.value = 0
  placeFood()
}

// Place food at random position
function placeFood() {
  const maxCells = Math.floor(canvasSize.value / gridSize)
  let newFood
  do {
    newFood = {
      x: Math.floor(Math.random() * maxCells) * gridSize,
      y: Math.floor(Math.random() * maxCells) * gridSize
    }
  } while (snake.value.some(segment => segment.x === newFood.x && segment.y === newFood.y))
  food.value = newFood
}

// Draw game on canvas
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  const size = canvasSize.value

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, size, size)

  // Draw grid (subtle)
  ctx.strokeStyle = '#2a2a4e'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= size; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
  for (let y = 0; y <= size; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }

  // Draw food (glowing effect)
  const foodGradient = ctx.createRadialGradient(
    food.value.x + gridSize / 2,
    food.value.y + gridSize / 2,
    0,
    food.value.x + gridSize / 2,
    food.value.y + gridSize / 2,
    gridSize / 2
  )
  foodGradient.addColorStop(0, '#ff6b6b')
  foodGradient.addColorStop(1, '#c92a2a')
  ctx.fillStyle = foodGradient
  ctx.beginPath()
  ctx.arc(food.value.x + gridSize / 2, food.value.y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2)
  ctx.fill()

  // Draw snake
  snake.value.forEach((segment, index) => {
    const isHead = index === 0
    const brightness = 1 - (index / snake.value.length) * 0.5
    const g = Math.floor(200 * brightness)
    const r = Math.floor(100 * brightness)

    if (isHead) {
      // Head with glow
      ctx.shadowColor = '#4ade80'
      ctx.shadowBlur = 10
      ctx.fillStyle = '#4ade80'
    } else {
      ctx.shadowBlur = 0
      ctx.fillStyle = `rgb(${r}, ${g}, 80)`
    }

    ctx.beginPath()
    ctx.roundRect(segment.x + 1, segment.y + 1, gridSize - 2, gridSize - 2, 4)
    ctx.fill()
    ctx.shadowBlur = 0
  })

  // Draw score
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px monospace'
  ctx.fillText(`分数: ${score.value}`, 10, 25)
}

// Toggle pause
function togglePause() {
  if (!isGameRunning.value) return
  isPaused.value = !isPaused.value
}

// Game tick
function tick() {
  if (!isGameRunning.value || isPaused.value) return

  // Calculate new head position
  const head = { ...snake.value[0] }
  switch (direction.value) {
    case 'up': head.y -= gridSize; break
    case 'down': head.y += gridSize; break
    case 'left': head.x -= gridSize; break
    case 'right': head.x += gridSize; break
  }

  // Check wall collision
  if (head.x < 0 || head.x >= canvasSize.value || head.y < 0 || head.y >= canvasSize.value) {
    handleGameOver()
    return
  }

  // Check self collision
  if (snake.value.some(segment => segment.x === head.x && segment.y === head.y)) {
    handleSelfCollision()
    return
  }

  // Add new head
  snake.value.unshift(head)

  // Check food collision
  if (head.x === food.value.x && head.y === food.value.y) {
    handleEatFood()
  } else {
    // Remove tail if no food eaten
    snake.value.pop()
  }

  draw()
}

// Handle eating food
function handleEatFood() {
  score.value += Math.round(1 * props.scoreMultiplier)
  emit('eatFood')
  placeFood()
}

// Handle wall collision
function handleWallCollision() {
  handleGameOver()
}

// Handle self collision
function handleSelfCollision() {
  handleGameOver()
}

// Handle game over
function handleGameOver() {
  isGameRunning.value = false
  if (gameLoopId.value) {
    clearInterval(gameLoopId.value)
    gameLoopId.value = null
  }
  emit('gameOver', score.value, props.speedMultiplier, props.scoreMultiplier)
}

// Start game
function startGame() {
  initGame()
  isGameRunning.value = true
  isPaused.value = false
  draw()
  gameLoopId.value = setInterval(tick, gameSpeed.value)
}

// Stop game
function stopGame() {
  handleGameOver()
}

// Handle keyboard input
function handleKeyDown(e) {
  const keyToDirection = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  }

  const nextDirection = keyToDirection[e.key]
  if (nextDirection) {
    // Prevent instant 180-degree turns.
    if (nextDirection !== opposites[direction.value]) {
      direction.value = nextDirection
    }
    return
  }

  switch (e.key) {
    case 'p':
    case 'P':
      togglePause()
      break
    case 'Escape':
      stopGame()
      break
  }
}

// Expose methods for parent component
defineExpose({
  startGame,
  stopGame,
  togglePause
})

// Watch for score changes and emit to parent
watch(score, (v) => emit('scoreUpdate', v))

// Watch for speed changes during game
watch(() => props.speedMultiplier, () => {
  if (isGameRunning.value) {
    clearInterval(gameLoopId.value)
    gameLoopId.value = setInterval(tick, gameSpeed.value)
  }
})

onMounted(async () => {
  await nextTick()
  updateCanvasSize()

  resizeObserver = new ResizeObserver(() => {
    updateCanvasSize()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }

  if (canvasRef.value) {
    canvasRef.value.focus()
  }
})

onUnmounted(() => {
  if (gameLoopId.value) {
    clearInterval(gameLoopId.value)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})
</script>

<style scoped>
.snake-game {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  outline: none;
  border: 2px solid #4ade80;
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

.pause-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.75);
  border-radius: 4px;
  gap: 8px;
}

.pause-text {
  font-size: clamp(24px, 3vw, 40px);
  font-weight: bold;
  color: #4ade80;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.8);
}

.pause-hint {
  font-size: clamp(13px, 1.2vw, 16px);
  color: rgba(255, 255, 255, 0.6);
}
</style>
