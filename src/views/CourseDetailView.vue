<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Chronometre from '../components/Chronometre.vue'
import TableauPassagesCompact from '../components/TableauPassagesCompact.vue'
import TableauPassagesRelay from '../components/TableauPassagesRelay.vue'
import { loadCourse } from '../services/courseStore.js'
import {
  exportCourseAsExcelBlob,
  shareOrDownload,
  buildExportFilename
} from '../services/exportCourseExcel.js'
import { getMaxTotalMsFromPassages } from '../utils/courseUtils.js'
import { formatCourseDate } from '../utils/formatDate.js'
import { getModeIcon } from '../utils/courseUtils.js'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const course = ref(null)
const loading = ref(true)

const displayedElapsedMs = computed(() =>
  course.value ? getMaxTotalMsFromPassages(course.value.passagesByParticipant) : 0
)

const isPreparedCourse = computed(() => {
  const c = course.value
  if (!c) return false
  if (c.statusAtSave !== 'idle') return false
  const pbp = c.passagesByParticipant || {}
  return Object.values(pbp).every((arr) => !arr?.length)
})

const hasPassages = computed(() => {
  const pbp = course.value?.passagesByParticipant ?? {}
  return Object.values(pbp).some((arr) => Array.isArray(arr) && arr.length > 0)
})

const emptyParticipantStates = {}

const exporting = ref(false)

async function exportToExcel() {
  const c = course.value
  if (!c || !hasPassages.value) return
  exporting.value = true
  try {
    const blob = await exportCourseAsExcelBlob(c)
    const filename = buildExportFilename(c.nom, c.createdAt)
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

async function fetchCourse() {
  loading.value = true
  course.value = null
  const id = route.params.id
  if (!id) {
    router.replace('/historique')
    loading.value = false
    return
  }
  try {
    const data = await loadCourse(id)
    if (!data) {
      toast.add({ severity: 'warn', summary: 'Course introuvable', detail: 'Elle a peut-être été supprimée.', life: 3000 })
      router.replace('/historique')
      return
    }
    course.value = data
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de charger.', life: 5000 })
    router.replace('/historique')
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/historique')
}

function startNewFromThis() {
  if (!course.value) return
  router.push({ path: '/', query: { loadCourseId: course.value.id } })
}

function goToReplay() {
  if (!course.value) return
  router.push({ name: 'course-replay', params: { id: course.value.id } })
}

function createNewFromThis() {
  if (!course.value) return
  router.push({ path: '/', query: { newFromCourseId: course.value.id } })
}

onMounted(fetchCourse)
watch(() => route.params.id, fetchCourse)
</script>

<template>
  <div class="course-detail">
    <div v-if="loading" class="course-detail-loading">Chargement…</div>
    <Card v-else-if="course" class="course-detail-card">
      <template #title>
        <div class="course-detail-header">
          <Button
            icon="pi pi-arrow-left"
            severity="secondary"
            text
            rounded
            aria-label="Retour"
            class="course-detail-back"
            @click="goBack"
          />
          <span class="course-detail-nom">
            <i :class="getModeIcon(course.mode)" aria-hidden="true" class="course-detail-icon"></i>
            {{ course.nom }}
          </span>
        </div>
      </template>
      <template #subtitle>
        <span class="course-detail-date">{{ formatCourseDate(course.createdAt) }}</span>
      </template>
      <template #content>
        <section class="course-detail-section" aria-labelledby="course-detail-chrono-heading">
          <h2 id="course-detail-chrono-heading" class="sr-only">Temps total</h2>
          <Chronometre
            :elapsed-ms="displayedElapsedMs"
            status="idle"
            :show-tour="false"
            :is-viewing-loaded-course="true"
            @reset="createNewFromThis"
          >
            <template #extra-controls>
              <Button
                v-if="isPreparedCourse"
                label="Lancer"
                icon="pi pi-play"
                severity="primary"
                class="chronometre-btn"
                @click="startNewFromThis"
              />
              <template v-else>
                <Button
                  label="Replay"
                  icon="pi pi-play"
                  severity="secondary"
                  class="chronometre-btn"
                  @click="goToReplay"
                />
                <Button
                  v-if="hasPassages"
                  label="Exporter"
                  icon="pi pi-file-excel"
                  severity="secondary"
                  class="chronometre-btn"
                  :loading="exporting"
                  :disabled="exporting"
                  @click="exportToExcel"
                />
              </template>
            </template>
          </Chronometre>
        </section>
        <section class="course-detail-section" aria-label="Participants">
          <template v-if="course.mode !== 'relay'">
            <TableauPassagesCompact
              :participants="course.participants"
              :participant-states="emptyParticipantStates"
              :passages-by-participant="course.passagesByParticipant"
              status="idle"
              :read-only="true"
            />
            <!-- Vue tableau conservée en attente des retours utilisateurs
            <TableauPassages
              :participants="course.participants"
              :participant-states="emptyParticipantStates"
              :passages-by-participant="course.passagesByParticipant"
              status="idle"
              :read-only="true"
            />
            -->
          </template>
          <TableauPassagesRelay
            v-else
            :participants="course.participants"
            :participant-states="emptyParticipantStates"
            :passages-by-participant="course.passagesByParticipant"
            :group-runners="course.groupRunners || {}"
            status="idle"
            :read-only="true"
          />
        </section>
        <div class="course-detail-actions">
          <Button
            label="Retour"
            icon="pi pi-arrow-left"
            severity="secondary"
            @click="goBack"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.course-detail {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100%;
}

.course-detail-loading {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color, #6b7280);
}

.course-detail-card {
  width: 100%;
  flex: 1;
}

.course-detail-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.course-detail-back {
  min-height: 44px;
  min-width: 44px;
}

.course-detail-nom {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.course-detail-icon {
  font-size: 1rem;
  opacity: 0.85;
}

.course-detail-date {
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #6b7280);
}

.course-detail-section {
  margin-bottom: 1.5rem;
}

.course-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.course-detail-actions .p-button {
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
