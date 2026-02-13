/**
 * Formate une date ISO en format lisible français.
 * @param {string} iso - Date au format ISO (ex. "2025-02-13T14:30:00.000Z")
 * @returns {string}
 */
export function formatCourseDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
