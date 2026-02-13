<script setup>
import Card from 'primevue/card'
</script>

<template>
  <div class="home">
    <Card class="home-card">
      <template #content>
        <p class="subtitle">Chronomètre multi-élèves pour l'EPS</p>
        <p class="welcome">Prêt à chronométrer</p>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-card {
  max-width: 24rem;
}

.subtitle {
  font-size: 1.125rem;
  margin: 0 0 0.5rem;
  color: var(--p-text-muted-color, #6b7280);
}

.welcome {
  font-size: 1rem;
  margin: 0;
}
</style>
