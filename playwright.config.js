import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:4174/chrono-eps',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.REUSE_SERVER
    ? undefined
    : {
        command: 'npx vite preview --config vite.preview-e2e.config.js',
        url: 'http://localhost:4174/chrono-eps/',
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
      },
})
