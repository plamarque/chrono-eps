<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import {
  isStandaloneDisplay,
  readPlayTesterNagState,
  shouldShowPlayTesterNag,
  snoozePlayTesterNag
} from '../playTesting.js'

const route = useRoute()
const router = useRouter()
const nagState = ref(readPlayTesterNagState())

const visible = computed(() =>
  shouldShowPlayTesterNag({
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    standalone: isStandaloneDisplay(),
    raceCompleted: nagState.value.raceCompleted,
    snoozeUntil: nagState.value.snoozeUntil,
    forceQuery: route.query.invitePlay === '1',
    hideOnInvitePage: route.name === 'devenir-testeur'
  })
)

function refreshState() {
  nagState.value = readPlayTesterNagState()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', refreshState)
  window.addEventListener('chrono-eps-play-tester-usage', refreshState)
}

function goSignup() {
  router.push({ name: 'devenir-testeur', query: { src: 'nag' } })
}

function later() {
  snoozePlayTesterNag()
  refreshState()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="play-tester-nag"
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-tester-nag-title"
    >
      <div class="play-tester-nag-panel">
        <h2 id="play-tester-nag-title">Tester Chrono EPS sur Android</h2>
        <p>
          L’app peut rester dans le navigateur. Pour la version Play (bêta), une inscription
          testeur est nécessaire.
        </p>
        <div class="play-tester-nag-actions">
          <Button type="button" label="Plus tard" severity="secondary" text @click="later" />
          <Button type="button" label="S’inscrire" @click="goSignup" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.play-tester-nag {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgb(15 23 42 / 62%);
}

.play-tester-nag-panel {
  width: min(100%, 22rem);
  padding: 1.25rem 1.25rem 1rem;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 40px rgb(15 23 42 / 20%);
}

.play-tester-nag-panel h2 {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  color: #0f172a;
}

.play-tester-nag-panel p {
  margin: 0;
  line-height: 1.45;
  color: #475569;
}

.play-tester-nag-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.1rem;
}
</style>
