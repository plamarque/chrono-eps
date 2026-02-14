<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { createParticipant, COULEURS_PALETTE } from '../models/participant.js'
import { formatTime } from '../utils/formatTime.js'

const MAX_PARTICIPANTS = 6

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

const maxTours = computed(() => {
  let max = 0
  for (const passages of Object.values(props.passagesByParticipant)) {
    if (Array.isArray(passages) && passages.length > max) {
      max = passages.length
    }
  }
  return Math.max(max + 1, 1)
})

const tourRows = computed(() =>
  Array.from({ length: maxTours.value }, (_, i) => i + 1)
)

const performancesByParticipant = computed(() => {
  if (props.participants.length === 0) return []
  return props.participants.map((p) => {
    const passages = props.passagesByParticipant[p.id] ?? []
    const nbTours = passages.length
    const dernierTotalMs = nbTours > 0 ? passages[nbTours - 1].totalMs : null
    return { participant: p, nbTours, dernierTotalMs }
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

function getPassage(participantId, tourNum) {
  const passages = props.passagesByParticipant[participantId] ?? []
  return passages.find((p) => p.tourNum === tourNum)
}

function isNextTour(participantId, tourNum) {
  const passages = props.passagesByParticipant[participantId] ?? []
  return passages.length + 1 === tourNum
}

function isParticipantRunning(participantId) {
  return props.participantStates[participantId]?.status === 'running'
}

function canTap(participantId, tourNum) {
  return !props.readOnly && isParticipantRunning(participantId) && isNextTour(participantId, tourNum)
}

function getLiveElapsed(participantId) {
  const s = props.participantStates[participantId]
  if (!s) return { lapMs: 0, totalMs: 0 }
  const totalMs = s.elapsedMs ?? 0
  const passages = props.passagesByParticipant[participantId] ?? []
  const lastTotal = passages.length > 0 ? passages[passages.length - 1].totalMs : 0
  const lapMs = totalMs - lastTotal
  return { lapMs, totalMs }
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
  <div class="tableau-passages">
    <div class="tableau-passages-header">
      <div class="tableau-passages-title">Passages</div>
      <Button
        v-if="!readOnly && participants.length < MAX_PARTICIPANTS"
        label="Ajouter"
        icon="pi pi-plus"
        severity="primary"
        class="participant-btn"
        aria-label="Ajouter un participant"
        @click="addParticipant"
      />
    </div>

    <div v-if="displayParticipants.length > 0" class="tableau-passages-scroll">
      <table class="tableau-passages-table">
        <thead>
          <tr>
            <th class="tableau-passages-th-tour">Tour</th>
            <th
              v-for="p in displayParticipants"
              :key="p.id"
              class="tableau-passages-th-participant"
              :class="{ 'tableau-passages-th-clickable': !readOnly }"
              :style="{
                backgroundColor: p.color ?? '#94a3b8',
                color: '#ffffff'
              }"
              :role="readOnly ? null : 'button'"
              :tabindex="readOnly ? -1 : 0"
              :aria-label="readOnly ? undefined : 'Modifier ou supprimer'"
              @click="!readOnly && openParticipantModal(p)"
              @keydown.enter="!readOnly && openParticipantModal(p)"
              @keydown.space.prevent="!readOnly && openParticipantModal(p)"
            >
              {{ p.nom }}
            </th>
          </tr>
          <tr v-if="!isSoloMode && !readOnly" class="tableau-passages-controls-row">
            <th class="tableau-passages-th-tour tableau-passages-controls-label"></th>
            <th
              v-for="p in displayParticipants"
              :key="p.id"
              class="tableau-passages-th-control"
            >
              <Button
                :icon="isParticipantRunning(p.id) ? 'pi pi-stop' : 'pi pi-play'"
                :severity="isParticipantRunning(p.id) ? 'danger' : 'success'"
                :aria-label="isParticipantRunning(p.id) ? 'Arrêter' : 'Démarrer'"
                class="participant-btn participant-control-btn"
                @click.stop="toggleParticipant(p)"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tourNum in tourRows" :key="tourNum">
            <td class="tableau-passages-td-tour">{{ tourNum }}</td>
            <td
              v-for="p in displayParticipants"
              :key="p.id"
              class="tableau-passages-td-cell"
              :class="{ 'tableau-passages-tappable': canTap(p.id, tourNum) }"
              @click="canTap(p.id, tourNum) ? onTap(p.id) : null"
            >
              <template v-if="getPassage(p.id, tourNum)">
                <div class="tableau-passages-lap">
                  Tour: {{ formatTime(getPassage(p.id, tourNum).lapMs) }}
                </div>
                <div class="tableau-passages-total">
                  Total: {{ formatTime(getPassage(p.id, tourNum).totalMs) }}
                </div>
              </template>
              <div
                v-else-if="canTap(p.id, tourNum)"
                class="tableau-passages-tappable-cell"
              >
                <div class="tableau-passages-lap">
                  Tour: {{ formatTime(getLiveElapsed(p.id).lapMs) }}
                </div>
                <div class="tableau-passages-total">
                  Total: {{ formatTime(getLiveElapsed(p.id).totalMs) }}
                </div>
                <div
                  class="tableau-passages-tap-btn"
                  role="button"
                  tabindex="0"
                  aria-label="Enregistrer passage"
                  @click.stop="onTap(p.id)"
                  @keydown.enter="onTap(p.id)"
                  @keydown.space.prevent="onTap(p.id)"
                >
                  <i class="pi pi-flag"></i> +
                </div>
              </div>
              <span v-else class="tableau-passages-empty-cell">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section
      v-if="!isSoloMode && hasAnyPassage"
      class="tableau-passages-resume"
      aria-label="Performances par participant"
    >
      <h3 class="tableau-passages-resume-title">Performances</h3>
      <div class="tableau-passages-resume-grid">
        <div
          v-for="perf in performancesByParticipant"
          :key="perf.participant.id"
          class="tableau-passages-resume-card"
          :style="{ borderLeftColor: perf.participant.color ?? '#94a3b8' }"
        >
          <span class="tableau-passages-resume-nom">{{ perf.participant.nom }}</span>
          <span class="tableau-passages-resume-stats">
            {{ perf.nbTours }} tour{{ perf.nbTours > 1 ? 's' : '' }}
            <template v-if="perf.dernierTotalMs !== null">
              · Dernier : {{ formatTime(perf.dernierTotalMs) }}
            </template>
          </span>
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
          <label for="participant-nom-modal">Nom</label>
          <InputText
            id="participant-nom-modal"
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
.tableau-passages {
  width: 100%;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.tableau-passages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.tableau-passages-title {
  font-weight: 600;
  font-size: 1rem;
  color: #1a1a1a;
}

.participant-btn {
  min-height: 44px;
  min-width: 44px;
}

.tableau-passages-empty {
  color: #4b5563;
  font-size: 0.95rem;
  padding: 1.5rem;
  text-align: center;
  background: #f3f4f6;
  border-radius: var(--p-border-radius, 6px);
}

.tableau-passages-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tableau-passages-table {
  width: 100%;
  min-width: 20rem;
  border-collapse: collapse;
  font-size: 0.875rem;
  background: #ffffff;
}

.tableau-passages-th-tour,
.tableau-passages-td-tour {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: #f8f9fa !important;
  color: #1a1a1a !important;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  min-width: 3rem;
}

.tableau-passages-th-participant {
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.15);
  text-align: center;
  min-width: 6rem;
}

.tableau-passages-th-clickable {
  cursor: pointer;
  min-height: 44px;
}

.tableau-passages-th-clickable:hover {
  filter: brightness(0.95);
}

.tableau-passages-controls-row {
  border: none;
}

.tableau-passages-controls-label {
  background: #f8f9fa !important;
  border: 1px solid #e5e7eb;
}

.tableau-passages-th-control {
  padding: 0.25rem 0.5rem !important;
  background: #f8f9fa !important;
  color: #1a1a1a !important;
  border: 1px solid #e5e7eb;
  text-align: center;
  vertical-align: middle;
}

.participant-control-btn {
  min-height: 36px;
  min-width: 36px;
}

.tableau-passages-td-cell {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #1a1a1a;
  text-align: center;
  vertical-align: middle;
}

.tableau-passages-td-cell.tableau-passages-tappable {
  cursor: pointer;
  background: #eff6ff;
}

.tableau-passages-td-cell.tableau-passages-tappable:hover {
  background: #dbeafe;
}

.tableau-passages-lap,
.tableau-passages-total {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #1a1a1a;
}

.tableau-passages-lap {
  font-weight: 500;
}

.tableau-passages-total {
  font-size: 0.8em;
  color: #6b7280;
}

.tableau-passages-empty-cell {
  color: #9ca3af;
}

.tableau-passages-tappable-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-height: 44px;
  justify-content: center;
}

.tableau-passages-tappable-cell .tableau-passages-tap-btn {
  margin-top: 0.125rem;
}

.tableau-passages-tap-btn {
  min-height: 44px;
  min-width: 44px;
}

.tableau-passages-resume {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.tableau-passages-resume-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem;
}

.tableau-passages-resume-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tableau-passages-resume-card {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: var(--p-border-radius, 6px);
  border-left: 4px solid #94a3b8;
}

.tableau-passages-resume-nom {
  font-weight: 600;
  color: #1a1a1a;
}

.tableau-passages-resume-stats {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.875rem;
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
