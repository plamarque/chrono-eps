#!/usr/bin/env node
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const proc = spawn('npx', ['vite', 'preview', '--config', 'vite.preview-e2e.config.js'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

proc.on('error', (err) => {
  console.error(err)
  process.exit(1)
})

proc.on('exit', (code) => {
  process.exit(code ?? 0)
})
