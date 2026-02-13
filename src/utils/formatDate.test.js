import { describe, it, expect } from 'vitest'
import { formatCourseDate } from './formatDate.js'

describe('formatCourseDate', () => {
  it('retourne une chaîne vide pour valeur falsy', () => {
    expect(formatCourseDate('')).toBe('')
    expect(formatCourseDate(null)).toBe('')
    expect(formatCourseDate(undefined)).toBe('')
  })

  it('formate une date ISO en français', () => {
    const result = formatCourseDate('2025-02-13T14:30:00.000Z')
    expect(result).toMatch(/\d+/)
    expect(result).toMatch(/févr\.|fév\.|février/)
    expect(result).toMatch(/2025/)
  })
})
