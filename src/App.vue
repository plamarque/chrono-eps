<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
const route = useRoute()

const navItems = [
  { label: 'Accueil', to: '/', icon: 'pi pi-home' },
  { label: 'Historique', to: '/historique', icon: 'pi pi-history' }
]

const activeIndex = computed(() => {
  const name = route.name
  if (name === 'home') return 0
  if (name === 'historique' || name === 'course-detail' || name === 'course-replay') return 1
  return 0
})
</script>

<template>
  <div class="app-layout">
    <Toast />
    <nav class="app-nav" aria-label="Navigation principale">
      <router-link
        v-for="(item, idx) in navItems"
        :key="item.to"
        :to="item.to"
        class="app-nav-link"
        :class="{ 'app-nav-link-active': activeIndex === idx }"
      >
        <i :class="item.icon" aria-hidden="true"></i>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-nav {
  display: flex;
  background: var(--p-surface-ground, #f8fafc);
  border-bottom: 1px solid var(--p-surface-200, #e2e8f0);
}

.app-nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  min-height: 44px;
  color: var(--p-text-muted-color, #64748b);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s, background 0.2s;
}

.app-nav-link:hover {
  color: var(--p-primary-color, #3b82f6);
  background: var(--p-surface-100, #f1f5f9);
}

.app-nav-link-active {
  color: var(--p-primary-color, #3b82f6);
  border-bottom: 2px solid var(--p-primary-color, #3b82f6);
  margin-bottom: -1px;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background-color: var(--p-surface-ground, #ffffff);
  padding: 1rem;
  padding-top: env(safe-area-inset-top, 1rem);
  padding-right: env(safe-area-inset-right, 1rem);
  padding-bottom: env(safe-area-inset-bottom, 1rem);
  padding-left: env(safe-area-inset-left, 1rem);
}
</style>

<style>
/* Dark theme overrides - bloc non scopé pour cibler html.dark */
html.dark .app-nav {
  background: #1e293b;
  border-bottom-color: #334155;
}

html.dark .app-nav-link:hover {
  background: #334155;
}

html.dark .tableau-passages-relay,
html.dark .tableau-passages {
  border-top-color: #334155;
}

/* Supprimer les radius qui laissent filtrer le blanc dans les coins */
html.dark .home-card,
html.dark .home-card > *,
html.dark .historique-card,
html.dark .historique-card > *,
html.dark .historique-item,
html.dark .tableau-passages-relay .tableau-relay-card,
html.dark .tableau-passages .tableau-passages-resume-card {
  border-radius: 0 !important;
}

/* Cartes de groupes et tableau en mode sombre - plus de blanc */
html.dark .tableau-passages-relay .tableau-relay-card {
  background: #1e293b;
  border-color: #334155;
}

html.dark .tableau-passages-relay .tableau-relay-card.tableau-relay-tappable {
  background: #1e3a5f;
  border-color: #3b82f6;
}

html.dark .tableau-passages-relay .tableau-relay-controls,
html.dark .tableau-passages-relay .tableau-relay-body {
  background: #1e293b;
  border-color: #334155;
}

html.dark .tableau-passages-relay .tableau-relay-tap-zone:hover {
  background: #334155;
}

html.dark .tableau-passages-relay .tableau-relay-label,
html.dark .tableau-passages-relay .tableau-relay-prochain-inline,
html.dark .tableau-passages-relay .tableau-relay-passage-time,
html.dark .tableau-passages-relay .tableau-relay-total,
html.dark .tableau-passages-relay .tableau-relay-empty {
  color: #94a3b8;
}

html.dark .tableau-passages-relay .tableau-relay-name,
html.dark .tableau-passages-relay .tableau-relay-time,
html.dark .tableau-passages-relay .tableau-relay-en-cours,
html.dark .tableau-passages-relay .tableau-relay-passage-nom {
  color: #e2e8f0;
}

html.dark .tableau-passages-relay .tableau-relay-passages,
html.dark .tableau-passages-relay .tableau-relay-passage-line {
  border-color: #334155;
}

html.dark .tableau-passages-relay .tableau-relay-empty-clickable:hover {
  background: #334155;
  color: #60a5fa;
}

html.dark .tableau-passages-relay .tableau-passages-resume-card {
  background: #1e293b;
  border-left-color: #64748b;
}

html.dark .tableau-passages-relay .tableau-passages-resume-title,
html.dark .tableau-passages-relay .tableau-passages-resume-nom,
html.dark .tableau-passages-relay .tableau-passages-resume-student-nom,
html.dark .tableau-passages-relay .tableau-passages-resume-student-total {
  color: #e2e8f0;
}

html.dark .tableau-passages-relay .tableau-passages-resume-stats,
html.dark .tableau-passages-relay .tableau-passages-resume-passage-time,
html.dark .tableau-passages-relay .tableau-passages-resume-student-passages {
  color: #94a3b8;
}

html.dark .tableau-passages-relay .tableau-passages-resume-passage,
html.dark .tableau-passages-relay .tableau-passages-resume-student-row {
  border-left-color: #334155;
}

html.dark .tableau-passages-relay .tableau-passages-resume-passage-nom {
  color: #cbd5e1;
}

/* Tableau passages (mode individuel) */
html.dark .tableau-passages .tableau-passages-empty {
  background: #1e293b;
  color: #94a3b8;
}

html.dark .tableau-passages .tableau-passages-table {
  background: #1e293b;
}

html.dark .tableau-passages .tableau-passages-th-tour,
html.dark .tableau-passages .tableau-passages-td-tour,
html.dark .tableau-passages .tableau-passages-th-control,
html.dark .tableau-passages .tableau-passages-controls-label {
  background: #334155 !important;
  color: #e2e8f0 !important;
  border-color: #475569;
}

html.dark .tableau-passages .tableau-passages-th-participant {
  border-color: #475569;
}

html.dark .tableau-passages .tableau-passages-td-cell {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #334155;
}

html.dark .tableau-passages .tableau-passages-td-cell.tableau-passages-tappable {
  background: #1e3a5f;
}

html.dark .tableau-passages .tableau-passages-td-cell.tableau-passages-tappable:hover {
  background: #2563eb;
}

html.dark .tableau-passages .tableau-passages-lap,
html.dark .tableau-passages .tableau-passages-total {
  color: #e2e8f0;
}

html.dark .tableau-passages .tableau-passages-total {
  color: #94a3b8;
}

html.dark .tableau-passages .tableau-passages-empty-cell {
  color: #64748b;
}

html.dark .tableau-passages .tableau-passages-resume-card {
  background: #1e293b;
  border-left-color: #64748b;
}

html.dark .tableau-passages .tableau-passages-resume-title,
html.dark .tableau-passages .tableau-passages-resume-nom {
  color: #e2e8f0;
}

html.dark .tableau-passages .tableau-passages-resume-stats,
html.dark .tableau-passages .tableau-passages-resume-passage-time {
  color: #94a3b8;
}

html.dark .tableau-passages .tableau-passages-resume-passage {
  border-left-color: #334155;
}

html.dark .tableau-passages .tableau-passages-resume-passage-nom {
  color: #cbd5e1;
}
</style>
