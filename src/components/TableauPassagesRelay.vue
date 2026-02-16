<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { createRelayGroup, COULEURS_PALETTE, safeRelayStudentNom } from '../models/participant.js'
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
  groupStudents: {
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

const emit = defineEmits(['add', 'update', 'remove', 'record', 'start-participant', 'stop-participant', 'update-group-students'])

const showGroupModal = ref(false)
const editedGroup = ref(null)

/** Nombre total d'élèves dans tous les groupes (pour numérotation continue). */
const totalStudentsCount = computed(() => {
  let n = 0
  for (const students of Object.values(props.groupStudents ?? {})) {
    n += Array.isArray(students) ? students.length : 0
  }
  return n
})

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

function saveGroupStudents({ group, students }) {
  if (!editedGroup.value) return
  emit('update', group)
  emit('update-group-students', { groupId: editedGroup.value.id, students })
  closeGroupModal()
}

function deleteGroup() {
  if (!editedGroup.value) return
  emit('remove', editedGroup.value)
  closeGroupModal()
}

/** Liste chronologique des passages : nom de l'élève + temps pour chaque passage. */
function getPassagesList(groupId) {
  const students = (props.groupStudents[groupId] ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const passages = (props.passagesByParticipant[groupId] ?? []).slice().sort((a, b) => a.tourNum - b.tourNum)
  return passages.map((p) => {
    const idx = Number.isFinite(p.studentIndex) ? p.studentIndex : 0
    const student = students[idx]
    const nom = student ? safeRelayStudentNom(student.nom, idx) : safeRelayStudentNom('', idx)
    return { nom, lapMs: p.lapMs }
  })
}

/**
 * Performances regroupées par élève pour la section Performances.
 * Retourne : { groupTotalMs, students: [{ nom, passages: [{ pNum, lapMs }], totalLapMs }] }
 */
function getPerformancesByStudent(groupId) {
  const students = (props.groupStudents[groupId] ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const passages = (props.passagesByParticipant[groupId] ?? []).slice().sort((a, b) => a.tourNum - b.tourNum)
  const groupTotalMs = passages.length > 0 ? passages[passages.length - 1].totalMs : null

  const byStudent = {}
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    byStudent[i] = { nom: safeRelayStudentNom(student?.nom, i), passages: [] }
  }
  if (students.length === 0) {
    byStudent[0] = { nom: safeRelayStudentNom('', 0), passages: [] }
  }

  passages.forEach((p) => {
    const idx = Number.isFinite(p.studentIndex) ? p.studentIndex : 0
    if (!byStudent[idx]) {
      byStudent[idx] = { nom: safeRelayStudentNom('', idx), passages: [] }
    }
    byStudent[idx].passages.push({
      pNum: byStudent[idx].passages.length + 1,
      lapMs: p.lapMs
    })
  })

  const result = Object.keys(byStudent)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map((idx) => byStudent[idx])
    .filter((s) => s.passages.length > 0)
    .map((s) => ({
      ...s,
      totalLapMs: s.passages.reduce((sum, p) => sum + (p.lapMs ?? 0), 0)
    }))

  return { groupTotalMs, students: result }
}

function getCurrentAndNext(groupId) {
  const students = (props.groupStudents[groupId] ?? []).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
  const passages = props.passagesByParticipant[groupId] ?? []
  const currentIndex = passages.length
  const nbStudents = students.length
  const isRunning = props.participantStates[groupId]?.status === 'running'
  const isComplete = false // La course continue tant que le professeur n'arrête pas

  // Ordre : Tour 1 (élève 0), Tour 2 (élève 1), ..., Tour n (élève n-1), Tour n+1 (élève 0), ...
  const withSafeNom = (s, idx) =>
    s ? { ...s, nom: safeRelayStudentNom(s.nom, idx) } : null
  const currentStudent = nbStudents > 0 ? withSafeNom(students[currentIndex % nbStudents], currentIndex % nbStudents) : null
  const nextStudent = nbStudents > 0 ? withSafeNom(students[(currentIndex + 1) % nbStudents], (currentIndex + 1) % nbStudents) : null
  const lastStudent =
    passages.length > 0 && nbStudents > 0
      ? withSafeNom(students[(passages.length - 1) % nbStudents], (passages.length - 1) % nbStudents)
      : null

  return {
    currentStudent,
    nextStudent,
    lastStudent,
    isRunning,
    isComplete,
    currentIndex
  }
}

/**
 * Prochain à courir : en affichage statut (hors zone tap), c'est currentStudent.
 * À l'init (personne écourru), c'est l'élève 1, pas l'élève 2.
 */
function getNextToRun(groupId) {
  return getCurrentAndNext(groupId).currentStudent
}

function canTap(groupId) {
  if (props.readOnly) return false
  const { isRunning, isComplete, currentStudent } = getCurrentAndNext(groupId)
  return isRunning && !isComplete && currentStudent != null
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
    const perfByStudent = getPerformancesByStudent(p.id)
    return { participant: p, nbTours, dernierTotalMs, perfByStudent }
  })
)

const hasAnyPassage = computed(() =>
  performancesByGroup.value.some((perf) => perf.nbTours > 0)
)
</script>

<template>
  <div class="tableau-passages tableau-passages-relay">
    <div class="tableau-passages-header">
      <Button
        v-if="!readOnly && participants.length < MAX_GROUPS"
        label="Ajouter un groupe"
        icon="pi pi-plus"
        severity="primary"
        class="participant-btn"
        aria-label="Ajouter un groupe"
        @click="addGroup"
      />
    </div>

    <div v-if="participants.length > 0" class="tableau-relay-grid">
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

        <div class="tableau-relay-body">
          <template v-if="(groupStudents[group.id] ?? []).length > 0">
            <div v-if="canTap(group.id)" class="tableau-relay-tap-zone">
              <div class="tableau-relay-tap-row">
                <span class="tableau-relay-en-cours">En cours : {{ getCurrentAndNext(group.id).currentStudent?.nom ?? '—' }}</span>
                <div class="tableau-relay-time">
                  {{ formatTime(getLiveElapsed(group.id).lapMs) }}
                </div>
                <button
                  type="button"
                  class="tableau-relay-tap-btn"
                  aria-label="Enregistrer passage"
                  @click="onTap(group.id)"
                >
                  <i class="pi pi-flag"></i>
                </button>
                <span class="tableau-relay-prochain-inline">
                  Prochain : {{ getCurrentAndNext(group.id).nextStudent?.nom ?? '—' }}
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
                      ? (getCurrentAndNext(group.id).currentStudent?.nom ?? '—')
                      : (getCurrentAndNext(group.id).lastStudent?.nom ?? '—')
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
                <span class="tableau-relay-passage-nom">{{ item.nom }}</span>
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
            <span v-if="!readOnly">Cliquez pour configurer les élèves</span>
            <span v-else>—</span>
          </div>
        </div>
      </div>
    </div>

    <section
      v-if="hasAnyPassage"
      class="tableau-passages-resume"
      aria-label="Performances par groupe"
    >
      <h3 class="tableau-passages-resume-title">Performances</h3>
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
              v-if="perf.perfByStudent.groupTotalMs !== null"
              class="tableau-passages-resume-stats"
            >
              Total : {{ formatTime(perf.perfByStudent.groupTotalMs) }}
            </span>
          </div>
          <div
            v-for="(student, si) in perf.perfByStudent.students"
            :key="`${perf.participant.id}-${si}-${student.nom}`"
            class="tableau-passages-resume-student-row"
          >
            <span class="tableau-passages-resume-student-nom">{{ student.nom }}</span>
            <span class="tableau-passages-resume-student-passages">
              <template
                v-for="(p, i) in student.passages"
                :key="p.pNum"
              >
                <span v-if="i > 0">  </span>
                <span>P{{ p.pNum }}: {{ formatTime(p.lapMs) }}</span>
              </template>
              <span class="tableau-passages-resume-student-total">  Total : {{ formatTime(student.totalLapMs) }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <RelayGroupModal
      v-model:visible="showGroupModal"
      :group="editedGroup"
      :students="editedGroup ? (groupStudents[editedGroup.id] ?? []) : []"
      :total-students-count="totalStudentsCount"
      @save="saveGroupStudents"
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

.tableau-passages-header {
  margin-bottom: 1rem;
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
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
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

.tableau-passages-resume-student-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding-left: 0.5rem;
  border-left: 2px solid #e5e7eb;
}

.tableau-passages-resume-student-nom {
  font-weight: 600;
  color: #1a1a1a;
  min-width: 4rem;
}

.tableau-passages-resume-student-passages {
  font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
  color: #6b7280;
}

.tableau-passages-resume-student-total {
  font-weight: 600;
  color: #1a1a1a;
}

.tableau-passages-resume-passage {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
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
