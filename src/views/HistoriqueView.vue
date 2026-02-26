<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { listCourses, loadCourse, deleteCourse } from '../services/courseStore.js'
import {
  exportCourseAsExcelBlob,
  shareOrDownload,
  buildExportFilename
} from '../services/exportCourseExcel.js'
import { formatCourseDate } from '../utils/formatDate.js'
import { getModeIcon } from '../utils/courseUtils.js'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const toast = useToast()
const coursesList = ref([])
const exportingId = ref(null)

async function loadCourses() {
  try {
    coursesList.value = await listCourses()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de charger les courses.', life: 5000 })
  }
}

async function doDeleteCourse(courseId, event) {
  event?.stopPropagation()
  if (!confirm('Supprimer cette course ?')) return
  try {
    await deleteCourse(courseId)
    coursesList.value = coursesList.value.filter((c) => c.id !== courseId)
    toast.add({ severity: 'success', summary: 'Supprimée', life: 3000 })
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: err?.message || 'Impossible de supprimer.', life: 5000 })
  }
}

function goToDetail(courseId) {
  router.push({ name: 'course-detail', params: { id: courseId } })
}

async function doExportCourse(courseId, event) {
  event?.stopPropagation()
  exportingId.value = courseId
  try {
    const course = await loadCourse(courseId)
    if (!course) {
      toast.add({ severity: 'warn', summary: 'Course introuvable', life: 3000 })
      return
    }
    const pbp = course.passagesByParticipant ?? {}
    const hasPassages = Object.values(pbp).some((arr) => Array.isArray(arr) && arr.length > 0)
    if (!hasPassages) {
      toast.add({ severity: 'warn', summary: 'Aucun passage', detail: 'Cette course n\'a pas de temps enregistré.', life: 3000 })
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
    exportingId.value = null
  }
}

onMounted(loadCourses)
</script>

<template>
  <div class="historique">
    <Card class="historique-card">
      <template #title>Historique des courses</template>
      <template #content>
        <div v-if="coursesList.length === 0" class="historique-empty">
          <p>Aucune course sauvegardée.</p>
          <router-link to="/" class="historique-cta">
            <Button label="Créer une course" icon="pi pi-plus" severity="primary" />
          </router-link>
        </div>
        <ul v-else class="historique-list">
          <li
            v-for="c in coursesList"
            :key="c.id"
            class="historique-item"
            role="button"
            tabindex="0"
            @click="goToDetail(c.id)"
            @keydown.enter="goToDetail(c.id)"
            @keydown.space.prevent="goToDetail(c.id)"
          >
            <span class="historique-nom">
              <i :class="getModeIcon(c.mode)" aria-hidden="true" class="historique-icon"></i>
              {{ c.nom }}
            </span>
            <span class="historique-meta">
              <span class="historique-date">{{ formatCourseDate(c.createdAt) }}</span>
              <Button
                icon="pi pi-file-excel"
                severity="secondary"
                text
                rounded
                size="small"
                aria-label="Exporter"
                class="historique-export"
                :loading="exportingId === c.id"
                :disabled="!!exportingId"
                @click.stop="doExportCourse(c.id, $event)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                aria-label="Supprimer"
                class="historique-delete"
                @click.stop="doDeleteCourse(c.id, $event)"
              />
            </span>
          </li>
        </ul>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.historique {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 100%;
}

.historique-card {
  width: 100%;
  flex: 1;
}

.historique-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--p-text-muted-color, #6b7280);
}

.historique-cta {
  text-decoration: none;
}

.historique-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.historique-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  min-height: 44px;
  border-radius: var(--p-border-radius, 6px);
  cursor: pointer;
  transition: background 0.2s;
}

.historique-item:hover {
  background: var(--p-surface-100, #f3f4f6);
}

.historique-export,
.historique-delete {
  flex-shrink: 0;
  min-height: 44px;
  min-width: 44px;
}

.historique-nom {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 500;
  color: var(--p-text-color, #1a1a1a);
}

.historique-icon {
  font-size: 0.95rem;
  opacity: 0.85;
}

.historique-meta {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.historique-date {
  font-size: 0.875rem;
  color: var(--p-text-muted-color, #6b7280);
}
</style>
