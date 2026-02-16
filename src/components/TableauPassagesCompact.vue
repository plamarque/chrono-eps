<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { createParticipant, COULEURS_PALETTE } from '../models/participant.js'
import { formatTime } from '../utils/formatTime.js'

const MAX_PARTICIPANTS = 20

const props = defineProps({
  participants: {
    type: Array,
    default: () => []
  },
  participantStates: {
    type: Object,
    default: () => ({})
  },
  passagesByParticipant: {
    type: Object,
    default: () => ({})
  },
  status: {
    type: String,
    default: 'idle'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  hideFinished: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['add', 'update', 'remove', 'record', 'start-participant', 'stop-participant'])

const showParticipantModal = ref(false)
const editedParticipant = ref(null)
const modalNom = ref('')
const modalColor = ref(COULEURS_PALETTE[0])

const displayParticipants = computed(() => {
  if (props.participants.length === 0) {
    return [{ id: '__solo__', nom: 'Course', color: '#64748b' }]
  }
  return props.participants
})

const isSoloMode = computed(() => props.participants.length === 0)

const gridParticipants = computed(() => {
  if (props.readOnly || !props.hideFinished) {
    return displayParticipants.value
  }
  // Masquer uniquement les participants explicitement arrêtés (paused)
  return displayParticipants.value.filter(
    (p) => props.participantStates[p.id]?.status !== 'paused'
  )
})

const performancesByParticipant = computed(() => {
  if (props.participants.length === 0) return []
  return props.participants.map((p) => {
    const passages = (props.passagesByParticipant[p.id] ?? [])
      .slice()
      .sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
    const nbTours = passages.length
    const dernierTotalMs = nbTours > 0 ? passages[nbTours - 1].totalMs : null
    const passagesList = passages.map((pass, i) => ({
      label: `P${i + 1}`,
      lapMs: pass.lapMs
    }))
    return { participant: p, nbTours, dernierTotalMs, passagesList }
  })
})

const hasAnyPassage = computed(() =>
  performancesByParticipant.value.some((perf) => perf.nbTours > 0)
)

function nextParticipantIndex() {
  let max = 0
  for (const p of props.participants) {
    const m = p.nom?.match(/^Elève (\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max + 1
}

function addParticipant() {
  const participant = createParticipant(nextParticipantIndex())
  emit('add', participant)
}

function openParticipantModal(participant) {
  editedParticipant.value = participant
  modalNom.value = participant.nom
  modalColor.value = participant.color ?? COULEURS_PALETTE[0]
  showParticipantModal.value = true
}

function closeParticipantModal() {
  showParticipantModal.value = false
  editedParticipant.value = null
}

function saveParticipant() {
  if (!editedParticipant.value) return
  const nom = modalNom.value?.trim()
  if (!nom) return
  emit('update', {
    ...editedParticipant.value,
    nom,
    color: modalColor.value
  })
  closeParticipantModal()
}

function deleteParticipant() {
  if (!editedParticipant.value) return
  emit('remove', editedParticipant.value)
  closeParticipantModal()
}

function isNextTour(participantId, tourNum) {
  const passages = props.passagesByParticipant[participantId] ?? []
  return passages.length + 1 === tourNum
}

function isParticipantRunning(participantId) {
  return props.participantStates[participantId]?.status === 'running'
}

function canTap(participantId) {
  if (props.readOnly) return false
  const passages = props.passagesByParticipant[participantId] ?? []
  const nextTourNum = passages.length + 1
  return isParticipantRunning(participantId) && isNextTour(participantId, nextTourNum)
}

function onTap(participantId) {
  emit('record', participantId)
}

function toggleParticipant(participant) {
  const s = props.participantStates[participant.id]
  if (s?.status === 'running') {
    emit('stop-participant', participant.id)
  } else {
    emit('start-participant', participant.id)
  }
}
</script>

<template>
  <div class="tableau-passages-compact">
    <div
      v-if="!readOnly && participants.length < MAX_PARTICIPANTS"
      class="tableau-passages-compact-header"
    >
      <Button
        label="Ajouter"
        icon="pi pi-plus"
        severity="primary"
        class="participant-btn"
        aria-label="Ajouter un participant"
        @click="addParticipant"
      />
    </div>

    <!-- Grille des coureurs : nom + stop/start + passage -->
    <div v-if="gridParticipants.length > 0" class="tableau-passages-compact-grid">
      <div
        v-for="p in gridParticipants"
        :key="p.id"
        class="tableau-passages-compact-card"
        :class="{
          'tableau-passages-compact-card-tappable': canTap(p.id),
          'tableau-passages-compact-card-running': isParticipantRunning(p.id)
        }"
        :style="{
          borderLeftColor: p.color ?? '#94a3b8'
        }"
      >
        <div
          class="tableau-passages-compact-card-name"
          :class="{ 'tableau-passages-compact-card-name-clickable': !readOnly && !isSoloMode }"
          role="button"
          tabindex="0"
          :aria-label="!readOnly && !isSoloMode ? `Modifier ${p.nom}` : undefined"
          @click="!readOnly && !isSoloMode && openParticipantModal(p)"
          @keydown.enter="!readOnly && !isSoloMode && openParticipantModal(p)"
          @keydown.space.prevent="!readOnly && !isSoloMode && openParticipantModal(p)"
        >
          {{ p.nom }}
        </div>
        <div v-if="!readOnly" class="tableau-passages-compact-card-actions">
          <Button
            :icon="isParticipantRunning(p.id) ? 'pi pi-stop' : 'pi pi-play'"
            :severity="isParticipantRunning(p.id) ? 'danger' : 'success'"
            :aria-label="isParticipantRunning(p.id) ? `Arrêter ${p.nom}` : `Démarrer ${p.nom}`"
            class="tableau-passages-compact-card-btn"
            @click.stop="toggleParticipant(p)"
          />
          <Button
            v-if="canTap(p.id)"
            icon="pi pi-flag"
            severity="secondary"
            aria-label="Marquer passage"
            class="tableau-passages-compact-card-btn"
            @click.stop="onTap(p.id)"
          />
        </div>
      </div>
    </div>

    <!-- Section Temps (en dessous, scrollable) -->
    <section
      v-if="!isSoloMode && hasAnyPassage"
      class="tableau-passages-compact-resume"
      aria-label="Performances par participant"
    >
      <h3 class="tableau-passages-compact-resume-title">Temps</h3>
      <div class="tableau-passages-compact-resume-grid">
        <div
          v-for="perf in performancesByParticipant"
          :key="perf.participant.id"
          class="tableau-passages-compact-resume-card"
          :style="{ borderLeftColor: perf.participant.color ?? '#94a3b8' }"
        >
          <div class="tableau-passages-compact-resume-header">
            <span class="tableau-passages-compact-resume-nom">{{ perf.participant.nom }}</span>
            <span class="tableau-passages-compact-resume-stats">
              {{ perf.nbTours }} tour{{ perf.nbTours > 1 ? 's' : '' }}
              <template v-if="perf.dernierTotalMs !== null">
                · {{ formatTime(perf.dernierTotalMs) }}
              </template>
            </span>
          </div>
          <div
            v-for="item in perf.passagesList"
            :key="item.label"
            class="tableau-passages-compact-resume-passage"
          >
            <span class="tableau-passages-compact-resume-passage-nom">{{ item.label }}</span>
            <span class="tableau-passages-compact-resume-passage-time">{{
              formatTime(item.lapMs)
            }}</span>
          </div>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="showParticipantModal"
      :header="editedParticipant ? `Modifier ${editedParticipant.nom}` : 'Participant'"
      modal
      :style="{ width: 'min(90vw, 22rem)' }"
      @hide="closeParticipantModal"
    >
      <div v-if="editedParticipant" class="participant-modal-form">
        <div class="participant-modal-field">
          <label for="participant-nom-modal-compact">Nom</label>
          <InputText
            id="participant-nom-modal-compact"
            v-model="modalNom"
            class="participant-modal-input"
          />
        </div>
        <div class="participant-modal-field">
          <label>Couleur</label>
          <div class="participant-modal-colors">
            <button
              v-for="c in COULEURS_PALETTE"
              :key="c"
              type="button"
              class="participant-modal-color-btn"
              :class="{ active: modalColor === c }"
              :style="{ backgroundColor: c }"
              :aria-label="`Couleur ${c}`"
              @click="modalColor = c"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <Button
          label="Supprimer"
          severity="danger"
          icon="pi pi-trash"
          class="participant-btn"
          @click="deleteParticipant"
        />
        <Button
          label="Enregistrer"
          severity="primary"
          class="participant-btn"
          @click="saveParticipant"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.tableau-passages-compact {
  width: 100%;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.tableau-passages-compact-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.participant-btn {
  min-height: 44px;
  min-width: 44px;
}

.tableau-passages-compact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tableau-passages-compact-card {
  min-height: 52px;
  padding: 0.35rem 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  border-radius: var(--p-border-radius, 6px);
  border-left: 4px solid #94a3b8;
  background: #f8fafc;
  transition: background-color 0.15s;
}

.tableau-passages-compact-card-running {
  background: #eff6ff;
}

.tableau-passages-compact-card-tappable {
  background: #dbeafe;
}

.tableau-passages-compact-card-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tableau-passages-compact-card-name-clickable {
  cursor: pointer;
}

.tableau-passages-compact-card-name-clickable:hover {
  text-decoration: underline;
}

.tableau-passages-compact-card-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.tableau-passages-compact-card-btn {
  min-height: 36px;
  min-width: 36px;
}

.tableau-passages-compact-resume {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.tableau-passages-compact-resume-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem;
}

.tableau-passages-compact-resume-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tableau-passages-compact-resume-card {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: var(--p-border-radius, 6px);
  border-left: 4px solid #94a3b8;
}

.tableau-passages-compact-resume-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}

.tableau-passages-compact-resume-nom {
  font-weight: 600;
  color: #1a1a1a;
}

.tableau-passages-compact-resume-stats {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

.tableau-passages-compact-resume-passage {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding-left: 0.5rem;
  border-left: 2px solid #e5e7eb;
}

.tableau-passages-compact-resume-passage-nom {
  font-weight: 500;
  color: #374151;
}

.tableau-passages-compact-resume-passage-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #6b7280;
}

.participant-modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.participant-modal-field label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.participant-modal-input {
  width: 100%;
  min-height: 44px;
}

.participant-modal-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.participant-modal-color-btn {
  width: 36px;
  height: 36px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}

.participant-modal-color-btn.active {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1a1a1a;
}
</style>
