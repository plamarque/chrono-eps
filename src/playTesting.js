/** Inscription test fermé Play (même URL pour la piste alpha). */
export const PLAY_TESTER_OPT_IN_URL =
  'https://play.google.com/apps/testing/io.github.plamarque.twa'

/** Groupe Google ouvert, aussi enregistré dans Play Console → Tests fermés → Testers. */
export const PLAY_TESTER_GROUP_URL = 'https://groups.google.com/g/chrono-eps-testers'

export const PLAY_TESTER_RACE_DONE_KEY = 'chrono-eps-play-tester-race-done'
export const PLAY_TESTER_NAG_SNOOZE_KEY = 'chrono-eps-play-tester-nag-snooze'
export const PLAY_TESTER_NAG_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000

export function isAndroidUserAgent(ua = '') {
  return /android/i.test(ua)
}

export function isStandaloneDisplay(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return false
  if (typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches) {
    return true
  }
  if (win.navigator?.standalone === true) return true
  const referrer = win.document?.referrer ?? ''
  return /android-app:\/\//.test(referrer)
}

export function markPlayTesterRaceCompleted(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  storage?.setItem(PLAY_TESTER_RACE_DONE_KEY, '1')
  if (typeof window !== 'undefined' && storage === localStorage) {
    window.dispatchEvent(new Event('chrono-eps-play-tester-usage'))
  }
}

export function snoozePlayTesterNag(
  now = Date.now(),
  storage = typeof localStorage !== 'undefined' ? localStorage : null
) {
  storage?.setItem(PLAY_TESTER_NAG_SNOOZE_KEY, String(now + PLAY_TESTER_NAG_SNOOZE_MS))
}

export function readPlayTesterNagState(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  return {
    raceCompleted: storage?.getItem(PLAY_TESTER_RACE_DONE_KEY) === '1',
    snoozeUntil: Number(storage?.getItem(PLAY_TESTER_NAG_SNOOZE_KEY) || 0)
  }
}

/** Après une course arrêtée, sur Android navigateur. ?invitePlay=1 force l’affichage. */
export function shouldShowPlayTesterNag({
  userAgent = '',
  standalone = false,
  raceCompleted = false,
  snoozeUntil = 0,
  hideOnInvitePage = false,
  forceQuery = false,
  now = Date.now()
} = {}) {
  if (hideOnInvitePage) return false
  if (forceQuery) return true
  if (standalone) return false
  if (!isAndroidUserAgent(userAgent)) return false
  if (!raceCompleted) return false
  if (snoozeUntil > now) return false
  return true
}
