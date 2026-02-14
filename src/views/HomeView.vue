<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Chronometre from '../components/Chronometre.vue'
import TableauPassages from '../components/TableauPassages.vue'
import TableauPassagesRelay from '../components/TableauPassagesRelay.vue'
import { useChronometre } from '../composables/useChronometre.js'
import { useToast } from 'primevue/usetoast'
import { saveCourse, loadCourse } from '../services/courseStore.js'
import { getMaxTotalMsFromPassages } from '../utils/courseUtils.js'
import { createRelayGroup, createParticipant } from '../models/participant.js'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const participants = ref([])
const mode = ref('relay')
const groupStudents = ref({})
const chronoOptions = computed(() => ({
  mode: mode.value,
  groupStudents: groupStudents.value
}))
const {
  elapsedMs,
  status,
  participantStates,
  passagesByParticipant,
  chronoEpochMs,
  start,
  stop,
  reset,
  startParticipant,
  stopParticipant,
  recordPassage
} = useChronometre(participants, chronoOptions)

const hasAnyPassage = computed(() => {
  const pbp = passagesByParticipant.value
  return Object.values(pbp).some((arr) => Array.isArray(arr) && arr.length > 0)
})

const canSave = computed(
  () => !currentCourse.value && status.value !== 'running' && hasAnyPassage.value
)

const displayedElapsedMs = computed(() =>
  currentCourse.value
    ? getMaxTotalMsFromPassages(passagesByParticipant.value)
    : elapsedMs.value
)

const showSaveModal = ref(false)
const saveNom = ref('')

function openSaveModal() {
  saveNom.value = ''
  showSaveModal.value = true
}

function closeSaveModal() {
  showSaveModal.value = false
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
      groupStudents: mode.value === 'relay' ? groupStudents.value : {}
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
    participants.value = [...course.participants]
    mode.value = course.mode || 'individual'
    groupStudents.value = { ...(course.groupStudents || {}) }
    reset()
    passagesByParticipant.value = { ...course.passagesByParticipant }
    currentCourse.value = { id: course.id, nom: course.nom }
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

function ensureRelayHasDefaultGroup() {
  if (mode.value !== 'relay' || currentCourse.value || participants.value.length > 0) return
  const group = createRelayGroup(0)
  participants.value = [group]
  groupStudents.value = { [group.id]: [] }
}

function ensureIndividualHasDefaultParticipant() {
  if (mode.value !== 'individual' || currentCourse.value || participants.value.length > 0) return
  const participant = createParticipant(1)
  participants.value = [participant]
}

function startNewCourse() {
  currentCourse.value = null
  participants.value = []
  groupStudents.value = {}
  reset()
  passagesByParticipant.value = {}
  if (mode.value === 'relay') {
    ensureRelayHasDefaultGroup()
  } else {
    ensureIndividualHasDefaultParticipant()
  }
}

function handleReset() {
  if (currentCourse.value) {
    startNewCourse()
  } else {
    reset()
  }
}

function addParticipant(participant) {
  const max = mode.value === 'relay' ? 8 : 20
  if (participants.value.length >= max) return
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
  const nextGs = { ...groupStudents.value }
  delete nextGs[participant.id]
  groupStudents.value = nextGs
  if (mode.value === 'relay' && !currentCourse.value && participants.value.length === 0) {
    ensureRelayHasDefaultGroup()
  }
}

function updateGroupStudents({ groupId, students }) {
  groupStudents.value = {
    ...groupStudents.value,
    [groupId]: students ?? []
  }
}

async function maybeLoadFromQuery() {
  const id = route.query.loadCourseId
  if (!id) return
  router.replace({ path: '/', query: {} })
  await doLoadCourse(id)
}

watch(mode, (newMode) => {
  if (newMode === 'individual') {
    groupStudents.value = {}
    if (participants.value.length === 0) {
      ensureIndividualHasDefaultParticipant()
    } else {
      participants.value = participants.value.map((p, i) => {
        const m = p.nom?.match(/^Groupe (\d+)$/)
        if (m) return { ...p, nom: `Elève ${m[1]}` }
        return p
      })
    }
  }
  if (newMode === 'relay') {
    // En mode relais, les entêtes sont des groupes (Groupe 1, Groupe 2), pas des élèves
    if (participants.value.length === 0) {
      ensureRelayHasDefaultGroup()
    } else {
      participants.value = participants.value.map((p, i) => {
        const m = p.nom?.match(/^Elève (\d+)$/)
        if (m) {
          return { ...p, nom: `Groupe ${i + 1}` }
        }
        return p
      })
    }
  }
})

onMounted(async () => {
  await maybeLoadFromQuery()
  if (mode.value === 'relay') {
    ensureRelayHasDefaultGroup()
  } else if (mode.value === 'individual' && !currentCourse.value && participants.value.length === 0) {
    ensureIndividualHasDefaultParticipant()
  }
})
watch(() => route.query.loadCourseId, (val) => val && maybeLoadFromQuery())
</script>

<template>
  <div class="home">
    <Card class="home-card">
      <template v-if="currentCourse" #title>
        <span class="home-course-title">{{ currentCourse.nom }}</span>
      </template>
      <template #content>
        <section v-if="!currentCourse" class="home-section home-mode-selector" aria-label="Mode de course">
          <SelectButton
            v-model="mode"
            :options="[
              { label: 'Relais', value: 'relay' },
              { label: 'Individuel', value: 'individual' }
            ]"
            option-label="label"
            option-value="value"
            class="home-mode-buttons"
          />
        </section>
        <section class="home-section home-section-chrono" aria-labelledby="chrono-heading">
          <h2 id="chrono-heading" class="sr-only">Chronomètre</h2>
          <Chronometre
            :elapsed-ms="displayedElapsedMs"
            :status="status"
            :show-tour="participants.length === 0 && mode !== 'relay'"
            :is-viewing-loaded-course="!!currentCourse"
            @start="start"
            @stop="stop"
            @reset="handleReset"
            @record-tour="() => recordPassage('__solo__')"
          >
            <template #extra-controls>
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
        <section class="home-section" aria-label="Passages">
          <TableauPassages
            v-if="mode !== 'relay'"
            :participants="participants"
            :participant-states="participantStates"
            :passages-by-participant="passagesByParticipant"
            :status="status"
            :read-only="!!currentCourse"
            @add="addParticipant"
            @update="updateParticipant"
            @remove="removeParticipant"
            @record="recordPassage"
            @start-participant="startParticipant"
            @stop-participant="stopParticipant"
          />
          <TableauPassagesRelay
            v-else
            :participants="participants"
            :participant-states="participantStates"
            :passages-by-participant="passagesByParticipant"
            :group-students="groupStudents"
            :status="status"
            :read-only="!!currentCourse"
            @add="addParticipant"
            @update="updateParticipant"
            @remove="removeParticipant"
            @record="recordPassage"
            @start-participant="startParticipant"
            @stop-participant="stopParticipant"
            @update-group-students="updateGroupStudents"
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

.home-course-title {
  font-size: 1.1rem;
  font-weight: 600;
}

.home-section {
  margin-bottom: 1.5rem;
}

.home-mode-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.home-mode-buttons {
  align-self: flex-end;
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
