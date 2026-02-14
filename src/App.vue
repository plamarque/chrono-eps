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
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
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
  background-color: #ffffff;
  padding: 1rem;
  padding-top: env(safe-area-inset-top, 1rem);
  padding-right: env(safe-area-inset-right, 1rem);
  padding-bottom: env(safe-area-inset-bottom, 1rem);
  padding-left: env(safe-area-inset-left, 1rem);
}
</style>
