<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Chronometre from '../components/Chronometre.vue'
import TableauPassagesIndividualCards from '../components/TableauPassagesIndividualCards.vue'
import TableauPassagesRelay from '../components/TableauPassagesRelay.vue'
import { useChronometre } from '../composables/useChronometre.js'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { saveCourse, loadCourse } from '../services/courseStore.js'
import {
  exportCourseAsExcelBlob,
  shareOrDownload,
  buildExportFilename
} from '../services/exportCourseExcel.js'
import {
  getMaxTotalMsFromPassages,
  sortParticipantsByTotalTimeAsc,
  getModeIcon
} from '../utils/courseUtils.js'
import { createRelayGroup, createParticipant, createRelayRunner } from '../models/participant.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const modeOptions = [
  { label: 'Relais', value: 'relay', icon: 'pi pi-users' },
  { label: 'Individuel', value: 'individual', icon: 'pi pi-user' }
]
const participants = ref([])
const mode = ref('relay')
const groupRunners = ref({})
const chronoOptions = computed(() => ({
  mode: mode.value,
  groupRunners: groupRunners.value
}))
const MAX_INDIVIDUAL_RUNNERS = 20

const {
  elapsedMs,
  status,
  participantStates,
  passagesByParticipant,
  individualJoinBaselineMs,
  chronoEpochMs,
  start,
  stop,
  reset,
  startParticipant,
  stopParticipant,
  recordPassage,
  seedIndividualParticipantAtJoin
} = useChronometre(participants, chronoOptions)

const hasAnyPassage = computed(() => {
  const pbp = passagesByParticipant.value
  return Object.values(pbp).some((arr) => Array.isArray(arr) && arr.length > 0)
})

const hasUnsavedRelayConfig = computed(() => {
  const totalRunners = Object.values(groupRunners.value ?? {}).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0
  )
  const isDefaultRelayState =
    participants.value.length === 1 &&
    totalRunners === 1 &&
    !hasAnyPassage.value &&
    status.value === 'idle'
  if (isDefaultRelayState) return false
  return (
    participants.value.length > 1 ||
    totalRunners > 0 ||
    hasAnyPassage.value ||
    status.value !== 'idle'
  )
})

/** Comme le relais « 1 groupe / 1 coureur » au repos : une carte seule, pas de passage, chrono idle. */
const isDefaultIndividualState = computed(
  () =>
    mode.value === 'individual' &&
    participants.value.length === 1 &&
    !hasAnyPassage.value &&
    status.value === 'idle'
)

const hasUnsavedIndividualConfig = computed(() => {
  if (isDefaultIndividualState.value) return false
  return (
    participants.value.length > 0 ||
    hasAnyPassage.value ||
    status.value !== 'idle'
  )
})

const canSave = computed(
  () => !currentCourse.value && status.value !== 'running'
)

const isPreparedCourse = computed(
  () =>
    currentCourse.value?.statusAtSave === 'idle' && !hasAnyPassage.value
)

const displayedElapsedMs = computed(() =>
  currentCourse.value
    ? getMaxTotalMsFromPassages(passagesByParticipant.value)
    : elapsedMs.value
)

const showSaveModal = ref(false)
const saveNom = ref('')
const suggestedSaveNom = ref('')
const exporting = ref(false)

function getDefaultCourseName() {
  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const timeStr = today.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `Course du ${dateStr} ${timeStr}`
}

function openSaveModal() {
  saveNom.value = suggestedSaveNom.value || getDefaultCourseName()
  showSaveModal.value = true
}

function closeSaveModal() {
  showSaveModal.value = false
}

async function exportToExcel() {
  const c = currentCourse.value
  if (!c?.id || !hasAnyPassage.value) return
  exporting.value = true
  try {
    const course = await loadCourse(c.id)
    if (!course) {
      toast.add({ severity: 'warn', summary: 'Course introuvable', life: 3000 })
      return
    }
    const blob = await exportCourseAsExcelBlob(course)
    const filename = buildExportFilename(course.nom, course.createdAt)
    await shareOrDownload(blob, filename)
    toast.add({
      severity: 'success',
      summary: 'Export réussi',
      detail: 'Les données ont été partagées ou téléchargées.',
      life: 3000
    })
  } catch (err) {
    if (err?.cancelled) return
    toast.add({
      severity: 'error',
      summary: 'Erreur d\'export',
      detail: err?.message ?? 'Impossible d\'exporter.',
      life: 5000
    })
  } finally {
    exporting.value = false
  }
}

async function doSave() {
  const nom = saveNom.value?.trim() || 'Course sans nom'
  const chronoStartMs = chronoEpochMs.value
  try {
    const courseId = await saveCourse({
      nom,
      participants: participants.value,
      passagesByParticipant: passagesByParticipant.value,
      chronoStartMs,
      statusAtSave: status.value,
      mode: mode.value,
      nbPassagesRelay: null,
      groupRunners: mode.value === 'relay' ? groupRunners.value : {}
    })
    closeSaveModal()
    currentCourse.value = { id: courseId, nom }
    toast.add({ severity: 'success', summary: 'Sauvegardé', detail: `Course « ${nom} » enregistrée.`, life: 3000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de sauvegarder.', life: 5000 })
  }
}

const currentCourse = ref(null) // { id, nom } quand une course est chargée (lecture seule)

async function doLoadCourse(courseId) {
  try {
    const course = await loadCourse(courseId)
    if (!course) {
      toast.add({ severity: 'warn', summary: 'Course introuvable', life: 3000 })
      return
    }
    mode.value = course.mode || 'individual'
    participants.value = [...course.participants]
    groupRunners.value = { ...(course.groupRunners || {}) }
    reset()
    passagesByParticipant.value = { ...course.passagesByParticipant }
    currentCourse.value = { id: course.id, nom: course.nom, statusAtSave: course.statusAtSave || 'idle' }
    toast.add({
      severity: 'success',
      summary: 'Chargée',
      detail: `Course « ${course.nom} » chargée.`,
      life: 3000
    })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de charger.', life: 5000 })
  }
}

async function doLoadCourseAsTemplate(courseId) {
  try {
    const course = await loadCourse(courseId)
    if (!course) {
      toast.add({ severity: 'warn', summary: 'Course introuvable', life: 3000 })
      return
    }
    // Mettre à jour le mode avant les participants pour éviter que le watch mode
    // n'écrase participants avec une valeur par défaut
    mode.value = course.mode || 'individual'
    const hasPassages = Object.values(course.passagesByParticipant ?? {}).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    )
    if (
      course.mode === 'individual' &&
      course.participants?.length > 0 &&
      hasPassages
    ) {
      participants.value = sortParticipantsByTotalTimeAsc(
        course.participants,
        course.passagesByParticipant
      )
    } else {
      participants.value = [...course.participants]
    }
    const gr = course.groupRunners || {}
    groupRunners.value = Object.fromEntries(
      Object.entries(gr).map(([gid, runners]) => [gid, Array.isArray(runners) ? [...runners] : []])
    )
    passagesByParticipant.value = {}
    currentCourse.value = null
    suggestedSaveNom.value = ''
    reset()
    toast.add({
      severity: 'success',
      summary: 'Nouvelle course prête',
      detail: `À partir de « ${course.nom} » — groupes et coureurs conservés.`,
      life: 3000
    })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de charger.', life: 5000 })
  }
}

function ensureRelayHasDefaultGroup() {
  if (mode.value !== 'relay' || currentCourse.value || participants.value.length > 0) return
  const group = createRelayGroup(0)
  participants.value = [group]
  groupRunners.value = { [group.id]: [createRelayRunner(1, 0)] }
}

function ensureIndividualHasDefaultRunner() {
  if (mode.value !== 'individual' || currentCourse.value || participants.value.length > 0) return
  addParticipant(createParticipant(1))
}

function nextIndividualParticipantIndex() {
  let max = 0
  for (const p of participants.value) {
    const m = p.nom?.match(/^(?:Coureur|Élève|Elève) (\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max + 1
}

function handleAddCoureur() {
  if (participants.value.length >= MAX_INDIVIDUAL_RUNNERS) {
    toast.add({
      severity: 'warn',
      summary: 'Limite atteinte',
      detail: 'Au plus 20 coureurs pour une course individuelle.',
      life: 4000
    })
    return
  }
  const list = participants.value
  const globalRunning = status.value === 'running'
  const runningIdsBeforeAdd = globalRunning
    ? list
        .filter((p) => participantStates.value[p.id]?.status === 'running')
        .map((p) => p.id)
    : []

  const newP = createParticipant(nextIndividualParticipantIndex())
  addParticipant(newP, {
    individualFirstLapFromRaceStart: globalRunning && runningIdsBeforeAdd.length > 0
  })

  // Pendant la course, l'ajout d'un coureur ne doit pas arrêter les autres.
  if (globalRunning) {
    for (const id of runningIdsBeforeAdd) {
      startParticipant(id)
    }
    startParticipant(newP.id)
  }
}

function startNewCourse() {
  currentCourse.value = null
  suggestedSaveNom.value = ''
  participants.value = []
  groupRunners.value = {}
  reset()
  passagesByParticipant.value = {}
  if (mode.value === 'relay') {
    ensureRelayHasDefaultGroup()
  } else {
    ensureIndividualHasDefaultRunner()
  }
}

function handleStart() {
  if (isPreparedCourse.value) {
    suggestedSaveNom.value = currentCourse.value.nom || ''
    currentCourse.value = null
  }
  start()
}

const isDuplicateChronoButton = computed(
  () => !!currentCourse.value && !isPreparedCourse.value
)

const hasChronoDataToReset = computed(
  () => hasAnyPassage.value || elapsedMs.value > 0
)

async function applyResetFromChrono() {
  if (currentCourse.value) {
    await doLoadCourseAsTemplate(currentCourse.value.id)
  } else {
    // Si mode individuel sans participants valides, réinitialiser proprement
    if (mode.value === 'relay' && participants.value.length === 0) {
      ensureRelayHasDefaultGroup()
    } else if (mode.value === 'individual' && participants.value.length === 0) {
      ensureIndividualHasDefaultRunner()
    }
    reset()
  }
}

function handleReset() {
  if (isDuplicateChronoButton.value) {
    void applyResetFromChrono()
    return
  }
  if (!hasChronoDataToReset.value) {
    void applyResetFromChrono()
    return
  }
  confirm.require({
    header: 'Réinitialiser ?',
    message:
      'Êtes-vous sûr de vouloir réinitialiser ? Les temps et passages seront effacés. Les participants et groupes restent configurés.',
    acceptLabel: 'Oui, effacer',
    rejectLabel: 'Annuler',
    rejectProps: { severity: 'secondary' },
    accept: () => {
      void applyResetFromChrono()
    }
  })
}

/** Brouillon local : quitter l'accueil ferait perdre la même chose que « Nouvelle course » (sauf lecture seule d'une course déjà enregistrée). */
function shouldConfirmLeaveHome() {
  if (currentCourse.value && !isPreparedCourse.value) return false
  return mode.value === 'relay' ? hasUnsavedRelayConfig.value : hasUnsavedIndividualConfig.value
}

onBeforeRouteLeave(() => {
  if (!shouldConfirmLeaveHome()) return true
  return new Promise((resolve) => {
    let settled = false
    let accepted = false
    const settle = (allow) => {
      if (settled) return
      settled = true
      resolve(allow)
    }
    const message =
      mode.value === 'relay'
        ? 'Vous avez une course en cours non enregistrée. Si vous quittez cette page, les temps, passages et la configuration seront perdus.'
        : 'Vous avez une course en cours non enregistrée. Si vous quittez cette page, les temps, passages et les participants configurés seront perdus.'
    confirm.require({
      header: 'Quitter l\'accueil ?',
      message,
      acceptLabel: 'Quitter',
      rejectLabel: 'Rester',
      rejectProps: { severity: 'secondary' },
      accept: () => {
        accepted = true
        settle(true)
      },
      reject: () => settle(false),
      onHide: () => {
        if (!accepted) settle(false)
      }
    })
  })
})

/**
 * @param {{ individualFirstLapFromRaceStart?: boolean }} [options] — individuel : premier tour mesuré depuis le départ course (0 ms) si coureur ajouté pendant une course lancée (même départ que les autres).
 */
function addParticipant(participant, options = {}) {
  const max = mode.value === 'relay' ? 8 : 20
  if (participants.value.length >= max) {
    if (mode.value === 'individual') {
      toast.add({
        severity: 'warn',
        summary: 'Limite atteinte',
        detail: 'Au plus 20 coureurs pour une course individuelle.',
        life: 4000
      })
    }
    return
  }
  if (participants.value.length === 0) {
    const next = { ...passagesByParticipant.value }
    delete next['__solo__']
    passagesByParticipant.value = next
  }
  const joinMs = mode.value === 'individual' ? elapsedMs.value : 0
  participants.value.push(participant)
  if (mode.value === 'relay') {
    const newRunner = createRelayRunner(1, 0)
    groupRunners.value = {
      ...groupRunners.value,
      [participant.id]: [newRunner]
    }
  } else {
    /** Immédiatement après le push : sinon le watch participants peut fixer elapsedMs à 0 avant le nextTick et un flash ou état faux si le chrono principal tourne déjà. */
    seedIndividualParticipantAtJoin(
      participant.id,
      joinMs,
      options.individualFirstLapFromRaceStart === true
    )
  }
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
  const nextGr = { ...groupRunners.value }
  delete nextGr[participant.id]
  groupRunners.value = nextGr
  if (mode.value === 'relay' && !currentCourse.value && participants.value.length === 0) {
    ensureRelayHasDefaultGroup()
  }
  if (mode.value === 'individual' && !currentCourse.value && participants.value.length === 0) {
    ensureIndividualHasDefaultRunner()
  }
}

function updateGroupRunners({ groupId, runners }) {
  groupRunners.value = {
    ...groupRunners.value,
    [groupId]: runners ?? []
  }
}

function onModeChange(newMode) {
  // Ignorer la désélection (SelectButton émet null quand on reclique sur l'option sélectionnée)
  if (newMode == null || newMode === mode.value) return
  const wouldLoseData =
    mode.value === 'relay' ? hasUnsavedRelayConfig.value : hasUnsavedIndividualConfig.value
  if (currentCourse.value || !wouldLoseData) {
    mode.value = newMode
    return
  }
  const message =
    mode.value === 'relay'
      ? 'Vous allez perdre les groupes et coureurs configurés. Continuer ?'
      : 'Vous allez perdre les participants configurés. Continuer ?'
  confirm.require({
    header: 'Changer de mode ?',
    message,
    acceptLabel: 'Continuer',
    rejectLabel: 'Annuler',
    rejectProps: { severity: 'secondary' },
    accept: () => {
      mode.value = newMode
    }
  })
}

function onNewCourseClick() {
  const wouldLoseData =
    mode.value === 'relay' ? hasUnsavedRelayConfig.value : hasUnsavedIndividualConfig.value
  if (!wouldLoseData) {
    startNewCourse()
    return
  }
  const message =
    mode.value === 'relay'
      ? 'Vous allez perdre les groupes et coureurs configurés. Continuer ?'
      : 'Vous allez perdre les participants configurés. Continuer ?'
  confirm.require({
    header: 'Nouvelle course ?',
    message,
    acceptLabel: 'Continuer',
    rejectLabel: 'Annuler',
    rejectProps: { severity: 'secondary' },
    accept: () => {
      startNewCourse()
    }
  })
}

async function maybeLoadFromQuery() {
  const newFromId = route.query.newFromCourseId
  if (newFromId) {
    router.replace({ path: '/', query: {} })
    await doLoadCourseAsTemplate(newFromId)
    return
  }
  const loadId = route.query.loadCourseId
  if (!loadId) return
  router.replace({ path: '/', query: {} })
  await doLoadCourse(loadId)
}

watch(
  mode,
  async (newMode, oldMode) => {
    // Isoler les modes : pas de réutilisation des données d'un mode à l'autre
    if (currentCourse.value) return
    if (oldMode === undefined || oldMode === newMode) return

    if (newMode === 'individual') {
      participants.value = []
      groupRunners.value = {}
      passagesByParticipant.value = {}
      reset()
      ensureIndividualHasDefaultRunner()
    } else if (newMode === 'relay') {
      const group = createRelayGroup(0)
      participants.value = [group]
      groupRunners.value = { [group.id]: [createRelayRunner(1, 0)] }
      passagesByParticipant.value = {}
      reset()
    }
    await nextTick()
  },
  { flush: 'sync' }
)

onMounted(async () => {
  await maybeLoadFromQuery()
  if (mode.value === 'relay') {
    ensureRelayHasDefaultGroup()
  } else if (mode.value === 'individual' && !currentCourse.value && participants.value.length === 0) {
    ensureIndividualHasDefaultRunner()
  }
})
watch(
  () => route.query.loadCourseId || route.query.newFromCourseId,
  (val) => val && maybeLoadFromQuery()
)
</script>

<template>
  <div class="home">
    <Card class="home-card">
      <template v-if="currentCourse" #title>
        <span class="home-course-title">
          <i :class="getModeIcon(currentCourse.mode)" aria-hidden="true" class="home-course-icon"></i>
          {{ currentCourse.nom }}
        </span>
      </template>
      <template #content>
        <section class="home-section home-toolbar" aria-label="Actions et mode de course">
          <Button
            label="Nouvelle course"
            icon="pi pi-plus"
            severity="secondary"
            class="home-toolbar-btn"
            @click="onNewCourseClick"
          />
          <SelectButton
            :model-value="mode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            class="home-mode-buttons"
            @update:model-value="onModeChange"
          >
            <template #option="slotProps">
              <span class="home-mode-option">
                <i :class="slotProps.option.icon" aria-hidden="true"></i>
                <span>{{ slotProps.option.label }}</span>
              </span>
            </template>
          </SelectButton>
        </section>
        <section class="home-section home-section-chrono" aria-labelledby="chrono-heading">
          <h2 id="chrono-heading" class="sr-only">Chronomètre</h2>
          <Chronometre
            :elapsed-ms="displayedElapsedMs"
            :status="status"
            :is-viewing-loaded-course="!!currentCourse && !isPreparedCourse"
            :show-add-coureur="mode === 'individual' && !(currentCourse && !isPreparedCourse)"
            @start="handleStart"
            @stop="stop"
            @reset="handleReset"
            @add-coureur="handleAddCoureur"
          >
            <template #extra-controls>
              <Button
                v-if="currentCourse && hasAnyPassage"
                label="Exporter"
                icon="pi pi-file-excel"
                severity="secondary"
                class="chronometre-btn"
                :loading="exporting"
                :disabled="exporting"
                @click="exportToExcel"
              />
              <Button
                label="Enregistrer"
                icon="pi pi-save"
                severity="secondary"
                class="chronometre-btn"
                :disabled="!canSave"
                @click="openSaveModal"
              />
            </template>
          </Chronometre>
        </section>
        <section class="home-section" aria-label="Participants">
          <template v-if="mode === 'individual'">
            <TableauPassagesIndividualCards
              :participants="participants"
              :participant-states="participantStates"
              :passages-by-participant="passagesByParticipant"
              :participant-join-baseline="individualJoinBaselineMs"
              :status="status"
              :read-only="!!currentCourse && !isPreparedCourse"
              @update="updateParticipant"
              @remove="removeParticipant"
              @record="recordPassage"
              @start-participant="startParticipant"
              @stop-participant="stopParticipant"
            />
            <!-- Vue tableau conservée en attente des retours utilisateurs
            <TableauPassages
              :participants="participants"
              :participant-states="participantStates"
              :passages-by-participant="passagesByParticipant"
              :status="status"
              :read-only="!!currentCourse && !isPreparedCourse"
              @add="addParticipant"
              @update="updateParticipant"
              @remove="removeParticipant"
              @record="recordPassage"
              @start-participant="startParticipant"
              @stop-participant="stopParticipant"
            />
            -->
          </template>
          <TableauPassagesRelay
            v-else
            :participants="participants"
            :participant-states="participantStates"
            :passages-by-participant="passagesByParticipant"
            :group-runners="groupRunners"
            :status="status"
            :read-only="!!currentCourse && !isPreparedCourse"
            @add="addParticipant"
            @update="updateParticipant"
            @remove="removeParticipant"
            @record="recordPassage"
            @start-participant="startParticipant"
            @stop-participant="stopParticipant"
            @update-group-runners="updateGroupRunners"
          />
        </section>
      </template>
    </Card>

    <Dialog
      v-model:visible="showSaveModal"
      header="Enregistrer la course"
      modal
      :style="{ width: 'min(90vw, 22rem)' }"
      @hide="closeSaveModal"
    >
      <div class="home-save-form">
        <label for="course-nom">Nom de la course</label>
        <InputText
          id="course-nom"
          v-model="saveNom"
          class="home-save-input"
          placeholder="Ex. Course du 13 février"
          @keydown.enter.prevent="doSave"
        />
      </div>
      <template #footer>
        <Button label="Annuler" severity="secondary" @click="closeSaveModal" />
        <Button label="Enregistrer" severity="primary" icon="pi pi-check" @click="doSave" />
      </template>
    </Dialog>
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

.home :deep(.home-card) {
  border: none !important;
  box-shadow: none !important;
}

.home-course-title {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.home-course-icon {
  font-size: 1rem;
  opacity: 0.85;
}

.home-mode-option {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.home-section {
  margin-bottom: 1.5rem;
}

.home-toolbar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.home-toolbar-btn {
  min-height: 44px;
}

.home-mode-buttons {
  flex-shrink: 0;
}

.home-section-chrono {
  padding-top: 0;
}

.home-save-form label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--p-text-color, #1a1a1a);
}

.home-save-input {
  width: 100%;
  min-height: 44px;
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
