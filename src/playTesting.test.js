import { describe, expect, it } from 'vitest'
import {
  isAndroidUserAgent,
  isStandaloneDisplay,
  markPlayTesterRaceCompleted,
  shouldShowPlayTesterNag,
  snoozePlayTesterNag
} from './playTesting.js'

describe('isAndroidUserAgent', () => {
  it('détecte Android', () => {
    expect(
      isAndroidUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'
      )
    ).toBe(true)
  })

  it('ignore iPhone et desktop', () => {
    expect(isAndroidUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false)
    expect(isAndroidUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
  })
})

describe('isStandaloneDisplay', () => {
  it('détecte display-mode standalone', () => {
    const win = {
      matchMedia: (q) => ({ matches: q.includes('standalone') }),
      navigator: {},
      document: { referrer: '' }
    }
    expect(isStandaloneDisplay(win)).toBe(true)
  })

  it('détecte TWA via referrer android-app', () => {
    const win = {
      matchMedia: () => ({ matches: false }),
      navigator: {},
      document: { referrer: 'android-app://io.github.plamarque.twa/' }
    }
    expect(isStandaloneDisplay(win)).toBe(true)
  })
})

describe('shouldShowPlayTesterNag', () => {
  const android = 'Mozilla/5.0 (Linux; Android 14)'

  it('n’affiche rien avant une course arrêtée', () => {
    expect(
      shouldShowPlayTesterNag({
        userAgent: android,
        raceCompleted: false
      })
    ).toBe(false)
  })

  it('affiche après une course arrêtée sur Android', () => {
    expect(
      shouldShowPlayTesterNag({
        userAgent: android,
        raceCompleted: true
      })
    ).toBe(true)
  })

  it('masque en PWA / TWA standalone', () => {
    expect(
      shouldShowPlayTesterNag({
        userAgent: android,
        standalone: true,
        raceCompleted: true
      })
    ).toBe(false)
  })

  it('respecte le snooze', () => {
    expect(
      shouldShowPlayTesterNag({
        userAgent: android,
        raceCompleted: true,
        snoozeUntil: 2000,
        now: 1000
      })
    ).toBe(false)
  })

  it('force l’affichage avec ?invitePlay=1', () => {
    expect(
      shouldShowPlayTesterNag({
        userAgent: 'Mozilla/5.0 (Macintosh)',
        forceQuery: true
      })
    ).toBe(true)
  })

  it('masque sur la page d’inscription', () => {
    expect(
      shouldShowPlayTesterNag({
        userAgent: android,
        forceQuery: true,
        hideOnInvitePage: true
      })
    ).toBe(false)
  })
})

describe('stockage nag', () => {
  it('marque la course et pose un snooze', () => {
    const storage = new Map()
    const api = {
      getItem: (k) => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v))
    }
    markPlayTesterRaceCompleted(api)
    snoozePlayTesterNag(1000, api)
    expect(api.getItem('chrono-eps-play-tester-race-done')).toBe('1')
    expect(Number(api.getItem('chrono-eps-play-tester-nag-snooze'))).toBeGreaterThan(1000)
  })
})
