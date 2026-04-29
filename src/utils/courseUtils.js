/**
 * Retourne la classe PrimeIcons pour le type de course (relais / individuel).
 * @param {'relay'|'individual'} [mode] - Mode de la course
 * @returns {string} Classe CSS PrimeIcons (ex. 'pi pi-users', 'pi pi-user')
 */
export function getModeIcon(mode) {
  return mode === 'relay' ? 'pi pi-users' : 'pi pi-user'
}

/**
 * Temps total = somme des durées de tour (lapMs). Si lapMs manque (données anciennes), reconstitue via totalMs cumulés.
 * @param {Array<{ tourNum?: number, lapMs?: number, totalMs?: number }>} passages
 * @returns {number}
 */
export function sumLapMs(passages) {
  if (!Array.isArray(passages) || passages.length === 0) return 0
  const sorted = [...passages].sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
  const allHaveLap = sorted.every((p) => Number.isFinite(p.lapMs))
  if (allHaveLap) {
    return sorted.reduce((s, p) => s + (p.lapMs ?? 0), 0)
  }
  let prev = 0
  let sum = 0
  for (const p of sorted) {
    const t = p.totalMs
    if (t == null) continue
    sum += Math.max(0, t - prev)
    prev = t
  }
  return sum
}

/**
 * Temps de référence pour le tri : somme des tours ; Infinity si aucun passage.
 */
function getRankingTotalMs(participantId, passagesByParticipant) {
  const passages = passagesByParticipant?.[participantId]
  if (!Array.isArray(passages) || passages.length === 0) return Infinity
  return sumLapMs(passages)
}

/**
 * Trie les participants par temps total croissant (plus rapide en premier).
 * Les participants sans passage sont placés à la fin, ordre relatif conservé.
 * @param {Array<{id:string,nom?:string,color?:string}>} participants
 * @param {Object} passagesByParticipant - { [participantId]: [{ tourNum, totalMs }] }
 * @returns {Array} Copie triée des participants
 */
export function sortParticipantsByTotalTimeAsc(participants, passagesByParticipant) {
  if (!Array.isArray(participants)) return []
  if (participants.length <= 1) return [...participants]
  return [...participants].sort((a, b) => {
    const totalA = getRankingTotalMs(a.id, passagesByParticipant)
    const totalB = getRankingTotalMs(b.id, passagesByParticipant)
    if (totalA !== totalB) return totalA - totalB
    return 0 // ordre stable pour ex-aequo
  })
}

/**
 * Durée max. affichée pour une course chargée : max des totaux par participant,
 * chaque total = somme des durées de tour (lapMs), pas le seul dernier totalMs.
 * @param {Object} passagesByParticipant - { [participantId]: [{ lapMs?, totalMs? }] }
 * @returns {number}
 */
export function getMaxTotalMsFromPassages(passagesByParticipant) {
  let max = 0
  for (const passages of Object.values(passagesByParticipant ?? {})) {
    if (!Array.isArray(passages)) continue
    const s = sumLapMs(passages)
    if (s > max) max = s
  }
  return max
}
