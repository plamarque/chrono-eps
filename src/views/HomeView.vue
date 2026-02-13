<script setup>
import { ref } from 'vue'
import Card from 'primevue/card'
import Chronometre from '../components/Chronometre.vue'
import TableauPassages from '../components/TableauPassages.vue'
import { useChronometre } from '../composables/useChronometre.js'

const participants = ref([])
const {
  elapsedMs,
  status,
  participantStates,
  passagesByParticipant,
  start,
  stop,
  reset,
  startParticipant,
  stopParticipant,
  recordPassage
} = useChronometre(participants)

function addParticipant(participant) {
  if (participants.value.length === 0) {
    const next = { ...passagesByParticipant.value }
    delete next['__solo__']
    passagesByParticipant.value = next
  }
  participants.value.push(participant)
}

function updateParticipant(updated) {
  const idx = participants.value.findIndex((p) => p.id === updated.id)
  if (idx >= 0) {
    participants.value[idx] = { ...updated }
  }
}

function removeParticipant(participant) {
  participants.value = participants.value.filter((p) => p.id !== participant.id)
  const next = { ...passagesByParticipant.value }
  delete next[participant.id]
  passagesByParticipant.value = next
}
</script>

<template>
  <div class="home">
    <Card class="home-card">
      <template #content>
        <section class="home-section home-section-chrono" aria-labelledby="chrono-heading">
          <h2 id="chrono-heading" class="sr-only">Chronomètre</h2>
          <Chronometre
            :elapsed-ms="elapsedMs"
            :status="status"
            :show-tour="participants.length === 0"
            @start="start"
            @stop="stop"
            @reset="reset"
            @record-tour="() => recordPassage('__solo__')"
          />
        </section>
        <section class="home-section" aria-label="Passages">
          <TableauPassages
            :participants="participants"
            :participant-states="participantStates"
            :passages-by-participant="passagesByParticipant"
            :status="status"
            @add="addParticipant"
            @update="updateParticipant"
            @remove="removeParticipant"
            @record="recordPassage"
            @start-participant="startParticipant"
            @stop-participant="stopParticipant"
          />
        </section>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100%;
}

.home-card {
  width: 100%;
  flex: 1;
}

.home-section {
  margin-bottom: 1.5rem;
}

.home-section-chrono {
  padding-top: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
