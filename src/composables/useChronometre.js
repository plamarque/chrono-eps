import { ref, computed, watch, onUnmounted, unref } from 'vue'

const SOLO_ID = '__solo__'

/**
 * @param {import('vue').Ref<Array<{id:string}>>} participantsRef
 * @param {{ mode?: 'individual'|'relay', nbPassagesParEleve?: number, groupStudents?: import('vue').Ref<Object> }|import('vue').Ref} [options]
 */
export function useChronometre(participantsRef, options = {}) {
  const opts = () => unref(options) || {}
  const participantStates = ref({}) // { [id]: { elapsedMs, status } }
  const passagesByParticipant = ref({})
  const chronoEpochMs = ref(null) // Epoch ms du démarrage chrono (pour persistance)
  let animationFrameId = null

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
    if (chronoEpochMs.value == null) {
      chronoEpochMs.value = Date.now() - (participantStates.value[participants.length === 0 ? SOLO_ID : participants[0]?.id]?.elapsedMs ?? 0)
    }
    if (participants.length === 0) {
      const s = ensureParticipantState(SOLO_ID)
      participantStates.value = {
        ...participantStates.value,
        [SOLO_ID]: {
          ...s,
          status: 'running',
          elapsedBeforePause: s.elapsedMs ?? 0,
          startTime: now
        }
      }
    } else {
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
    }
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function stopAll() {
    const states = participantStates.value
    const next = { ...states }
    for (const id of Object.keys(next)) {
      if (next[id].status === 'running') {
        next[id] = {
          ...next[id],
          elapsedBeforePause: next[id].elapsedMs,
          status: 'paused'
        }
      }
    }
    participantStates.value = next
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  function resetAll() {
    const participants = participantsRef?.value ?? []
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    chronoEpochMs.value = null
    const next = {}
    if (participants.length === 0) {
      next[SOLO_ID] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
    } else {
      for (const p of participants) {
        next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
      }
    }
    participantStates.value = next
    passagesByParticipant.value = {}
  }

  function startParticipant(id) {
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
    const s = participantStates.value[id]
    if (!s || s.status !== 'running') return
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
    const s = participantStates.value[participantId]
    if (!s || s.status !== 'running') return
    const { mode = 'individual', groupStudents } = opts()
    const passages = passagesByParticipant.value[participantId] ?? []
    const passageIndex = passages.length
    const totalMs = s.elapsedMs ?? 0
    const lastTotal = passages.length > 0 ? passages[passages.length - 1].totalMs : 0
    const lapMs = totalMs - lastTotal
    const entry = { tourNum: passageIndex + 1, lapMs, totalMs }
    if (mode === 'relay') {
      const students = (unref(groupStudents) ?? {})[participantId] ?? []
      const nbStudents = students.length || 1
      entry.studentIndex = passageIndex % nbStudents
    }
    passagesByParticipant.value = {
      ...passagesByParticipant.value,
      [participantId]: [...passages, entry]
    }
  }

  const elapsedMs = computed(() => {
    const states = participantStates.value
    let max = 0
    for (const s of Object.values(states)) {
      if ((s.elapsedMs ?? 0) > max) max = s.elapsedMs
    }
    return max
  })

  const status = computed(() => {
    const participants = participantsRef?.value ?? []
    const states = participantStates.value
    const ids = participants.length === 0 ? [SOLO_ID] : participants.map((p) => p.id)
    let anyRunning = false
    let anyPaused = false
    for (const id of ids) {
      const s = states[id]
      if (s?.status === 'running') anyRunning = true
      if (s?.status === 'paused') anyPaused = true
    }
    if (anyRunning) return 'running'
    if (anyPaused) return 'paused'
    return 'idle'
  })

  watch(
    () => participantsRef?.value ?? [],
    (participants) => {
      const next = { ...participantStates.value }
      if (participants.length === 0) {
        if (!next[SOLO_ID]) {
          next[SOLO_ID] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
        }
      } else {
        for (const p of participants) {
          if (!next[p.id]) {
            next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
          }
        }
        for (const id of Object.keys(next)) {
          if (id !== SOLO_ID && !participants.some((p) => p.id === id)) {
            delete next[id]
          }
        }
        delete next[SOLO_ID]
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
    recordPassage
  }
}
