<template>
  <div class="snake-game">
    <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" @keydown="handleKeyDown" tabindex="0"></canvas>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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

const emit = defineEmits(['gameOver'])

// Canvas setup
const canvasRef = ref(null)
const canvasWidth = 400
const canvasHeight = 400
const gridSize = 20

// Game state
const snake = ref([])
const food = ref({ x: 0, y: 0 })
const direction = ref('right')
const score = ref(0)
const gameLoopId = ref(null)
const isGameRunning = ref(false)

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
  const startX = Math.floor(canvasWidth / gridSize / 2) * gridSize
  const startY = Math.floor(canvasHeight / gridSize / 2) * gridSize
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
  const maxX = Math.floor(canvasWidth / gridSize)
  const maxY = Math.floor(canvasHeight / gridSize)
  let newFood
  do {
    newFood = {
      x: Math.floor(Math.random() * maxX) * gridSize,
      y: Math.floor(Math.random() * maxY) * gridSize
    }
  } while (snake.value.some(segment => segment.x === newFood.x && segment.y === newFood.y))
  food.value = newFood
}

// Draw game on canvas
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw grid (subtle)
  ctx.strokeStyle = '#2a2a4e'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
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

// Game tick
function tick() {
  if (!isGameRunning.value) return

  // Calculate new head position
  const head = { ...snake.value[0] }
  switch (direction.value) {
    case 'up': head.y -= gridSize; break
    case 'down': head.y += gridSize; break
    case 'left': head.x -= gridSize; break
    case 'right': head.x += gridSize; break
  }

  // Check wall collision
  if (head.x < 0 || head.x >= canvasWidth || head.y < 0 || head.y >= canvasHeight) {
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
    case 'Escape':
      stopGame()
      break
  }
}

// Expose methods for parent component
defineExpose({
  startGame,
  stopGame
})

// Watch for speed changes during game
watch(() => props.speedMultiplier, () => {
  if (isGameRunning.value) {
    clearInterval(gameLoopId.value)
    gameLoopId.value = setInterval(tick, gameSpeed.value)
  }
})

onMounted(() => {
  if (canvasRef.value) {
    canvasRef.value.focus()
  }
})

onUnmounted(() => {
  if (gameLoopId.value) {
    clearInterval(gameLoopId.value)
  }
})
</script>

<style scoped>
.snake-game {
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
</style>
