<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Slider from 'primevue/slider'
import { loadCourse } from '../services/courseStore.js'
import { formatTime } from '../utils/formatTime.js'
import { formatCourseDate } from '../utils/formatDate.js'
import { useToast } from 'primevue/usetoast'
import { useReplay, getPositionAtTime, getCurrentRunnerIndexAtTime } from '../composables/useReplay.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const course = ref(null)
const loading = ref(true)

const { currentMs, isPlaying, maxTotalMs, togglePlay, seek, reset } = useReplay(course, { speedMultiplier: 1 })

async function fetchCourse() {
  loading.value = true
  course.value = null
  const id = route.params.id
  if (!id) {
    router.replace('/historique')
    loading.value = false
    return
  }
  try {
    const data = await loadCourse(id)
    if (!data) {
      toast.add({ severity: 'warn', summary: 'Course introuvable', detail: 'Elle a peut-être été supprimée.', life: 3000 })
      router.replace('/historique')
      return
    }
    course.value = data
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de charger.', life: 5000 })
    router.replace('/historique')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'course-detail', params: { id: route.params.id } })
}

const participants = computed(() => course.value?.participants ?? [])
const mode = computed(() => course.value?.mode ?? 'individual')
const groupStudents = computed(() => course.value?.groupStudents ?? {})

const trackSize = { width: 320, height: 200 }
const centerX = trackSize.width / 2
const centerY = trackSize.height / 2
const rx = 140
const ry = 85

function positionToAngle(position) {
  const frac = position % 1
  if (frac < 0) return (1 + frac) * Math.PI * 2
  return (1 - frac) * Math.PI * 2
}

function getMarkerCoords(participantId, participantIndex, totalParticipants) {
  const passages = course.value?.passagesByParticipant?.[participantId] ?? []
  const { position } = getPositionAtTime(passages, currentMs.value)
  const angle = positionToAngle(position)
  const laneOffset = totalParticipants > 1
    ? ((participantIndex / (totalParticipants - 1)) - 0.5) * 12
    : 0
  const r = rx + laneOffset
  const x = centerX + r * Math.cos(angle)
  const y = centerY + ry * Math.sin(angle)
  return { x, y, hasStarted: getPositionAtTime(passages, currentMs.value).hasStarted }
}

function getRunnerLabel(participantId) {
  if (mode.value !== 'relay') return null
  const passages = course.value?.passagesByParticipant?.[participantId] ?? []
  const students = groupStudents.value[participantId] ?? []
  const nbStudents = students.length || 1
  const idx = getCurrentRunnerIndexAtTime(passages, currentMs.value, nbStudents)
  const student = students[idx]
  return student?.nom ?? ''
}

const trackPath = computed(() => {
  const points = []
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2
    const x = centerX + rx * Math.cos(t)
    const y = centerY + ry * Math.sin(t)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M ${points.join(' L ')} Z`
})

onMounted(fetchCourse)
watch(() => route.params.id, fetchCourse)
</script>

<template>
  <div class="replay-view">
    <div v-if="loading" class="replay-loading">Chargement…</div>
    <Card v-else-if="course" class="replay-card">
      <template #title>
        <div class="replay-header">
          <Button
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            rounded
            aria-label="Retour"
            class="replay-back"
            @click="goBack"
          />
          <span class="replay-nom">{{ course.nom }} — Replay</span>
        </div>
      </template>
      <template #subtitle>
        <span class="replay-date">{{ formatCourseDate(course.createdAt) }}</span>
      </template>
      <template #content>
        <section class="replay-chrono" aria-label="Temps du replay">
          <div class="replay-chrono-display" role="timer" aria-live="polite">
            {{ formatTime(currentMs) }}
          </div>
        </section>

        <section class="replay-track-section" aria-label="Piste virtuelle">
          <div class="replay-track-container">
            <svg
              :viewBox="`0 0 ${trackSize.width} ${trackSize.height}`"
              class="replay-track-svg"
              aria-hidden="true"
            >
              <path
                :d="trackPath"
                class="replay-track-path"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              />
              <g
                v-for="(p, idx) in participants"
                :key="p.id"
              >
                <circle
                  v-if="getMarkerCoords(p.id, idx, participants.length).hasStarted"
                  :cx="getMarkerCoords(p.id, idx, participants.length).x"
                  :cy="getMarkerCoords(p.id, idx, participants.length).y"
                  r="14"
                  :fill="p.color ?? '#94a3b8'"
                  stroke="#333"
                  stroke-width="2"
                  class="replay-marker"
                />
                <circle
                  v-else
                  :cx="getMarkerCoords(p.id, idx, participants.length).x"
                  :cy="getMarkerCoords(p.id, idx, participants.length).y"
                  r="14"
                  fill="transparent"
                  stroke="rgba(0,0,0,0.2)"
                  stroke-width="2"
                  stroke-dasharray="4 4"
                  class="replay-marker"
                />
                <text
                  :x="getMarkerCoords(p.id, idx, participants.length).x"
                  :y="getMarkerCoords(p.id, idx, participants.length).y - 22"
                  text-anchor="middle"
                  class="replay-marker-label"
                  font-size="11"
                >
                  {{ mode === 'relay' ? (getRunnerLabel(p.id) || p.nom) : p.nom }}
                </text>
              </g>
            </svg>
          </div>
        </section>

        <section class="replay-controls" aria-label="Contrôles de lecture">
          <div class="replay-controls-row">
            <Button
              :icon="isPlaying ? 'pi pi-pause' : 'pi pi-play'"
              :aria-label="isPlaying ? 'Pause' : 'Lecture'"
              severity="primary"
              rounded
              class="replay-play-btn"
              @click="togglePlay"
            />
            <Slider
              :model-value="currentMs"
              :min="0"
              :max="maxTotalMs || 1"
              :step="100"
              class="replay-slider"
              @update:model-value="seek($event)"
            />
          </div>
          <div class="replay-controls-actions">
            <Button
              label="Réinitialiser"
              icon="pi pi-refresh"
              severity="secondary"
              size="small"
              @click="reset"
            />
            <Button
              label="Retour au détail"
              icon="pi pi-arrow-left"
              severity="secondary"
              size="small"
              @click="goBack"
            />
          </div>
        </section>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.replay-view {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100%;
}

.replay-loading {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color, #6b7280);
}

.replay-card {
  width: 100%;
  flex: 1;
}

.replay-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.replay-back {
  min-height: 44px;
  min-width: 44px;
}

.replay-nom {
  font-size: 1.1rem;
  font-weight: 600;
}

.replay-date {
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #6b7280);
}

.replay-chrono {
  text-align: center;
  margin-bottom: 1rem;
}

.replay-chrono-display {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--p-text-color, #1f2937);
}

.replay-track-section {
  margin-bottom: 1.5rem;
}

.replay-track-container {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding: 1rem;
  background: var(--p-surface-50, #f8fafc);
  border-radius: 0.5rem;
}

.replay-track-svg {
  width: 100%;
  height: auto;
  color: var(--p-surface-400, #94a3b8);
}

.replay-track-path {
  opacity: 0.8;
}

.replay-marker {
  transition: cx 0.05s ease-out, cy 0.05s ease-out;
}

.replay-marker-label {
  fill: var(--p-text-color, #1f2937);
  font-weight: 500;
  pointer-events: none;
}

.replay-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.replay-controls-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.replay-play-btn {
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
}

.replay-slider {
  flex: 1;
  min-width: 0;
}

.replay-controls-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.replay-controls-actions .p-button {
  min-height: 44px;
}
</style>
