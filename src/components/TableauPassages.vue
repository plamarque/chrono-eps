<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { createParticipant } from '../models/participant.js'
import { formatTime } from '../utils/formatTime.js'

const COULEURS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
]

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
  }
})

const emit = defineEmits(['add', 'update', 'remove', 'record', 'start-participant', 'stop-participant'])

const showParticipantModal = ref(false)
const editedParticipant = ref(null)
const modalNom = ref('')
const modalColor = ref('#3b82f6')

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
  modalColor.value = participant.color ?? COULEURS[0]
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
  return isParticipantRunning(participantId) && isNextTour(participantId, tourNum)
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
        label="Ajouter"
        icon="pi pi-plus"
        severity="primary"
        class="participant-btn"
        aria-label="Ajouter un participant"
        @click="addParticipant"
      />
    </div>

    <p v-if="isSoloMode" class="tableau-passages-solo-hint">
      Mode chrono seul : Démarrer puis Tour (ou tapez sur une cellule) pour enregistrer les passages.
    </p>

    <div v-if="displayParticipants.length > 0" class="tableau-passages-scroll">
      <table class="tableau-passages-table">
        <thead>
          <tr>
            <th class="tableau-passages-th-tour">Tour</th>
            <th
              v-for="p in displayParticipants"
              :key="p.id"
              class="tableau-passages-th-participant tableau-passages-th-clickable"
              :style="{
                backgroundColor: p.color ?? '#94a3b8',
                color: '#ffffff'
              }"
              role="button"
              tabindex="0"
              aria-label="Modifier ou supprimer"
              @click="openParticipantModal(p)"
              @keydown.enter="openParticipantModal(p)"
              @keydown.space.prevent="openParticipantModal(p)"
            >
              {{ p.nom }}
            </th>
          </tr>
          <tr v-if="!isSoloMode" class="tableau-passages-controls-row">
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
                class="tableau-passages-tap-btn"
                role="button"
                tabindex="0"
                aria-label="Enregistrer passage"
                @click="onTap(p.id)"
                @keydown.enter="onTap(p.id)"
                @keydown.space.prevent="onTap(p.id)"
              >
                <i class="pi pi-flag"></i> +
              </div>
              <span v-else class="tableau-passages-empty-cell">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
              v-for="c in COULEURS"
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

.tableau-passages-solo-hint {
  color: #4b5563;
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
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

.tableau-passages-tap-btn {
  min-height: 44px;
  min-width: 44px;
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
