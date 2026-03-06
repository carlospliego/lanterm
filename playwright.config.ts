import { defineConfig } from '@playwright/test'

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 1,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  testMatch: [
    'e2e/tests/**/*.spec.ts',
    'src/plugins/**/*.spec.ts',
  ],
  projects: [
    {
      name: 'electron',
    },
  ],
})
