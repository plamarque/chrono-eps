<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { formatTime } from '../utils/formatTime.js'

const props = defineProps({
  elapsedMs: { type: Number, default: 0 },
  status: { type: String, default: 'idle' },
  /** Mode individuel séquentiel : bouton drapeau pour enregistrer une arrivée (chrono en cours). */
  showArrival: { type: Boolean, default: false },
  isViewingLoadedCourse: { type: Boolean, default: false }
})

const emit = defineEmits(['start', 'stop', 'reset', 'record-arrival'])

const displayedTime = computed(() => formatTime(props.elapsedMs))
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
        v-if="!isViewingLoadedCourse && (status === 'idle' || status === 'paused')"
        label="Démarrer"
        icon="pi pi-play"
        severity="success"
        class="chronometre-btn"
        @click="emit('start')"
      />
      <Button
        v-if="!isViewingLoadedCourse && status === 'running' && showArrival"
        label="Arrivée"
        icon="pi pi-flag"
        severity="info"
        class="chronometre-btn"
        aria-label="Enregistrer une arrivée"
        @click="emit('record-arrival')"
      />
      <Button
        v-if="!isViewingLoadedCourse && status === 'running'"
        label="Arrêter"
        icon="pi pi-stop"
        severity="danger"
        @click="emit('stop')"
        class="chronometre-btn"
      />
      <Button
        v-if="isViewingLoadedCourse || status === 'paused'"
        :label="isViewingLoadedCourse ? 'Dupliquer' : 'Réinitialiser'"
        icon="pi pi-refresh"
        severity="secondary"
        class="chronometre-btn"
        @click="emit('reset')"
      />
      <slot name="extra-controls" />
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

.chronometre-controls :deep(.chronometre-btn) {
  min-height: 44px;
  min-width: 44px;
}
</style>
