<script setup>
import { ref, computed, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { formatTime } from '../utils/formatTime.js'

const elapsedMs = ref(0)
const status = ref('idle') // idle | running | paused
const passages = ref([]) // { tourNum, lapMs, totalMs }[]
let animationFrameId = null
let startTime = 0
let elapsedBeforePause = 0

const displayedTime = computed(() => formatTime(elapsedMs.value))

function tick() {
  if (status.value !== 'running') return
  elapsedMs.value = elapsedBeforePause + (performance.now() - startTime)
  animationFrameId = requestAnimationFrame(tick)
}

function start() {
  if (status.value === 'running') return
  if (status.value === 'idle') {
    elapsedBeforePause = 0
    startTime = performance.now()
  } else {
    startTime = performance.now()
  }
  status.value = 'running'
  tick()
}

function stop() {
  if (status.value !== 'running') return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = null
  elapsedBeforePause = elapsedMs.value
  status.value = 'paused'
}

function reset() {
  if (status.value === 'running') return
  cancelAnimationFrame(animationFrameId)
  animationFrameId = null
  elapsedMs.value = 0
  elapsedBeforePause = 0
  passages.value = []
  status.value = 'idle'
}

function recordTour() {
  if (status.value !== 'running') return
  const totalMs = elapsedMs.value
  const lastTotal = passages.value.length > 0
    ? passages.value[passages.value.length - 1].totalMs
    : 0
  const lapMs = totalMs - lastTotal
  passages.value.push({
    tourNum: passages.value.length + 1,
    lapMs,
    totalMs
  })
}

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <div class="chronometre">
    <div
      class="chronometre-display"
      role="timer"
      aria-live="polite"
      aria-label="Temps écoulé"
    >
      {{ displayedTime }}
    </div>
    <div class="chronometre-controls">
      <Button
        v-if="status === 'idle' || status === 'paused'"
        label="Démarrer"
        icon="pi pi-play"
        severity="success"
        @click="start"
        class="chronometre-btn"
      />
      <Button
        v-if="status === 'running'"
        label="Tour"
        icon="pi pi-flag"
        severity="info"
        @click="recordTour"
        class="chronometre-btn"
      />
      <Button
        v-if="status === 'running'"
        label="Arrêter"
        icon="pi pi-stop"
        severity="danger"
        @click="stop"
        class="chronometre-btn"
      />
      <Button
        v-if="status === 'paused'"
        label="Réinitialiser"
        icon="pi pi-refresh"
        severity="secondary"
        @click="reset"
        class="chronometre-btn"
      />
    </div>
    <div v-if="passages.length > 0" class="chronometre-passages">
      <div
        v-for="p in passages"
        :key="p.tourNum"
        class="chronometre-passage"
      >
        <span class="passage-tour">Tour {{ p.tourNum }}</span>
        <span class="passage-lap">{{ formatTime(p.lapMs) }}</span>
        <span class="passage-total">{{ formatTime(p.totalMs) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chronometre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.chronometre-display {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
  font-size: clamp(3rem, 10vw, 4rem);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.05em;
  color: var(--p-text-color, #1f2937);
}

.chronometre-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.chronometre-btn {
  min-height: 44px;
  min-width: 44px;
}

.chronometre-passages {
  width: 100%;
  max-width: 24rem;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chronometre-passage {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
  font-size: 0.95rem;
}

.passage-tour {
  font-weight: 600;
  color: var(--p-text-color, #1f2937);
}

.passage-lap,
.passage-total {
  color: var(--p-text-muted-color, #6b7280);
}

.passage-total {
  font-weight: 500;
}
</style>
