import { describe, it, expect } from 'vitest'
import { getMaxTotalMsFromPassages, sortParticipantsByTotalTimeAsc } from './courseUtils.js'

describe('sortParticipantsByTotalTimeAsc', () => {
  it('trie par temps total croissant (plus rapide en premier)', () => {
    const participants = [
      { id: '1', nom: 'Elève 1' },
      { id: '2', nom: 'Elève 2' },
      { id: '3', nom: 'Elève 3' }
    ]
    const passagesByParticipant = {
      '1': [{ tourNum: 1, totalMs: 90000 }],
      '2': [{ tourNum: 1, totalMs: 60000 }],
      '3': [{ tourNum: 1, totalMs: 120000 }]
    }
    const result = sortParticipantsByTotalTimeAsc(participants, passagesByParticipant)
    expect(result.map((p) => p.nom)).toEqual(['Elève 2', 'Elève 1', 'Elève 3'])
  })

  it('place les participants sans passage en fin de liste', () => {
    const participants = [
      { id: '1', nom: 'Avec temps' },
      { id: '2', nom: 'Sans passage' }
    ]
    const passagesByParticipant = { '1': [{ tourNum: 1, totalMs: 50000 }] }
    const result = sortParticipantsByTotalTimeAsc(participants, passagesByParticipant)
    expect(result[0].nom).toBe('Avec temps')
    expect(result[1].nom).toBe('Sans passage')
  })

  it('retourne une copie inchangée pour tableau vide ou un seul participant', () => {
    expect(sortParticipantsByTotalTimeAsc([], {})).toEqual([])
    const single = [{ id: '1', nom: 'Seul' }]
    expect(sortParticipantsByTotalTimeAsc(single, {})).toEqual([{ id: '1', nom: 'Seul' }])
  })

  it('conserve ordre stable pour ex-aequo (même totalMs)', () => {
    const participants = [
      { id: '1', nom: 'Premier' },
      { id: '2', nom: 'Deuxième' }
    ]
    const passagesByParticipant = {
      '1': [{ tourNum: 1, totalMs: 60000 }],
      '2': [{ tourNum: 1, totalMs: 60000 }]
    }
    const result = sortParticipantsByTotalTimeAsc(participants, passagesByParticipant)
    expect(result.map((p) => p.nom)).toEqual(['Premier', 'Deuxième'])
  })
})

describe('getMaxTotalMsFromPassages', () => {
  it('retourne 0 pour objet vide', () => {
    expect(getMaxTotalMsFromPassages({})).toBe(0)
    expect(getMaxTotalMsFromPassages(null)).toBe(0)
    expect(getMaxTotalMsFromPassages(undefined)).toBe(0)
  })

  it('retourne le max totalMs à travers tous les participants', () => {
    const pbp = {
      p1: [
        { tourNum: 1, lapMs: 30000, totalMs: 30000 },
        { tourNum: 2, lapMs: 28000, totalMs: 58000 }
      ],
      p2: [{ tourNum: 1, lapMs: 45000, totalMs: 45000 }]
    }
    expect(getMaxTotalMsFromPassages(pbp)).toBe(58000)
  })

  it('ignore les entrées non-tableau', () => {
    const pbp = {
      p1: [{ tourNum: 1, totalMs: 1000 }],
      p2: 'invalid'
    }
    expect(getMaxTotalMsFromPassages(pbp)).toBe(1000)
  })
})
