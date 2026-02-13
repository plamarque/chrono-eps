import { describe, it, expect } from 'vitest'
import { createParticipant } from './participant.js'

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
