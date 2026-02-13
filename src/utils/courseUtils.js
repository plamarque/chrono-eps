/**
 * Calcule le temps total maximum à partir des passages (pour affichage chrono d'une course chargée).
 * @param {Object} passagesByParticipant - { [participantId]: [{ totalMs }] }
 * @returns {number}
 */
export function getMaxTotalMsFromPassages(passagesByParticipant) {
  let max = 0
  for (const passages of Object.values(passagesByParticipant ?? {})) {
    if (!Array.isArray(passages)) continue
    for (const p of passages) {
      if ((p.totalMs ?? 0) > max) max = p.totalMs
    }
  }
  return max
}
