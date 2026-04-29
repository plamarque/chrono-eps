<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { COULEURS_PALETTE } from '../models/participant.js'
import { sumLapMs } from '../utils/courseUtils.js'
import { formatTime } from '../utils/formatTime.js'

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
  participantJoinBaseline: {
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
  hideParticipantRemove: {
    type: Boolean,
    default: false
  },
  /** Ex. fiche historique : renommer / couleur sans play, drapeau ni ajout. */
  allowParticipantEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'remove', 'record', 'start-participant', 'stop-participant'])

const showParticipantModal = ref(false)
const editedParticipant = ref(null)
const modalNom = ref('')
const modalColor = ref(COULEURS_PALETTE[0])

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

function isParticipantRunning(participantId) {
  return props.participantStates[participantId]?.status === 'running'
}

function canRecordTour(participantId) {
  if (props.readOnly) return false
  return isParticipantRunning(participantId)
}

function getLiveElapsed(participantId) {
  const s = props.participantStates[participantId]
  if (!s) return { lapMs: 0, totalMs: 0 }
  const totalMs = s.elapsedMs ?? 0
  const passages = props.passagesByParticipant[participantId] ?? []
  const lastTotal =
    passages.length > 0
      ? passages[passages.length - 1].totalMs
      : (props.participantJoinBaseline[participantId] ?? 0)
  const lapMs = totalMs - lastTotal
  return { lapMs, totalMs }
}

function getSortedPassages(participantId) {
  return (props.passagesByParticipant[participantId] ?? [])
    .slice()
    .sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
}

function getDisplayPassages(participantId) {
  const passages = getSortedPassages(participantId)
  const hasFlagPassage = passages.some((p) => p.source !== 'coureur' && p.source !== 'stop')
  return hasFlagPassage ? passages : []
}

function runningLabel() {
  return 'Temps'
}

function runningMainTime(participantId) {
  const live = getLiveElapsed(participantId)
  const passages = getSortedPassages(participantId)
  return passages.length === 0 ? live.totalMs : sumLapMs(passages)
}

function nextTourPreviewLabel(participantId) {
  const passages = getSortedPassages(participantId)
  return `Tour ${passages.length + 1}`
}

function displayTotalMs(participantId) {
  const passages = getSortedPassages(participantId)
  if (passages.length > 0) return sumLapMs(passages)
  const s = props.participantStates[participantId]
  if (s != null) return s.elapsedMs ?? 0
  return null
}

function onRecordTour(participantId) {
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

function tourLabel(index) {
  return `Tour ${index + 1}`
}
</script>

<template>
  <div class="tableau-passages tableau-passages-indiv">
    <p
      v-if="!readOnly && !allowParticipantEdit && participants.length === 0"
      class="indiv-hint"
    >
      Utilisez le bouton bleu « Coureur » dans la zone chronomètre (après Démarrer / Arrêter) : avant le départ, ajout d’une carte (temps = chrono au clic) ; pendant la course, le même bouton enregistre le temps du dernier coureur puis ajoute le suivant déjà en course. Le drapeau déclenche l’affichage multi-tours.
    </p>
    <div v-if="participants.length > 0" class="indiv-grid">
      <div
        v-for="p in participants"
        :key="p.id"
        class="indiv-card"
        :class="{ 'indiv-card-tappable': canRecordTour(p.id) }"
      >
        <div
          class="indiv-header"
          :style="{ backgroundColor: p.color ?? '#94a3b8', color: '#fff' }"
          :class="{ 'indiv-header-clickable': !readOnly || allowParticipantEdit }"
          @click="(!readOnly || allowParticipantEdit) && openParticipantModal(p)"
          @keydown.enter="(!readOnly || allowParticipantEdit) && openParticipantModal(p)"
          @keydown.space.prevent="(!readOnly || allowParticipantEdit) && openParticipantModal(p)"
          :role="readOnly && !allowParticipantEdit ? null : 'button'"
          :tabindex="readOnly && !allowParticipantEdit ? -1 : 0"
        >
          <span class="indiv-header-inner">
            <i
              v-if="!readOnly || allowParticipantEdit"
              class="pi pi-pencil indiv-header-edit-icon"
              aria-hidden="true"
            />
            <span class="indiv-header-nom">{{ p.nom }}</span>
          </span>
        </div>

        <div v-if="!readOnly && !allowParticipantEdit" class="indiv-controls">
          <Button
            :icon="participantStates[p.id]?.status === 'running' ? 'pi pi-stop' : 'pi pi-play'"
            :severity="participantStates[p.id]?.status === 'running' ? 'danger' : 'success'"
            :aria-label="participantStates[p.id]?.status === 'running' ? 'Arrêter' : 'Démarrer'"
            class="participant-btn participant-control-btn"
            @click.stop="toggleParticipant(p)"
          />
        </div>

        <div class="indiv-body">
          <div v-if="canRecordTour(p.id)" class="indiv-tap-zone">
            <div class="indiv-live-total">
              <span class="indiv-en-cours">{{ runningLabel() }}</span>
              <span class="indiv-time">
                {{ formatTime(runningMainTime(p.id)) }}
              </span>
            </div>
            <div class="indiv-flag-row">
              <button
                type="button"
                class="indiv-tap-btn"
                aria-label="Enregistrer un tour"
                @click.stop="onRecordTour(p.id)"
              >
                <i class="pi pi-flag"></i>
              </button>
              <span
                v-if="getDisplayPassages(p.id).length > 0"
                class="indiv-total-inline"
              >
                {{ nextTourPreviewLabel(p.id) }} : {{ formatTime(getLiveElapsed(p.id).lapMs) }}
              </span>
            </div>
          </div>
          <div v-else class="indiv-display">
            <div v-if="displayTotalMs(p.id) !== null" class="indiv-total-line">
              Temps : {{ formatTime(displayTotalMs(p.id)) }}
            </div>
            <div v-else class="indiv-idle-hint">
              {{ readOnly ? '—' : 'Démarrez ce coureur pour chronométrer.' }}
            </div>
          </div>
          <div v-if="getDisplayPassages(p.id).length > 0" class="indiv-passages">
            <div
              v-for="(pass, i) in getDisplayPassages(p.id)"
              :key="`${p.id}-${pass.tourNum}`"
              class="indiv-passage-line"
            >
              <span class="indiv-passage-label">{{ tourLabel(i) }} :</span>
              <span class="indiv-passage-time">{{ formatTime(pass.lapMs) }}</span>
              <span class="indiv-passage-sep" aria-hidden="true"> · </span>
              <span class="indiv-passage-total">total {{ formatTime(pass.totalMs) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="showParticipantModal"
      :header="editedParticipant ? `Modifier ${editedParticipant.nom}` : 'Coureur'"
      modal
      :style="{ width: 'min(90vw, 22rem)' }"
      @hide="closeParticipantModal"
    >
      <div v-if="editedParticipant" class="participant-modal-form">
        <div class="participant-modal-field">
          <label for="participant-nom-modal-indiv">Nom</label>
          <InputText
            id="participant-nom-modal-indiv"
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
          v-if="!readOnly && !hideParticipantRemove"
          label="Supprimer"
          severity="danger"
          icon="pi pi-trash"
          class="participant-btn"
          @click="deleteParticipant"
        />
        <Button
          v-if="!readOnly || allowParticipantEdit"
          label="Enregistrer"
          severity="primary"
          class="participant-btn"
          @click="saveParticipant"
        />
        <Button
          v-if="readOnly && !allowParticipantEdit"
          label="Fermer"
          severity="secondary"
          class="participant-btn"
          @click="closeParticipantModal"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.tableau-passages-indiv {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.indiv-hint {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.4;
}

.indiv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 1rem;
}

.indiv-card {
  border: 1px solid #e5e7eb;
  border-radius: var(--p-border-radius, 6px);
  overflow: hidden;
  background: #fff;
}

.indiv-card.indiv-card-tappable {
  border-color: #3b82f6;
  background: #eff6ff;
}

.indiv-header {
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  text-align: center;
}

.indiv-header-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  max-width: 100%;
}

.indiv-header-nom {
  min-width: 0;
  overflow-wrap: anywhere;
}

.indiv-header-edit-icon {
  font-size: 0.72rem;
  opacity: 0.92;
  flex-shrink: 0;
}

.indiv-header-clickable {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indiv-controls {
  padding: 0.25rem;
  text-align: center;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
}

.indiv-body {
  padding: 0.75rem;
  min-height: 5rem;
}

.indiv-tap-zone {
  padding: 0.5rem;
  text-align: center;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
}

.indiv-tap-zone:hover {
  background: #dbeafe;
}

.indiv-tap-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.indiv-live-total {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.65rem;
  font-weight: 800;
  color: #111827;
}

.indiv-en-cours {
  font-size: clamp(1.15rem, 4vw, 1.35rem);
  font-weight: 800;
  color: inherit;
}

.indiv-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: clamp(1.15rem, 4vw, 1.35rem);
  font-weight: 800;
  color: inherit;
}

.indiv-flag-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.indiv-tap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem;
  border: none;
  border-radius: var(--p-border-radius, 6px);
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-size: 1.25rem;
}

.indiv-tap-btn:hover {
  background: #2563eb;
}

.indiv-total-inline {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
}

.indiv-display {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
  text-align: center;
}

.indiv-total-line {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.indiv-idle-hint {
  font-size: 0.85rem;
  color: #9ca3af;
}

.indiv-passages {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.indiv-passage-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25em;
  font-size: 0.8rem;
  margin-top: 0.2rem;
}

.indiv-passage-label {
  font-weight: 500;
  color: #1a1a1a;
}

.indiv-passage-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #6b7280;
}

.indiv-passage-sep {
  color: #9ca3af;
}

.indiv-passage-total {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.75rem;
  color: #9ca3af;
}

.participant-btn {
  min-height: 44px;
  min-width: 44px;
}

.participant-control-btn {
  min-height: 36px;
  min-width: 36px;
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
