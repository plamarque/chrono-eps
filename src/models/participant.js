/** Palette : rouge, bleu, jaune, orange, violet, vert (réutilisée cycliquement au-delà de 6 groupes) */
export const COULEURS_PALETTE = [
  '#ef4444', '#3b82f6', '#eab308', '#f97316',
  '#8b5cf6', '#22c55e'
]

/** Noms des couleurs pour les groupes par défaut */
export const COULEURS_NOMS = ['Rouge', 'Bleu', 'Jaune', 'Orange', 'Violet', 'Vert']

/** Retourne le nom de la couleur pour un hex donné. */
export function getColorName(hex) {
  const idx = COULEURS_PALETTE.findIndex((c) => c.toLowerCase() === (hex ?? '').toLowerCase())
  return idx >= 0 ? COULEURS_NOMS[idx] : 'Couleur'
}

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

/**
 * Crée un groupe relais.
 * DOMAIN : Groupe (relais) = ensemble ordonné d'élèves.
 * @param {string|number} nomOrIndex - Nom du groupe, ou index (0-based) pour auto-génération (Groupe 1, Groupe 2, ...)
 * @param {string} [color] - Couleur hex du groupe (optionnelle)
 * @returns {{ id: string, nom: string, color: string }}
 */
export function createRelayGroup(nomOrIndex, color) {
  let nom
  const colorIndex = typeof nomOrIndex === 'number' ? nomOrIndex : 0
  const groupColor = color ?? COULEURS_PALETTE[Math.max(0, colorIndex) % COULEURS_PALETTE.length]
  if (typeof nomOrIndex === 'number') {
    nom = `Groupe ${colorIndex + 1}`
  } else {
    const trimmed = typeof nomOrIndex === 'string' ? nomOrIndex.trim() : ''
    nom = trimmed || 'Groupe 1'
  }
  return {
    id: crypto.randomUUID(),
    nom,
    color: groupColor
  }
}

/**
 * Crée un élève dans un groupe relais.
 * La couleur est une propriété du groupe, pas de l'élève.
 * @param {string|number} nomOrIndex - Nom de l'élève ou numéro pour auto-génération
 * @param {number} ordre - Position dans l'ordre de course (0-based)
 * @returns {{ id: string, nom: string, ordre: number }}
 */
export function createRelayStudent(nomOrIndex, ordre = 0) {
  let nom
  if (typeof nomOrIndex === 'number') {
    nom = `Élève ${nomOrIndex}`
  } else {
    const trimmed = typeof nomOrIndex === 'string' ? nomOrIndex.trim() : ''
    nom = trimmed || 'Élève'
  }
  return {
    id: crypto.randomUUID(),
    nom,
    ordre
  }
}
