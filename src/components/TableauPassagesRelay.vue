<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { createRelayGroup, COULEURS_PALETTE, safeRelayRunnerNom } from '../models/participant.js'
import { formatTime } from '../utils/formatTime.js'
import RelayGroupModal from './RelayGroupModal.vue'

const MAX_GROUPS = 8

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
  groupRunners: {
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

const emit = defineEmits(['add', 'update', 'remove', 'record', 'start-participant', 'stop-participant', 'update-group-runners'])

const showGroupModal = ref(false)
const editedGroup = ref(null)

/** Nombre total de coureurs dans tous les groupes (pour numérotation continue). */
const totalRunnersCount = computed(() => {
  let n = 0
  for (const runners of Object.values(props.groupRunners ?? {})) {
    n += Array.isArray(runners) ? runners.length : 0
  }
  return n
})

/** Le groupe en cours d'édition a des passages — suppression de coureurs interdite. */
const hasPassagesForEditedGroup = computed(
  () => (props.passagesByParticipant[editedGroup.value?.id] ?? []).length > 0
)

function addGroup() {
  const used = new Set(props.participants.map((p) => p.color))
  let colorIndex = 0
  for (let i = 0; i < COULEURS_PALETTE.length; i++) {
    if (!used.has(COULEURS_PALETTE[i])) {
      colorIndex = i
      break
    }
    colorIndex = props.participants.length % COULEURS_PALETTE.length
  }
  const groupIndex = props.participants.length
  const color = COULEURS_PALETTE[colorIndex % COULEURS_PALETTE.length]
  const group = createRelayGroup(groupIndex, color)
  emit('add', group)
}

function openGroupModal(group) {
  editedGroup.value = group
  showGroupModal.value = true
}

function closeGroupModal() {
  showGroupModal.value = false
  editedGroup.value = null
}

function saveGroupRunners({ group, runners }) {
  if (!editedGroup.value) return
  emit('update', group)
  emit('update-group-runners', { groupId: editedGroup.value.id, runners })
  closeGroupModal()
}

function deleteGroup() {
  if (!editedGroup.value) return
  emit('remove', editedGroup.value)
  closeGroupModal()
}

/** Liste chronologique des passages : nom du coureur + temps pour chaque passage. */
function getPassagesList(groupId) {
  const runners = (props.groupRunners[groupId] ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const passages = (props.passagesByParticipant[groupId] ?? []).slice().sort((a, b) => a.tourNum - b.tourNum)
  return passages.map((p) => {
    const idx = Number.isFinite(p.studentIndex) ? p.studentIndex : 0
    const runner = runners[idx]
    const nom = runner ? safeRelayRunnerNom(runner.nom, idx) : safeRelayRunnerNom('', idx)
    return { nom, lapMs: p.lapMs }
  })
}

/**
 * Performances regroupées par coureur pour la section Temps.
 * Retourne : { groupTotalMs, runners: [{ nom, passages: [{ pNum, lapMs }], totalLapMs }] }
 */
function getPerformancesByRunner(groupId) {
  const runners = (props.groupRunners[groupId] ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const passages = (props.passagesByParticipant[groupId] ?? []).slice().sort((a, b) => a.tourNum - b.tourNum)
  const groupTotalMs = passages.length > 0 ? passages[passages.length - 1].totalMs : null

  const byRunner = {}
  for (let i = 0; i < runners.length; i++) {
    const runner = runners[i]
    byRunner[i] = { nom: safeRelayRunnerNom(runner?.nom, i), passages: [] }
  }
  if (runners.length === 0) {
    byRunner[0] = { nom: safeRelayRunnerNom('', 0), passages: [] }
  }

  passages.forEach((p) => {
    const idx = Number.isFinite(p.studentIndex) ? p.studentIndex : 0
    if (!byRunner[idx]) {
      byRunner[idx] = { nom: safeRelayRunnerNom('', idx), passages: [] }
    }
    byRunner[idx].passages.push({
      pNum: byRunner[idx].passages.length + 1,
      lapMs: p.lapMs
    })
  })

  const result = Object.keys(byRunner)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map((idx) => byRunner[idx])
    .filter((r) => r.passages.length > 0)
    .map((r) => ({
      ...r,
      totalLapMs: r.passages.reduce((sum, p) => sum + (p.lapMs ?? 0), 0)
    }))

  return { groupTotalMs, runners: result }
}

function getCurrentAndNext(groupId) {
  const runners = (props.groupRunners[groupId] ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const passages = props.passagesByParticipant[groupId] ?? []
  const currentIndex = passages.length
  const nbRunners = runners.length
  const isRunning = props.participantStates[groupId]?.status === 'running'
  const isComplete = false // La course continue tant que le professeur n'arrête pas

  // Ordre : Tour 1 (coureur 0), Tour 2 (coureur 1), ..., Tour n (coureur n-1), Tour n+1 (coureur 0), ...
  const withSafeNom = (r, idx) =>
    r ? { ...r, nom: safeRelayRunnerNom(r.nom, idx) } : null
  const currentRunner = nbRunners > 0 ? withSafeNom(runners[currentIndex % nbRunners], currentIndex % nbRunners) : null
  const nextRunner = nbRunners > 0 ? withSafeNom(runners[(currentIndex + 1) % nbRunners], (currentIndex + 1) % nbRunners) : null
  const lastRunner =
    passages.length > 0 && nbRunners > 0
      ? withSafeNom(runners[(passages.length - 1) % nbRunners], (passages.length - 1) % nbRunners)
      : null

  return {
    currentRunner,
    nextRunner,
    lastRunner,
    isRunning,
    isComplete,
    currentIndex
  }
}

/**
 * Prochain à courir : en affichage statut (hors zone tap), c'est currentRunner.
 * À l'init (personne écourru), c'est le coureur 1, pas le coureur 2.
 */
function getNextToRun(groupId) {
  return getCurrentAndNext(groupId).currentRunner
}

function canTap(groupId) {
  if (props.readOnly) return false
  const { isRunning, isComplete, currentRunner } = getCurrentAndNext(groupId)
  return isRunning && !isComplete && currentRunner != null
}

function getLiveElapsed(groupId) {
  const s = props.participantStates[groupId]
  if (!s) return { lapMs: 0, totalMs: 0 }
  const totalMs = s.elapsedMs ?? 0
  const passages = props.passagesByParticipant[groupId] ?? []
  const lastTotal = passages.length > 0 ? passages[passages.length - 1].totalMs : 0
  const lapMs = totalMs - lastTotal
  return { lapMs, totalMs }
}

function onTap(groupId) {
  emit('record', groupId)
}

function toggleGroup(group) {
  const s = props.participantStates[group.id]
  if (s?.status === 'running') {
    emit('stop-participant', group.id)
  } else {
    emit('start-participant', group.id)
  }
}

const performancesByGroup = computed(() =>
  props.participants.map((p) => {
    const passages = props.passagesByParticipant[p.id] ?? []
    const nbTours = passages.length
    const dernierTotalMs = nbTours > 0 ? passages[nbTours - 1].totalMs : null
    const perfByRunner = getPerformancesByRunner(p.id)
    return { participant: p, nbTours, dernierTotalMs, perfByRunner }
  })
)

const hasAnyPassage = computed(() =>
  performancesByGroup.value.some((perf) => perf.nbTours > 0)
)
</script>

<template>
  <div class="tableau-passages tableau-passages-relay">
    <div
      v-if="participants.length > 0 || (!readOnly && participants.length < MAX_GROUPS)"
      class="tableau-relay-grid"
    >
      <div
        v-for="group in participants"
        :key="group.id"
        class="tableau-relay-card"
        :class="{ 'tableau-relay-tappable': canTap(group.id) }"
      >
        <div
          class="tableau-relay-header"
          :style="{ backgroundColor: group.color ?? '#94a3b8', color: '#fff' }"
          :class="{ 'tableau-relay-header-clickable': !readOnly }"
          @click="!readOnly && openGroupModal(group)"
          @keydown.enter="!readOnly && openGroupModal(group)"
          @keydown.space.prevent="!readOnly && openGroupModal(group)"
          :role="readOnly ? null : 'button'"
          :tabindex="readOnly ? -1 : 0"
        >
          {{ group.nom }}
        </div>

        <div v-if="!readOnly" class="tableau-relay-controls">
          <Button
            :icon="participantStates[group.id]?.status === 'running' ? 'pi pi-stop' : 'pi pi-play'"
            :severity="participantStates[group.id]?.status === 'running' ? 'danger' : 'success'"
            :aria-label="participantStates[group.id]?.status === 'running' ? 'Arrêter' : 'Démarrer'"
            class="participant-btn participant-control-btn"
            @click.stop="toggleGroup(group)"
          />
        </div>

        <div
          class="tableau-relay-body"
          :class="{ 'tableau-relay-body-clickable': !readOnly && (groupRunners[group.id] ?? []).length > 0 }"
          @click="!readOnly && (groupRunners[group.id] ?? []).length > 0 && openGroupModal(group)"
        >
          <template v-if="(groupRunners[group.id] ?? []).length > 0">
            <div v-if="canTap(group.id)" class="tableau-relay-tap-zone">
              <div class="tableau-relay-tap-row">
                <span class="tableau-relay-en-cours">En cours : {{ getCurrentAndNext(group.id).currentRunner?.nom ?? '—' }}</span>
                <div class="tableau-relay-time">
                  {{ formatTime(getLiveElapsed(group.id).lapMs) }}
                </div>
                <button
                  type="button"
                  class="tableau-relay-tap-btn"
                  aria-label="Enregistrer passage"
                  @click.stop="onTap(group.id)"
                >
                  <i class="pi pi-flag"></i>
                </button>
                <span class="tableau-relay-prochain-inline">
                  Prochain : {{ getCurrentAndNext(group.id).nextRunner?.nom ?? '—' }}
                </span>
              </div>
            </div>
            <div v-else class="tableau-relay-display">
              <div class="tableau-relay-couru">
                <span class="tableau-relay-label">
                  {{ getCurrentAndNext(group.id).isRunning ? 'En cours' : 'Couru' }} :
                </span>
                <span class="tableau-relay-name">
                  {{
                    getCurrentAndNext(group.id).isRunning
                      ? (getCurrentAndNext(group.id).currentRunner?.nom ?? '—')
                      : (getCurrentAndNext(group.id).lastRunner?.nom ?? '—')
                  }}
                </span>
              </div>
              <div class="tableau-relay-prochain">
                <span class="tableau-relay-label">Prochain :</span>
                <span class="tableau-relay-name">{{ getNextToRun(group.id)?.nom ?? '—' }}</span>
              </div>
              <template v-if="(passagesByParticipant[group.id] ?? []).length > 0">
                <div class="tableau-relay-total">
                  Total : {{ formatTime((passagesByParticipant[group.id] ?? []).slice(-1)[0]?.totalMs ?? 0) }}
                </div>
              </template>
            </div>
            <div v-if="getPassagesList(group.id).length > 0" class="tableau-relay-passages">
              <div
                v-for="(item, i) in getPassagesList(group.id)"
                :key="i"
                class="tableau-relay-passage-line"
              >
                <span class="tableau-relay-passage-nom">{{ item.nom }} :</span>
                <span class="tableau-relay-passage-time">{{ formatTime(item.lapMs) }}</span>
              </div>
            </div>
          </template>
          <div
            v-else
            class="tableau-relay-empty"
            :class="{ 'tableau-relay-empty-clickable': !readOnly }"
            :role="readOnly ? null : 'button'"
            :tabindex="readOnly ? -1 : 0"
            @click="!readOnly && openGroupModal(group)"
            @keydown.enter="!readOnly && openGroupModal(group)"
            @keydown.space.prevent="!readOnly && openGroupModal(group)"
          >
            <span v-if="!readOnly">Cliquez pour configurer les coureurs</span>
            <span v-else>—</span>
          </div>
        </div>
      </div>
      <div
        v-if="!readOnly && participants.length < MAX_GROUPS"
        class="tableau-relay-add-cell"
      >
        <Button
          label="Ajouter un groupe"
          icon="pi pi-plus"
          severity="primary"
          class="participant-btn"
          aria-label="Ajouter un groupe"
          @click="addGroup"
        />
      </div>
    </div>

    <section
      v-if="hasAnyPassage"
      class="tableau-passages-resume"
      aria-label="Temps par groupe"
    >
      <h3 class="tableau-passages-resume-title">Temps</h3>
      <div class="tableau-passages-resume-grid">
        <div
          v-for="perf in performancesByGroup"
          :key="perf.participant.id"
          class="tableau-passages-resume-card"
          :style="{ borderLeftColor: perf.participant.color ?? '#94a3b8' }"
        >
          <div class="tableau-passages-resume-header">
            <span class="tableau-passages-resume-nom">{{ perf.participant.nom }}</span>
            <span
              v-if="perf.perfByRunner.groupTotalMs !== null"
              class="tableau-passages-resume-stats"
            >
              Total : {{ formatTime(perf.perfByRunner.groupTotalMs) }}
            </span>
          </div>
          <div
            v-for="(runner, ri) in perf.perfByRunner.runners"
            :key="`${perf.participant.id}-${ri}-${runner.nom}`"
            class="tableau-passages-resume-runner-row"
          >
            <span class="tableau-passages-resume-runner-nom">{{ runner.nom }}</span>
            <span class="tableau-passages-resume-runner-passages">
              <template
                v-for="(p, i) in runner.passages"
                :key="p.pNum"
              >
                <span v-if="i > 0" class="tableau-passages-resume-sep" aria-hidden="true"> · </span>
                <span class="tableau-passages-resume-passage-item">P{{ p.pNum }}: {{ formatTime(p.lapMs) }}</span>
              </template>
              <span class="tableau-passages-resume-sep tableau-passages-resume-sep-total" aria-hidden="true"> · </span>
              <span class="tableau-passages-resume-runner-total">Total : {{ formatTime(runner.totalLapMs) }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <RelayGroupModal
      v-model:visible="showGroupModal"
      :group="editedGroup"
      :runners="editedGroup ? (groupRunners[editedGroup.id] ?? []) : []"
      :total-runners-count="totalRunnersCount"
      :has-passages="hasPassagesForEditedGroup"
      @save="saveGroupRunners"
      @remove="deleteGroup"
      @hide="closeGroupModal"
    />
  </div>
</template>

<style scoped>
.tableau-passages-relay {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200, #e5e7eb);
}

.tableau-relay-add-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 6rem;
}

/* En mobile portrait : bouton sur sa propre ligne pour position stable (tap-tap-tap) */
@media (max-width: 600px) {
  .tableau-relay-add-cell {
    grid-column: 1 / -1;
  }
}

.tableau-relay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  gap: 1rem;
}

.tableau-relay-card {
  border: 1px solid #e5e7eb;
  border-radius: var(--p-border-radius, 6px);
  overflow: hidden;
  background: #fff;
}

.tableau-relay-card.tableau-relay-tappable {
  border-color: #3b82f6;
  background: #eff6ff;
}

.tableau-relay-header {
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  text-align: center;
}

.tableau-relay-header-clickable {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tableau-relay-controls {
  padding: 0.25rem;
  text-align: center;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
}

.tableau-relay-body {
  padding: 0.75rem;
  min-height: 5rem;
}

.tableau-relay-body-clickable {
  cursor: pointer;
}

.tableau-relay-body-clickable:hover {
  background: #f8fafc;
}

.tableau-relay-tap-zone {
  cursor: pointer;
  padding: 0.5rem;
  text-align: center;
  min-height: 88px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
}

.tableau-relay-tap-zone:hover {
  background: #dbeafe;
}

.tableau-relay-couru,
.tableau-relay-prochain {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.tableau-relay-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.tableau-relay-name {
  font-weight: 600;
  font-size: 1rem;
}

.tableau-relay-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.9rem;
  color: #1a1a1a;
}

.tableau-relay-tap-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tableau-relay-tap-btn {
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

.tableau-relay-tap-btn:hover {
  background: #2563eb;
}

.tableau-relay-en-cours {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
}

.tableau-relay-prochain-inline {
  font-size: 0.9rem;
  font-weight: 600;
  color: #6b7280;
}

.tableau-relay-passages {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.tableau-relay-passage-line {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: 0.8rem;
  margin-top: 0.2rem;
}

.tableau-relay-passage-nom {
  font-weight: 500;
  color: #1a1a1a;
}

.tableau-relay-passage-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #6b7280;
}

.tableau-relay-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tableau-relay-total {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  font-size: 0.85rem;
  color: #6b7280;
}

.tableau-relay-empty {
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

.tableau-relay-empty-clickable {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tableau-relay-empty-clickable:hover {
  color: #3b82f6;
  background: #eff6ff;
}

.participant-btn {
  min-height: 44px;
  min-width: 44px;
}

.participant-control-btn {
  min-height: 36px;
  min-width: 36px;
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
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: var(--p-border-radius, 6px);
  border-left: 4px solid #94a3b8;
}

.tableau-passages-resume-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
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

.tableau-passages-resume-runner-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding-left: 0.5rem;
  border-left: 2px solid #e5e7eb;
}

.tableau-passages-resume-runner-nom {
  font-weight: 600;
  color: #1a1a1a;
  min-width: 4rem;
}

.tableau-passages-resume-runner-passages {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #6b7280;
}

.tableau-passages-resume-sep {
  margin: 0 0.35em;
  color: #9ca3af;
  user-select: none;
}

.tableau-passages-resume-sep-total {
  margin-left: 0.5em;
}

.tableau-passages-resume-passage-item {
  white-space: nowrap;
}

.tableau-passages-resume-runner-total {
  font-weight: 600;
  color: #1a1a1a;
}

.tableau-passages-resume-passage {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  font-size: 0.8rem;
  padding-left: 0.5rem;
  border-left: 2px solid #e5e7eb;
  margin-top: 0.2rem;
}

.tableau-passages-resume-passage-nom {
  font-weight: 500;
  color: #374151;
}

.tableau-passages-resume-passage-time {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #6b7280;
}
</style>
