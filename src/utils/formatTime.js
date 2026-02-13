/**
 * Formatte un temps en millisecondes au format mm:ss.ms (DOMAIN §5).
 * @param {number} ms - Durée en millisecondes
 * @returns {string} - Format mm:ss.ms (ex. "01:05.43")
 */
export function formatTime(ms) {
  if (typeof ms !== 'number' || ms < 0 || !Number.isFinite(ms)) {
    return '00:00.00'
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centis = Math.floor((ms % 1000) / 10)
  const pad2 = (n) => String(n).padStart(2, '0')
  return `${pad2(minutes)}:${pad2(seconds)}.${pad2(centis)}`
}
