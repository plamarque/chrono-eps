<script setup>
import { PLAY_TESTER_GROUP_URL, PLAY_TESTER_OPT_IN_URL } from '../playTesting.js'
</script>

<template>
  <section class="tester-page" aria-labelledby="tester-title">
    <h1 id="tester-title">Devenir testeur Android</h1>
    <p>
      Google Play n’ouvre l’app au public qu’après un test fermé. En vous inscrivant, vous aidez
      Chrono EPS à arriver sur le store.
    </p>
    <ol class="tester-steps">
      <li v-if="PLAY_TESTER_GROUP_URL">
        Rejoignez le
        <a :href="PLAY_TESTER_GROUP_URL" target="_blank" rel="noopener">groupe de testeurs</a>
        (compte Google).
      </li>
      <li>
        Ouvrez le lien Play, acceptez de devenir testeur, puis installez Chrono EPS.
      </li>
      <li>Laissez l’app installée au moins 14 jours (pas besoin de l’ouvrir tous les jours).</li>
    </ol>
    <div class="tester-actions">
      <a
        class="tester-cta"
        :href="PLAY_TESTER_OPT_IN_URL"
        target="_blank"
        rel="noopener"
      >
        S’inscrire sur Google Play
      </a>
      <a
        v-if="PLAY_TESTER_GROUP_URL"
        class="tester-cta tester-cta-secondary"
        :href="PLAY_TESTER_GROUP_URL"
        target="_blank"
        rel="noopener"
      >
        Rejoindre le groupe
      </a>
    </div>
    <p class="tester-note">
      Sans compte Google sur le téléphone, Play refusera l’inscription. La PWA sur cette page reste
      utilisable sans installation store.
    </p>
  </section>
</template>

<style scoped>
.tester-page {
  max-width: 36rem;
  margin-inline: auto;
}

.tester-page h1 {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.tester-page p,
.tester-steps {
  color: var(--p-text-muted-color, #475569);
  line-height: 1.5;
}

.tester-steps {
  padding-left: 1.25rem;
}

.tester-steps li + li {
  margin-top: 0.5rem;
}

.tester-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1.25rem 0;
}

.tester-cta {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--p-primary-color, #3b82f6);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
}

.tester-cta-secondary {
  background: transparent;
  color: var(--p-primary-color, #3b82f6);
  border: 1px solid var(--p-primary-color, #3b82f6);
}

.tester-note {
  font-size: 0.9rem;
}
</style>
