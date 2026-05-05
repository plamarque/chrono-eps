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
 * Crée un participant (coureur).
 * DOMAIN : Coureur identifié par nom ou identifiant.
 * @param {string|number} nomOrIndex - Nom du participant, ou numéro pour auto-génération (P1, P2, ...)
 * @param {string} [color] - Couleur hex (optionnelle)
 * @returns {{ id: string, nom: string, color: string }}
 */
export function createParticipant(nomOrIndex, color) {
  let nom
  if (typeof nomOrIndex === 'number') {
    nom = `Coureur ${nomOrIndex}`
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
 * DOMAIN : Groupe (relais) = ensemble ordonné de coureurs.
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
 * Crée un coureur dans un groupe relais.
 * La couleur est une propriété du groupe, pas du coureur.
 * En usage courant, `nomOrIndex` numérique est la position **1-based dans le groupe** (Coureur 1, Coureur 2…), pas un index global entre groupes.
 * @param {string|number} nomOrIndex - Nom du coureur ou numéro pour auto-génération (`Coureur N`)
 * @param {number} ordre - Position dans l'ordre de course (0-based)
 * @returns {{ id: string, nom: string, ordre: number }}
 */
export function createRelayRunner(nomOrIndex, ordre = 0) {
  let nom
  if (typeof nomOrIndex === 'number') {
    const n = Number.isFinite(nomOrIndex) ? Math.max(1, Math.floor(nomOrIndex)) : 1
    nom = `Coureur ${n}`
  } else {
    const trimmed = typeof nomOrIndex === 'string' ? nomOrIndex.trim() : ''
    nom = trimmed || 'Coureur'
  }
  return {
    id: crypto.randomUUID(),
    nom,
    ordre
  }
}

/**
 * Nom d'affichage sûr pour un coureur relais (évite "Coureur NaN" sur données existantes).
 * @param {string} nom - Nom stocké
 * @param {number} fallbackIndex - Index 0-based pour le fallback (ex. 0 → "Coureur 1")
 */
export function safeRelayRunnerNom(nom, fallbackIndex = 0) {
  const trimmed = (nom ?? '').trim()
  const hasInvalidNaNToken = /\bnan\b/i.test(trimmed)
  if (trimmed && !hasInvalidNaNToken) return trimmed
  const n = Number.isFinite(fallbackIndex) ? Math.max(1, fallbackIndex + 1) : 1
  return `Coureur ${n}`
}
