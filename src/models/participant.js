/** Palette : rouge, bleu, jaune, orange, violet, vert */
export const COULEURS_PALETTE = [
  '#ef4444', '#3b82f6', '#eab308', '#f97316',
  '#8b5cf6', '#22c55e'
]

/**
 * Crée un participant (élève).
 * DOMAIN : Élève identifié par nom ou identifiant.
 * @param {string|number} nomOrIndex - Nom du participant, ou numéro pour auto-génération (P1, P2, ...)
 * @param {string} [color] - Couleur hex (optionnelle)
 * @returns {{ id: string, nom: string, color: string }}
 */
export function createParticipant(nomOrIndex, color) {
  let nom
  if (typeof nomOrIndex === 'number') {
    nom = `Elève ${nomOrIndex}`
  } else {
    const trimmed = typeof nomOrIndex === 'string' ? nomOrIndex.trim() : ''
    if (!trimmed) {
      throw new Error('Le nom du participant ne peut pas être vide')
    }
    nom = trimmed
  }
  const colorIndex = typeof nomOrIndex === 'number' ? (nomOrIndex - 1) : 0
  const participantColor = color ?? COULEURS_PALETTE[Math.max(0, colorIndex) % COULEURS_PALETTE.length]
  return {
    id: crypto.randomUUID(),
    nom,
    color: participantColor
  }
}
