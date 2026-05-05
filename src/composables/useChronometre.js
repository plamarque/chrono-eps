import { ref, computed, watch, onUnmounted, unref } from 'vue'

const SOLO_ID = '__solo__'

/**
 * @param {import('vue').Ref<Array<{id:string}>>} participantsRef
 * @param {{ mode?: 'individual'|'relay', nbPassagesPerRunner?: number, groupRunners?: import('vue').Ref<Object> }|import('vue').Ref} [options]
 */
export function useChronometre(participantsRef, options = {}) {
  const opts = () => unref(options) || {}
  const participantStates = ref({}) // { [id]: { elapsedMs, status } }
  const passagesByParticipant = ref({})
  /** Individuel : dernier total connu avant le 1er passage (souvent = chrono principal à l’ajout de la carte). */
  const individualJoinBaselineMs = ref({})
  const chronoEpochMs = ref(null) // Epoch ms du démarrage chrono (pour persistance)
  /** Incrémenté à chaque frame tant qu’au moins un coureur est en course — force le recalcul des computeds (elapsedMs) qui lisent elapsedMs. */
  const tickEpoch = ref(0)
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
      tickEpoch.value++
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function startAll() {
    const participants = participantsRef?.value ?? []
    const now = performance.now()

    if (chronoEpochMs.value == null) {
      const firstId = participants[0]?.id
      chronoEpochMs.value = Date.now() - (participantStates.value[firstId]?.elapsedMs ?? 0)
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

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(tick)
    }
  }

  function stopAll() {
    const states = participantStates.value
    const next = { ...states }
    for (const id of Object.keys(next)) {
      if (next[id].status === 'running') {
        recordPassage(id, { source: isIndividual() ? 'stop' : undefined })
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
    individualJoinBaselineMs.value = {}
    const next = {}
    for (const p of participants) {
      next[p.id] = { elapsedMs: 0, status: 'idle', elapsedBeforePause: 0, startTime: 0 }
    }
    participantStates.value = next
    passagesByParticipant.value = {}
  }

  /**
   * Individuel : positionne un coureur ajouté au temps principal affiché à l’instant T (sans passage).
   * @param {string} participantId
   * @param {number} joinMs — temps du chrono principal à l’instant T (état `elapsedMs` du coureur).
   * @param {boolean} [firstLapFromRaceStart] — si vrai (coureur rejoint la course déjà lancée, même départ fictif que les autres), le **premier** tour est mesuré depuis **0** (départ course), pas depuis `joinMs` ; les tours suivants restent deltas entre totals.
   */
  function seedIndividualParticipantAtJoin(participantId, joinMs, firstLapFromRaceStart = false) {
    if (!isIndividual()) return
    const j = Math.max(0, joinMs ?? 0)
    const lapBaselineMs = firstLapFromRaceStart ? 0 : j
    individualJoinBaselineMs.value = {
      ...individualJoinBaselineMs.value,
      [participantId]: lapBaselineMs
    }
    const prev = participantStates.value[participantId] ?? {
      elapsedMs: 0,
      status: 'idle',
      elapsedBeforePause: 0,
      startTime: 0
    }
    participantStates.value = {
      ...participantStates.value,
      [participantId]: {
        ...prev,
        elapsedMs: j,
        elapsedBeforePause: j,
        status: 'idle',
        startTime: 0
      }
    }
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
    recordPassage(id, { source: isIndividual() ? 'stop' : undefined })
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

  /**
   * Individuel : après un passage déjà enregistré (ex. clic « Coureur »),
   * fige le participant sur le total du dernier passage sans ajouter de ligne.
   * Évite que plusieurs cartes restent « running » avec le même temps global jusqu’au Stop principal.
   */
  function pauseParticipantAtRecordedTotal(participantId) {
    if (!isIndividual()) return
    const s = participantStates.value[participantId]
    if (!s || s.status !== 'running') return
    const passages = passagesByParticipant.value[participantId] ?? []
    if (passages.length === 0) return
    const totalMs = passages[passages.length - 1].totalMs
    participantStates.value = {
      ...participantStates.value,
      [participantId]: {
        ...s,
        elapsedMs: totalMs,
        elapsedBeforePause: totalMs,
        status: 'paused'
      }
    }
    const anyRunning = Object.values(participantStates.value).some((x) => x.status === 'running')
    if (!anyRunning) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function recordPassage(participantId, options = {}) {
    const s = participantStates.value[participantId]
    if (!s || s.status !== 'running') return
    const passages = passagesByParticipant.value[participantId] ?? []
    const passageIndex = passages.length
    const totalMs = s.elapsedMs ?? 0
    const lastTotal =
      passages.length > 0
        ? passages[passages.length - 1].totalMs
        : isIndividual()
          ? (individualJoinBaselineMs.value[participantId] ?? 0)
          : 0
    const lapMs = totalMs - lastTotal
    const entry = { tourNum: passageIndex + 1, lapMs, totalMs }
    if (options.source) entry.source = options.source
    if (isRelay()) {
      const { groupRunners } = opts()
      const runners = (unref(groupRunners) ?? {})[participantId] ?? []
      const nbRunners = runners.length || 1
      entry.studentIndex = passageIndex % nbRunners
    }
    passagesByParticipant.value = {
      ...passagesByParticipant.value,
      [participantId]: [...passages, entry]
    }
  }

  const elapsedMs = computed(() => {
    void tickEpoch.value
    const participants = participantsRef?.value ?? []
    const states = participantStates.value
    let max = 0
    for (const p of participants) {
      const s = states[p.id]
      if (s && (s.elapsedMs ?? 0) > max) max = s.elapsedMs
    }
    return max
  })

  const status = computed(() => {
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
  })

  watch(
    [participantsRef, () => unref(options)?.mode],
    () => {
      const participants = participantsRef?.value ?? []
      const next = { ...participantStates.value }
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
      if (isIndividual()) {
        const base = { ...individualJoinBaselineMs.value }
        for (const id of Object.keys(base)) {
          if (!participants.some((p) => p.id === id)) {
            delete base[id]
          }
        }
        individualJoinBaselineMs.value = base
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
    individualJoinBaselineMs,
    chronoEpochMs,
    start: startAll,
    stop: stopAll,
    reset: resetAll,
    startParticipant,
    stopParticipant,
    pauseParticipantAtRecordedTotal,
    recordPassage,
    seedIndividualParticipantAtJoin
  }
}
