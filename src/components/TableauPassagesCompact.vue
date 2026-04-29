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
  },
  /** Mode individuel terrain : arrivées via le chronomètre, pas de grille start/stop/tour par carte. */
  sequentialIndividual: {
    type: Boolean,
    default: false
  },
  /** Masque le bouton Supprimer du dialogue (ex. vue détail historique : édition nom uniquement). */
  hideParticipantRemove: {
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
  if (props.sequentialIndividual) {
    return props.participants
  }
  if (props.participants.length === 0) {
    return [{ id: '__solo__', nom: 'Course', color: '#64748b' }]
  }
  return props.participants
})

const isSoloMode = computed(() => !props.sequentialIndividual && props.participants.length === 0)

const gridParticipants = computed(() => displayParticipants.value)

const performancesByParticipant = computed(() => {
  if (props.participants.length === 0) return []
  return props.participants.map((p) => {
    const passages = (props.passagesByParticipant[p.id] ?? [])
      .slice()
      .sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
    const nbTours = passages.length
    const dernierTotalMs = nbTours > 0 ? passages[nbTours - 1].totalMs : null
    const passagesList = passages.map((pass, i) => ({
      label:
        props.sequentialIndividual && passages.length === 1 ? 'Arrivée' : `P${i + 1}`,
      lapMs: pass.lapMs,
      totalMs: pass.totalMs
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
    const m = p.nom?.match(/^(?:Coureur|Élève|Elève) (\d+)$/)
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

function isParticipantPaused(participantId) {
  return props.participantStates[participantId]?.status === 'paused'
}

function canTap(participantId) {
  if (props.readOnly || props.sequentialIndividual) return false
  const passages = props.passagesByParticipant[participantId] ?? []
  const nextTourNum = passages.length + 1
  return isParticipantRunning(participantId) && isNextTour(participantId, nextTourNum)
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

function getTotalMs(participantId) {
  const passages = (props.passagesByParticipant[participantId] ?? [])
    .slice()
    .sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
  if (passages.length > 0) return passages[passages.length - 1].totalMs
  const s = props.participantStates[participantId]
  if (s?.status === 'paused' && (s.elapsedMs ?? 0) > 0) return s.elapsedMs
  return null
}

function getSortedPassages(participantId) {
  return (props.passagesByParticipant[participantId] ?? [])
    .slice()
    .sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
}

function getArrivalTotalMs(participantId) {
  const passages = getSortedPassages(participantId)
  if (passages.length === 0) return null
  return passages[passages.length - 1].totalMs
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
    <!-- Mode individuel séquentiel (terrain) -->
    <template v-if="sequentialIndividual">
      <p
        v-if="!readOnly && participants.length === 0"
        class="tableau-passages-compact-seq-hint"
      >
        Lancez le chronomètre, puis appuyez sur « Arrivée » à chaque passage devant vous.
      </p>
      <div
        v-if="participants.length > 0"
        class="tableau-passages-compact-seq-list"
        aria-label="Arrivées enregistrées"
      >
        <div
          v-for="p in participants"
          :key="p.id"
          class="tableau-passages-compact-seq-row"
          :style="{ borderLeftColor: p.color ?? '#94a3b8' }"
        >
          <div class="tableau-passages-compact-seq-name-row">
            <span
              class="tableau-passages-compact-seq-name"
              :class="{ 'tableau-passages-compact-seq-name-editable': !readOnly }"
              tabindex="0"
              :aria-label="readOnly ? p.nom : `${p.nom}, double-cliquer pour modifier`"
              @dblclick="!readOnly && openParticipantModal(p)"
              @keydown.enter.prevent="!readOnly && openParticipantModal(p)"
            >
              {{ p.nom }}
            </span>
            <Button
              v-if="!readOnly"
              icon="pi pi-pencil"
              text
              rounded
              severity="secondary"
              class="tableau-passages-compact-seq-edit"
              aria-label="Modifier le nom"
              @click.stop="openParticipantModal(p)"
            />
          </div>
          <div
            v-for="(pass, i) in getSortedPassages(p.id)"
            :key="`${p.id}-${pass.tourNum}`"
            class="tableau-passages-compact-seq-time"
          >
            <span class="tableau-passages-compact-seq-time-label">
              {{ getSortedPassages(p.id).length === 1 ? 'Arrivée' : `P${i + 1}` }}
            </span>
            <template v-if="getSortedPassages(p.id).length === 1">
              {{ formatTime(pass.totalMs) }}
            </template>
            <template v-else>
              {{ formatTime(pass.lapMs) }} · total {{ formatTime(pass.totalMs) }}
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- Ancienne grille (non utilisée sur l’accueil individuel actuel) -->
    <template v-else>
      <div
        v-if="gridParticipants.length > 0 || (!readOnly && participants.length < MAX_PARTICIPANTS)"
        class="tableau-passages-compact-grid"
      >
        <div
          v-for="p in gridParticipants"
          :key="p.id"
          class="tableau-passages-compact-card"
          :class="{
            'tableau-passages-compact-card-tappable': canTap(p.id),
            'tableau-passages-compact-card-running': isParticipantRunning(p.id),
            'tableau-passages-compact-card-paused': isParticipantPaused(p.id)
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
              class="tableau-passages-compact-card-btn tableau-passages-compact-card-btn-stop"
              @click.stop="toggleParticipant(p)"
            />
            <Button
              v-if="canTap(p.id)"
              icon="pi pi-flag"
              severity="secondary"
              aria-label="Marquer passage"
              class="tableau-passages-compact-card-btn tableau-passages-compact-card-btn-tour"
              @click.stop="onTap(p.id)"
            />
          </div>
          <div
            v-if="isParticipantRunning(p.id)"
            class="tableau-passages-compact-card-time"
          >
            <span class="tableau-passages-compact-card-time-label">P{{ (passagesByParticipant[p.id] ?? []).length + 1 }} :</span>
            {{ formatTime(getLiveElapsed(p.id).lapMs) }}
          </div>
          <div
            v-else-if="getTotalMs(p.id) !== null"
            class="tableau-passages-compact-card-time"
          >
            {{ formatTime(getTotalMs(p.id)) }}
          </div>
        </div>
        <div
          v-if="!readOnly && participants.length < MAX_PARTICIPANTS"
          class="tableau-passages-compact-add-cell"
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
      </div>

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
              <span class="tableau-passages-compact-resume-passage-nom">{{ item.label }} :</span>
              <span class="tableau-passages-compact-resume-passage-time">{{
                formatTime(item.lapMs)
              }}</span>
              <span class="tableau-passages-compact-resume-passage-sep" aria-hidden="true"> · </span>
              <span class="tableau-passages-compact-resume-passage-total-label">Total :</span>
              <span class="tableau-passages-compact-resume-passage-total">{{
                formatTime(item.totalMs)
              }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>

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
          v-if="!readOnly && !hideParticipantRemove"
          label="Supprimer"
          severity="danger"
          icon="pi pi-trash"
          class="participant-btn"
          @click="deleteParticipant"
        />
        <Button
          v-if="!readOnly"
          label="Enregistrer"
          severity="primary"
          class="participant-btn"
          @click="saveParticipant"
        />
        <Button
          v-if="readOnly"
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
.tableau-passages-compact {
  width: 100%;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.tableau-passages-compact-seq-hint {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.4;
}

.tableau-passages-compact-seq-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tableau-passages-compact-seq-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.65rem;
  border-radius: var(--p-border-radius, 6px);
  border-left: 4px solid #94a3b8;
  background: #f8fafc;
}

.tableau-passages-compact-seq-name-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.tableau-passages-compact-seq-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.tableau-passages-compact-seq-name-editable {
  cursor: default;
}

.tableau-passages-compact-seq-name-editable:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tableau-passages-compact-seq-edit {
  flex-shrink: 0;
}

.tableau-passages-compact-seq-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
}

.tableau-passages-compact-seq-time-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  margin-right: 0.35rem;
}

.tableau-passages-compact-add-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
}

@media (max-width: 600px) {
  .tableau-passages-compact-add-cell {
    grid-column: 1 / -1;
  }
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

.tableau-passages-compact-card-paused {
  background: #e5e7eb;
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

.tableau-passages-compact-card-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
}

.tableau-passages-compact-card-time-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  margin-right: 0.25em;
}

.tableau-passages-compact-card-name-clickable {
  cursor: pointer;
}

.tableau-passages-compact-card-name-clickable:hover {
  text-decoration: underline;
}

.tableau-passages-compact-card-actions {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.tableau-passages-compact-card-btn {
  min-height: 44px;
  min-width: 44px;
}

.tableau-passages-compact-card-btn-stop {
  margin-right: auto;
}

.tableau-passages-compact-card-btn-tour {
  margin-left: auto;
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
  align-items: baseline;
  gap: 0.35em;
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
  color: #1a1a1a;
}

.tableau-passages-compact-resume-passage-sep {
  color: #9ca3af;
}

.tableau-passages-compact-resume-passage-total-label {
  font-weight: 500;
  color: #6b7280;
}

.tableau-passages-compact-resume-passage-total {
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
