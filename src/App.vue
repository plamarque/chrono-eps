<script setup>
import Toast from 'primevue/toast'
import HomeView from './views/HomeView.vue'
</script>

<template>
  <div class="app-layout">
    <Toast />
    <main class="app-main">
      <HomeView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem;
  padding-top: env(safe-area-inset-top, 1rem);
  padding-right: env(safe-area-inset-right, 1rem);
  padding-bottom: env(safe-area-inset-bottom, 1rem);
  padding-left: env(safe-area-inset-left, 1rem);
}
</style>
