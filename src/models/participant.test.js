import { describe, it, expect } from 'vitest'
import {
  createParticipant,
  createRelayGroup,
  createRelayStudent,
  getColorName,
  safeRelayStudentNom,
  COULEURS_PALETTE
} from './participant.js'

describe('createParticipant', () => {
  it('génère un objet avec id, nom et color à partir d\'un nom', () => {
    const p = createParticipant('Alice')
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('nom')
    expect(p).toHaveProperty('color')
    expect(p.nom).toBe('Alice')
  })

  it('génère Elève 1, Elève 2, Elève 3 à partir d\'un numéro', () => {
    expect(createParticipant(1).nom).toBe('Elève 1')
    expect(createParticipant(2).nom).toBe('Elève 2')
    expect(createParticipant(3).nom).toBe('Elève 3')
  })

  it('génère un id unique à chaque appel', () => {
    const p1 = createParticipant('Alice')
    const p2 = createParticipant('Bob')
    expect(p1.id).not.toBe(p2.id)
  })

  it('trim le nom quand c\'est une chaîne', () => {
    const p = createParticipant('  Bob  ')
    expect(p.nom).toBe('Bob')
  })

  it('lance une erreur si le nom est vide', () => {
    expect(() => createParticipant('')).toThrow(
      'Le nom du participant ne peut pas être vide'
    )
  })

  it('lance une erreur si le nom est composé uniquement d\'espaces', () => {
    expect(() => createParticipant('   ')).toThrow(
      'Le nom du participant ne peut pas être vide'
    )
  })
})

describe('createRelayGroup', () => {
  it('génère un objet avec id, nom et color', () => {
    const g = createRelayGroup(0)
    expect(g).toHaveProperty('id')
    expect(g).toHaveProperty('nom')
    expect(g).toHaveProperty('color')
    expect(g.nom).toBe('Groupe 1')
    expect(g.color).toBe(COULEURS_PALETTE[0])
  })

  it('génère les numéros par index (Groupe 1, Groupe 2, etc.)', () => {
    expect(createRelayGroup(0).nom).toBe('Groupe 1')
    expect(createRelayGroup(1).nom).toBe('Groupe 2')
    expect(createRelayGroup(2).nom).toBe('Groupe 3')
    expect(createRelayGroup(5).nom).toBe('Groupe 6')
    expect(createRelayGroup(7).nom).toBe('Groupe 8')
  })

  it('accepte un nom personnalisé', () => {
    const g = createRelayGroup('Équipe A')
    expect(g.nom).toBe('Équipe A')
    expect(g).toHaveProperty('color')
  })

  it('utilise "Groupe 1" comme fallback quand le nom est vide', () => {
    const g = createRelayGroup('')
    expect(g.nom).toBe('Groupe 1')
  })

  it('genère un id unique à chaque appel', () => {
    const g1 = createRelayGroup(0)
    const g2 = createRelayGroup(1)
    expect(g1.id).not.toBe(g2.id)
  })

  it('utilise la couleur fournie si passée', () => {
    const g = createRelayGroup(0, '#abc123')
    expect(g.color).toBe('#abc123')
  })

  it('avec (groupIndex, color), génère Groupe 7 et Groupe 8 avec la couleur fournie', () => {
    const g7 = createRelayGroup(6, '#ef4444')
    expect(g7.nom).toBe('Groupe 7')
    expect(g7.color).toBe('#ef4444')
    const g8 = createRelayGroup(7, '#3b82f6')
    expect(g8.nom).toBe('Groupe 8')
    expect(g8.color).toBe('#3b82f6')
  })
})

describe('createRelayStudent', () => {
  it('génère un objet avec id, nom et ordre', () => {
    const s = createRelayStudent('Alice', 0)
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('nom')
    expect(s).toHaveProperty('ordre')
    expect(s.nom).toBe('Alice')
    expect(s.ordre).toBe(0)
  })

  it('génère Élève 1, Élève 2 à partir d\'un numéro', () => {
    expect(createRelayStudent(1).nom).toBe('Élève 1')
    expect(createRelayStudent(2).nom).toBe('Élève 2')
  })

  it('genère un id unique à chaque appel', () => {
    const s1 = createRelayStudent('Alice', 0)
    const s2 = createRelayStudent('Bob', 1)
    expect(s1.id).not.toBe(s2.id)
  })

  it('utilise ordre 0 par défaut', () => {
    const s = createRelayStudent('Claire')
    expect(s.ordre).toBe(0)
  })

  it('ne produit jamais "Élève NaN" pour un numéro invalide', () => {
    expect(createRelayStudent(NaN).nom).toBe('Élève 1')
    expect(createRelayStudent(undefined).nom).toBe('Élève')
  })
})

describe('safeRelayStudentNom', () => {
  it('retourne le nom si valide', () => {
    expect(safeRelayStudentNom('Alice', 0)).toBe('Alice')
    expect(safeRelayStudentNom('Élève 3', 2)).toBe('Élève 3')
  })

  it('remplace un nom contenant NaN par un fallback', () => {
    expect(safeRelayStudentNom('Élève NaN', 0)).toBe('Élève 1')
    expect(safeRelayStudentNom('Élève NaN', 2)).toBe('Élève 3')
  })

  it('utilise le fallback pour une chaîne vide', () => {
    expect(safeRelayStudentNom('', 0)).toBe('Élève 1')
    expect(safeRelayStudentNom('', 4)).toBe('Élève 5')
  })
})

describe('getColorName', () => {
  it('retourne le nom de couleur pour un hex de la palette', () => {
    expect(getColorName('#ef4444')).toBe('Rouge')
    expect(getColorName('#3b82f6')).toBe('Bleu')
    expect(getColorName('#22c55e')).toBe('Vert')
  })

  it('retourne le nom pour hex en majuscules', () => {
    expect(getColorName('#EF4444')).toBe('Rouge')
  })

  it('retourne "Couleur" pour un hex inconnu', () => {
    expect(getColorName('#000000')).toBe('Couleur')
  })

  it('retourne "Couleur" pour null ou undefined', () => {
    expect(getColorName(null)).toBe('Couleur')
    expect(getColorName(undefined)).toBe('Couleur')
  })
})
