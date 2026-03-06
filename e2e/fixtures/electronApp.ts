import { test as base, _electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

export type TestFixtures = {
  electronApp: ElectronApplication
  page: Page
  userDataDir: string
}

export const test = base.extend<TestFixtures>({
  userDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'term-test-'))
    await use(dir)
    fs.rmSync(dir, { recursive: true, force: true })
  },

  electronApp: async ({ userDataDir }, use) => {
    // Pre-seed state to skip onboarding
    fs.writeFileSync(
      path.join(userDataDir, 'appState.json'),
      JSON.stringify({ onboardingComplete: true }),
    )

    const app = await _electron.launch({
      args: [
        path.resolve(__dirname, '../../out/main/index.js'),
        `--user-data-dir=${userDataDir}`,
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    await use(app)
    await app.close()
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    // Wait for React to hydrate and terminal to mount
    await page.waitForSelector('.xterm-screen', { timeout: 30_000 })
    // Dismiss onboarding tour if it appears
    const skipBtn = page.locator('button', { hasText: 'Skip' })
    await skipBtn.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {})
    if (await skipBtn.isVisible()) {
      await skipBtn.click()
    }
    // Wait for shell prompt to appear
    await page.waitForFunction(
      () => {
        const panes = document.querySelectorAll('[data-testid="terminal-pane"]')
        for (const pane of panes) {
          if ((pane as HTMLElement).style.display === 'none') continue
          const rows = pane.querySelectorAll('.xterm-rows > div')
          if (rows.length > 0) {
            const content = Array.from(rows).map(row => row.textContent ?? '').join('\n')
            const trimmed = content.trimEnd()
            if (/[$%>]\s*$/.test(trimmed) || /[$%>] /.test(content)) return true
          }
        }
        return false
      },
      { timeout: 15_000 },
    )
    await use(page)
  },
})

export { expect } from '@playwright/test'
