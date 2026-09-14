import { cpSync, mkdirSync } from 'fs'
import { resolve } from 'path'

/** GitHub Pages n’a pas de rewrite SPA : dupliquer index.html pour les routes profondes. */
export function spaFallbackDirs(dirs = ['devenir-testeur']) {
  return {
    name: 'spa-fallback-dirs',
    enforce: 'post',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist')
      const index = resolve(dist, 'index.html')
      for (const dir of dirs) {
        mkdirSync(resolve(dist, dir), { recursive: true })
        cpSync(index, resolve(dist, dir, 'index.html'))
      }
    }
  }
}
