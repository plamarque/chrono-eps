import { ref, computed, watch, onUnmounted, unref } from 'vue'

const SOLO_ID = '__solo__'
const RACE_ID = '__race__'

/**
 * @param {import('vue').Ref<Array<{id:string}>>} participantsRef
 * @param {{ mode?: 'individual'|'relay', nbPassagesPerRunner?: number, groupRunners?: import('vue').Ref<Object> }|import('vue').Ref} [options]
 */
export function useChronometre(participantsRef, options = {}) {
  const opts = () => unref(options) || {}
  const participantStates = ref({}) // { [id]: { elapsedMs, status } }
  const passagesByParticipant = ref({})
  const chronoEpochMs = ref(null) // Epoch ms du démarrage chrono (pour persistance)
  let animationFrameId = null

  function isRelay() {
    return opts().mode === 'relay'
  }

  function isIndividual() {
    return opts().mode !== 'relay'
  }

  function ensureParticipantState(id) {
    if (!participantStates.value[id]) {
      participantStates.value = {
        ...participantStates.value,
        [id]: { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
      }
    }
    return participantStates.value[id]
  }

  function tick() {
    const states = participantStates.value
    let anyRunning = false
    const now = performance.now()
    for (const id of Object.keys(states)) {
      const s = states[id]
      if (s.status === 'running') {
        anyRunning = true
        s.elapsedMs = s.elapsedBeforePause + (now - s.startTime)
      }
    }
    if (anyRunning) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function startAll() {
    const participants = participantsRef?.value ?? []
    const now = performance.now()

    if (isRelay()) {
      if (chronoEpochMs.value == null) {
        chronoEpochMs.value =
          Date.now() - (participantStates.value[participants[0]?.id]?.elapsedMs ?? 0)
      }
      const next = { ...participantStates.value }
      for (const p of participants) {
        const s = ensureParticipantState(p.id)
        next[p.id] = {
          ...s,
          status: 'running',
          elapsedBeforePause: s.elapsedMs ?? 0,
          startTime: now
        }
      }
      participantStates.value = next
    } else {
      // Individuel : une seule horloge de course (RACE_ID), indépendante des lignes coureur
      if (chronoEpochMs.value == null) {
        const s = participantStates.value[RACE_ID]
        chronoEpochMs.value = Date.now() - (s?.elapsedMs ?? 0)
      }
      const s = ensureParticipantState(RACE_ID)
      participantStates.value = {
        ...participantStates.value,
        [RACE_ID]: {
          ...s,
          status: 'running',
          elapsedBeforePause: s.elapsedMs ?? 0,
          startTime: now
        }
      }
    }

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function stopAll() {
    if (isRelay()) {
      const states = participantStates.value
      const next = { ...states }
      for (const id of Object.keys(next)) {
        if (next[id].status === 'running') {
          recordPassage(id)
          next[id] = {
            ...next[id],
            elapsedBeforePause: next[id].elapsedMs,
            status: 'paused'
          }
        }
      }
      participantStates.value = next
    } else {
      const s = participantStates.value[RACE_ID]
      if (!s || s.status !== 'running') return
      const now = performance.now()
      const elapsedMsAtStop = s.elapsedBeforePause + (now - s.startTime)
      participantStates.value = {
        ...participantStates.value,
        [RACE_ID]: {
          ...s,
          elapsedMs: elapsedMsAtStop,
          elapsedBeforePause: elapsedMsAtStop,
          status: 'paused',
          startTime: 0
        }
      }
    }
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  function resetAll() {
    const participants = participantsRef?.value ?? []
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    chronoEpochMs.value = null
    const next = {}
    if (isRelay()) {
      for (const p of participants) {
        next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
      }
    } else {
      next[RACE_ID] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
      for (const p of participants) {
        next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
      }
    }
    participantStates.value = next
    passagesByParticipant.value = {}
  }

  function startParticipant(id) {
    if (!isRelay()) return
    const s = ensureParticipantState(id)
    if (s.status === 'running') return
    if (chronoEpochMs.value == null) {
      chronoEpochMs.value = Date.now() - (s.elapsedMs ?? 0)
    }
    const now = performance.now()
    participantStates.value = {
      ...participantStates.value,
      [id]: {
        ...s,
        status: 'running',
        elapsedBeforePause: s.elapsedMs ?? 0,
        startTime: now
      }
    }
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function stopParticipant(id) {
    if (!isRelay()) return
    const s = participantStates.value[id]
    if (!s || s.status !== 'running') return
    recordPassage(id)
    participantStates.value = {
      ...participantStates.value,
      [id]: {
        ...s,
        elapsedBeforePause: s.elapsedMs,
        status: 'paused'
      }
    }
    const anyRunning = Object.values(participantStates.value).some((x) => x.status === 'running')
    if (!anyRunning) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function recordPassage(participantId) {
    if (!isRelay()) return
    const s = participantStates.value[participantId]
    if (!s || s.status !== 'running') return
    const { groupRunners } = opts()
    const passages = passagesByParticipant.value[participantId] ?? []
    const passageIndex = passages.length
    const totalMs = s.elapsedMs ?? 0
    const lastTotal = passages.length > 0 ? passages[passages.length - 1].totalMs : 0
    const lapMs = totalMs - lastTotal
    const entry = { tourNum: passageIndex + 1, lapMs, totalMs }
    const runners = (unref(groupRunners) ?? {})[participantId] ?? []
    const nbRunners = runners.length || 1
    entry.studentIndex = passageIndex % nbRunners
    passagesByParticipant.value = {
      ...passagesByParticipant.value,
      [participantId]: [...passages, entry]
    }
  }

  /**
   * Individuel séquentiel : enregistre une arrivée (un seul passage) sans chrono par coureur.
   * @param {string} participantId
   * @param {number} totalMs
   */
  function recordArrivalForParticipant(participantId, totalMs) {
    if (isRelay()) return
    const entry = { tourNum: 1, lapMs: totalMs, totalMs }
    passagesByParticipant.value = {
      ...passagesByParticipant.value,
      [participantId]: [entry]
    }
  }

  /** Temps courant de l'horloge de course (individuel). */
  function getRaceElapsedMs() {
    if (isRelay()) return 0
    const s = participantStates.value[RACE_ID]
    if (!s) return 0
    if (s.status !== 'running') return s.elapsedMs ?? 0
    const now = performance.now()
    return s.elapsedBeforePause + (now - s.startTime)
  }

  const elapsedMs = computed(() => {
    if (isRelay()) {
      const states = participantStates.value
      let max = 0
      for (const s of Object.values(states)) {
        if ((s.elapsedMs ?? 0) > max) max = s.elapsedMs
      }
      return max
    }
    const s = participantStates.value[RACE_ID]
    if (!s) return 0
    // En cours : tick() met elapsedMs à jour chaque frame — il faut lire cette prop
    // pour que le computed se recalcule (évite performance.now() sans dépendance réactive).
    return s.elapsedMs ?? 0
  })

  const status = computed(() => {
    if (isRelay()) {
      const participants = participantsRef?.value ?? []
      const states = participantStates.value
      let anyRunning = false
      let anyPaused = false
      for (const p of participants) {
        const s = states[p.id]
        if (s?.status === 'running') anyRunning = true
        if (s?.status === 'paused') anyPaused = true
      }
      if (anyRunning) return 'running'
      if (anyPaused) return 'paused'
      return 'idle'
    }
    const s = participantStates.value[RACE_ID]
    if (s?.status === 'running') return 'running'
    if (s?.status === 'paused') return 'paused'
    return 'idle'
  })

  watch(
    [participantsRef, () => unref(options)?.mode],
    () => {
      const participants = participantsRef?.value ?? []
      const next = { ...participantStates.value }
      if (isRelay()) {
        delete next[RACE_ID]
        delete next[SOLO_ID]
        for (const p of participants) {
          if (!next[p.id]) {
            next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
          }
        }
        for (const id of Object.keys(next)) {
          if (!participants.some((p) => p.id === id)) {
            delete next[id]
          }
        }
      } else {
        delete next[SOLO_ID]
        const prevRace = next[RACE_ID] ?? {
          elapsedMs: 0,
          status: 'idle',
          elapsedBeforePause: 0,
          startTime: 0
        }
        next[RACE_ID] = prevRace
        for (const p of participants) {
          if (!next[p.id]) {
            next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
          }
        }
        for (const id of Object.keys(next)) {
          if (id === RACE_ID) continue
          if (!participants.some((p) => p.id === id)) {
            delete next[id]
          }
        }
      }
      participantStates.value = next
    },
    { immediate: true, deep: true }
  )

  onUnmounted(() => {
    cancelAnimationFrame(animationFrameId)
  })

  return {
    elapsedMs,
    status,
    participantStates,
    passagesByParticipant,
    chronoEpochMs,
    start: startAll,
    stop: stopAll,
    reset: resetAll,
    startParticipant,
    stopParticipant,
    recordPassage,
    recordArrivalForParticipant,
    getRaceElapsedMs
  }
}
