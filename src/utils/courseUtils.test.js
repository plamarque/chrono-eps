import { describe, it, expect } from 'vitest'
import { getMaxTotalMsFromPassages } from './courseUtils.js'

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
