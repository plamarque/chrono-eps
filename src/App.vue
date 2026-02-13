<script setup>
import HomeView from './views/HomeView.vue'
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <h1>Chrono EPS</h1>
    </header>
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

.app-header {
  flex-shrink: 0;
  padding: 1rem;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.app-main {
  flex: 1;
  padding: 1rem;
}
</style>
