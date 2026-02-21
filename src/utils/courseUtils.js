/**
 * Retourne le temps total (totalMs) du dernier passage d'un participant.
 * @param {string} participantId
 * @param {Object} passagesByParticipant - { [participantId]: [{ tourNum, totalMs }] }
 * @returns {number} totalMs du dernier passage, ou Infinity si aucun passage
 */
function getLastTotalMs(participantId, passagesByParticipant) {
  const passages = passagesByParticipant?.[participantId]
  if (!Array.isArray(passages) || passages.length === 0) return Infinity
  const sorted = [...passages].sort((a, b) => (a.tourNum ?? 0) - (b.tourNum ?? 0))
  const last = sorted[sorted.length - 1]
  return last?.totalMs ?? Infinity
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
    const totalA = getLastTotalMs(a.id, passagesByParticipant)
    const totalB = getLastTotalMs(b.id, passagesByParticipant)
    if (totalA !== totalB) return totalA - totalB
    return 0 // ordre stable pour ex-aequo
  })
}

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
