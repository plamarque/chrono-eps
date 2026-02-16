import { ref, computed, watch, onUnmounted, unref } from 'vue'

/**
 * Calcule la position interpolée sur la piste (en tours) pour un participant à un instant donné.
 * position = N + (T - T1) / (T2 - T1) entre deux passages (N à T1, N+1 à T2).
 * Avant le premier passage : interpolation de 0 à 1 de t=0 à firstTotal (tous partent en même temps au top chrono).
 * @param {Array<{tourNum:number,totalMs:number}>} passages - Passages triés par tourNum
 * @param {number} currentMs - Temps écoulé (ms depuis le début)
 * @returns {{ position: number, hasStarted: boolean }} position en tours (0+), hasStarted si le participant a démarré (t=0)
 */
export function getPositionAtTime(passages, currentMs) {
  if (!Array.isArray(passages) || passages.length === 0) {
    return { position: 0, hasStarted: false }
  }
  const firstTotal = passages[0].totalMs ?? 0
  // Avant le premier passage : tous partent à t=0, interpolation position 0→1 sur le premier tour
  if (currentMs < firstTotal) {
    if (currentMs < 0) return { position: 0, hasStarted: false }
    const fraction = firstTotal <= 0 ? 1 : Math.min(1, currentMs / firstTotal)
    return { position: fraction, hasStarted: true }
  }
  const lastPassage = passages[passages.length - 1]
  const lastTotal = lastPassage.totalMs ?? 0
  if (currentMs >= lastTotal) {
    return { position: lastPassage.tourNum ?? passages.length, hasStarted: true }
  }
  for (let i = 0; i < passages.length - 1; i++) {
    const p1 = passages[i]
    const p2 = passages[i + 1]
    const T1 = p1.totalMs ?? 0
    const T2 = p2.totalMs ?? 0
    if (currentMs >= T1 && currentMs <= T2) {
      const N = p1.tourNum ?? (i + 1)
      const fraction = T2 === T1 ? 1 : (currentMs - T1) / (T2 - T1)
      const position = N + fraction
      return { position, hasStarted: true }
    }
  }
  return { position: 0, hasStarted: false }
}

/**
 * Pour le mode relais : détermine l'index du coureur actuel à l'instant currentMs.
 * Après un passage par studentIndex S, le prochain coureur est (S+1) % nbStudents.
 * @param {Array<{tourNum:number,totalMs:number,studentIndex?:number}>} passages
 * @param {number} currentMs
 * @param {number} nbStudents - Nombre d'élèves dans le groupe
 * @returns {number} Index du coureur actuel (0 à nbStudents-1), ou 0 si pas encore parti
 */
export function getCurrentRunnerIndexAtTime(passages, currentMs, nbStudents = 1) {
  if (!Array.isArray(passages) || passages.length === 0 || nbStudents < 1) {
    return 0
  }
  const firstTotal = passages[0].totalMs ?? 0
  if (currentMs < firstTotal) {
    return 0
  }
  for (let i = passages.length - 1; i >= 0; i--) {
    const p = passages[i]
    const T = p.totalMs ?? 0
    if (currentMs >= T) {
      const lastIndex = p.studentIndex ?? 0
      return (lastIndex + 1) % nbStudents
    }
  }
  return 0
}

/**
 * Composable pour le replay : playback avec play/pause, slider, et calcul des positions.
 * @param {Object} course - Course chargée (participants, passagesByParticipant, groupStudents, mode)
 * @param {Object} options - { speedMultiplier?: number } (1 = temps réel)
 */
export function useReplay(course, options = {}) {
  const speedMultiplier = options.speedMultiplier ?? 1
  const currentMs = ref(0)
  const isPlaying = ref(false)
  const speedMultiplierRef = ref(speedMultiplier)

  const maxTotalMs = computed(() => {
    const c = unref(course)
    if (!c?.passagesByParticipant) return 0
    let max = 0
    for (const passages of Object.values(c.passagesByParticipant)) {
      if (!Array.isArray(passages)) continue
      for (const p of passages) {
        if ((p.totalMs ?? 0) > max) max = p.totalMs
      }
    }
    return max
  })

  let animationFrameId = null
  let lastTickTime = 0

  function tick(now) {
    if (!isPlaying.value) return
    const dt = lastTickTime ? now - lastTickTime : 0
    lastTickTime = now
    const newMs = currentMs.value + dt * speedMultiplierRef.value
    currentMs.value = Math.min(newMs, maxTotalMs.value)
    if (currentMs.value >= maxTotalMs.value) {
      isPlaying.value = false
    }
    animationFrameId = requestAnimationFrame(tick)
  }

  function play() {
    if (currentMs.value >= maxTotalMs.value) {
      currentMs.value = 0
    }
    isPlaying.value = true
    lastTickTime = 0
    animationFrameId = requestAnimationFrame(tick)
  }

  function pause() {
    isPlaying.value = false
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function seek(ms) {
    pause()
    currentMs.value = Math.max(0, Math.min(ms, maxTotalMs.value))
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function reset() {
    pause()
    currentMs.value = 0
  }

  watch(
    [() => unref(course)?.passagesByParticipant, maxTotalMs],
    () => {
      if (currentMs.value > maxTotalMs.value) {
        currentMs.value = maxTotalMs.value
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    pause()
  })

  return {
    currentMs,
    isPlaying,
    maxTotalMs,
    play,
    pause,
    seek,
    togglePlay,
    reset,
    setSpeed: (s) => { speedMultiplierRef.value = s }
  }
}
