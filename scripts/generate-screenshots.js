#!/usr/bin/env node
/**
 * Génère les screenshots pour App Store et Play Store.
 * Usage: npm run screenshots
 * Option: SCREENSHOTS_URL=https://... npx node scripts/generate-screenshots.js (pour cibler une URL)
 */
import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdir } from 'fs/promises'
import { SCENARIOS } from './screenshot-scenarios.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const screenshotsDir = join(root, 'public', 'screenshots')

const BASE_URL = process.env.SCREENSHOTS_URL || 'http://localhost:4174/chrono-eps'

// Viewport = taille logique (CSS pixels) ; deviceScaleFactor = facteur pour la résolution image
// Résolution image = viewport × deviceScaleFactor (ex: 428×926 × 3 = 1284×2778)
const VIEWPORTS = {
  'ios/iphone': {
    viewport: { width: 428, height: 926 },
    deviceScaleFactor: 3,
    suffix: 'iphone-portrait',
    // Résolution sortie: 1284×2778
  },
  'ios/ipad': {
    viewport: { width: 1366, height: 1024 },
    deviceScaleFactor: 2,
    suffix: 'ipad-paysage',
    // Résolution sortie: 2732×2048 (App Store 13" Display)
    // Alternative 2752×2064 (Pro M4/M5): viewport 1376×1032
  },
  'android/smartphone': {
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 3,
    suffix: 'smart-portrait',
    // Résolution sortie: 1080×1920
  },
  'android/tablet': {
    viewport: { width: 640, height: 360 },
    deviceScaleFactor: 3,
    suffix: 'tablet-paysage',
    // Résolution sortie: 1920×1080 (Play Store tablette, paysage)
  },
}

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

async function main() {
  let previewProc = null

  if (!process.env.SCREENSHOTS_URL) {
    console.log('Build et démarrage du serveur preview...')
    const build = spawn('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true })
    await new Promise((resolve, reject) => {
      build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed: ${code}`))))
    })

    previewProc = spawn('npx', ['vite', 'preview', '--config', 'vite.preview-e2e.config.js'], {
      cwd: root,
      stdio: 'pipe',
      shell: true,
    })

    const ready = await waitForServer(`${BASE_URL}/`)
    if (!ready) {
      previewProc.kill()
      throw new Error('Le serveur preview n\'a pas démarré à temps.')
    }
    console.log('Serveur prêt.')
  }

  const browser = await chromium.launch({ headless: true })

  try {
    for (const [viewportKey, config] of Object.entries(VIEWPORTS)) {
      const { viewport, deviceScaleFactor, suffix } = config
      const outDir = join(screenshotsDir, viewportKey)
      await mkdir(outDir, { recursive: true })

      const context = await browser.newContext({
        viewport,
        deviceScaleFactor,
        baseURL: BASE_URL,
      })

      for (const scenario of SCENARIOS) {
        const page = await context.newPage()
        try {
          await scenario.setup(page)
          await page.waitForLoadState('networkidle').catch(() => {})
          await page.waitForTimeout(500)

          const filename = `chrono-eps-${scenario.id}-${suffix}.png`
          const path = join(outDir, filename)
          await page.screenshot({ path, fullPage: false })
          console.log(`  ${viewportKey}/${filename}`)
        } finally {
          await page.close()
        }
      }

      await context.close()
    }
    console.log('Screenshots générés dans public/screenshots/')
  } finally {
    await browser.close()
    if (previewProc) {
      previewProc.kill()
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
