<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { listCourses, deleteCourse } from '../services/courseStore.js'
import { formatCourseDate } from '../utils/formatDate.js'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const toast = useToast()
const coursesList = ref([])

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
            <span class="historique-nom">{{ c.nom }}</span>
            <span class="historique-meta">
              <span class="historique-date">{{ formatCourseDate(c.createdAt) }}</span>
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

.historique-delete {
  flex-shrink: 0;
  min-height: 44px;
  min-width: 44px;
}

.historique-nom {
  font-weight: 500;
  color: var(--p-text-color, #1a1a1a);
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
