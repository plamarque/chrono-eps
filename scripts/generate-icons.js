#!/usr/bin/env node
/**
 * Génère les icônes PWA et iOS à partir de la source pwa-512x512.png.
 * Applique un dégradé moderne (bleu → violet) aux parties colorées.
 * Aligne iOS sur Android : icône plate sans bordure/ombre intégrée.
 *
 * Usage: node scripts/generate-icons.js
 * Prérequis: public/pwa-512x512.png (source)
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')
const IOS_APPICON = path.join(ROOT, 'ios', 'Chrono EPS', 'Assets.xcassets', 'AppIcon.appiconset')

// Dégradé moderne : bleu soutenu → violet
const GRADIENT = {
  from: { r: 37, g: 99, b: 235 },   // #2563eb
  to: { r: 124, g: 58, b: 237 }     // #7c3aed
}

// Seuil pour considérer un pixel comme "bleu" (pas blanc)
function isColored(r, g, b) {
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255
  return luminance < 0.95 || (r < 250 && g < 250 && b < 250)
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function gradientAt(x, y, width, height) {
  const t = (x / width + y / height) / 2
  return {
    r: lerp(GRADIENT.from.r, GRADIENT.to.r, t),
    g: lerp(GRADIENT.from.g, GRADIENT.to.g, t),
    b: lerp(GRADIENT.from.b, GRADIENT.to.b, t)
  }
}

async function applyGradient(inputPath, outputPath) {
  const img = sharp(inputPath)
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      if (isColored(r, g, b)) {
        const c = gradientAt(x, y, width, height)
        data[i] = c.r
        data[i + 1] = c.g
        data[i + 2] = c.b
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath)
}

async function resize(inputPath, outputPath, size) {
  await sharp(inputPath)
    .resize(size, size)
    .png()
    .toFile(outputPath)
}

function parseScale(s) {
  if (!s || s === '1x') return 1
  const m = s.match(/^(\d+)x$/)
  return m ? parseInt(m[1], 10) : 1
}

function getIosSizes(contentsPath) {
  const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'))
  const seen = new Map()
  for (const img of contents.images) {
    const [w] = (img.size || '1024x1024').split('x').map(Number)
    const scale = parseScale(img.scale)
    const size = Math.round(w * scale)
    if (!seen.has(img.filename) || seen.get(img.filename) !== size) {
      seen.set(img.filename, size)
    }
  }
  return [...seen.entries()].map(([filename, size]) => ({ filename, size }))
}

async function main() {
  const source = path.join(PUBLIC, 'pwa-512x512.png')
  if (!fs.existsSync(source)) {
    console.error('Erreur: public/pwa-512x512.png introuvable')
    process.exit(1)
  }

  console.log('Génération des icônes avec dégradé bleu→violet...')

  // 1. Créer version temporaire avec dégradé
  const temp512 = path.join(ROOT, '.tmp-icon-512.png')
  await applyGradient(source, temp512)

  // 2. PWA : 512 et 192
  const pwa512 = path.join(PUBLIC, 'pwa-512x512.png')
  const pwa192 = path.join(PUBLIC, 'pwa-192x192.png')
  await sharp(temp512).png().toFile(pwa512)
  await resize(temp512, pwa192, 192)
  console.log('  ✓ PWA: pwa-512x512.png, pwa-192x192.png')

  // 3. iOS AppIcon
  const contentsPath = path.join(IOS_APPICON, 'Contents.json')
  if (fs.existsSync(IOS_APPICON) && fs.existsSync(contentsPath)) {
    const iosSizes = getIosSizes(contentsPath)
    for (const { filename, size } of iosSizes) {
      const out = path.join(IOS_APPICON, filename)
      await resize(temp512, out, size)
    }
    console.log(`  ✓ iOS: ${iosSizes.length} tailles dans AppIcon.appiconset`)

    // Ajouter pre-rendered pour éviter les effets iOS superflus (aligné Android)
    const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'))
    if (!contents.properties) contents.properties = {}
    contents.properties['pre-rendered'] = true
    fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2))
    console.log('  ✓ iOS: pre-rendered activé (aligné Android, sans effets superflus)')
  }

  fs.unlinkSync(temp512)
  console.log('\nIcônes générées.')
  console.log('Android : régénérées au prochain build Bubblewrap (après déploiement sur GitHub Pages).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
