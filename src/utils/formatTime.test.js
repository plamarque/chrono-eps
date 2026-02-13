import { describe, it, expect } from 'vitest'
import { formatTime } from './formatTime.js'

describe('formatTime', () => {
  it('formats 0 as 00:00.00', () => {
    expect(formatTime(0)).toBe('00:00.00')
  })

  it('formats milliseconds to mm:ss.ms', () => {
    expect(formatTime(45230)).toBe('00:45.23') // 45 sec, 23 centis
  })

  it('formats 1 min 5 sec 43 centis', () => {
    expect(formatTime(65432)).toBe('01:05.43')
  })

  it('formats 59.99 seconds', () => {
    expect(formatTime(59999)).toBe('00:59.99')
  })

  it('formats exactly 1 minute', () => {
    expect(formatTime(60000)).toBe('01:00.00')
  })

  it('returns 00:00.00 for negative values', () => {
    expect(formatTime(-1)).toBe('00:00.00')
  })

  it('returns 00:00.00 for NaN', () => {
    expect(formatTime(NaN)).toBe('00:00.00')
  })

  it('returns 00:00.00 for Infinity', () => {
    expect(formatTime(Infinity)).toBe('00:00.00')
  })

  it('returns 00:00.00 for non-number', () => {
    expect(formatTime('123')).toBe('00:00.00')
    expect(formatTime(null)).toBe('00:00.00')
    expect(formatTime(undefined)).toBe('00:00.00')
  })
})
