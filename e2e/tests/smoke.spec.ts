import { test, expect } from '../fixtures/electronApp'
import { typeInTerminal, waitForOutput } from '../helpers/terminal'
import { getTerminalCount, waitForTerminalCount } from '../helpers/sidebar'

test.describe('Smoke Tests', () => {
  test('app launches and shows a terminal', async ({ page }) => {
    const xtermScreen = page.locator('.xterm-screen')
    await expect(xtermScreen.first()).toBeVisible()

    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()
    const entries = sidebar.locator('[data-testid="terminal-entry"]')
    expect(await entries.count()).toBeGreaterThanOrEqual(1)
  })

  test('echo hello produces output', async ({ page }) => {
    await typeInTerminal(page, 'echo hello')
    await waitForOutput(page, 'hello')
  })

  test('Cmd+T creates a second terminal', async ({ page }) => {
    const initialCount = await getTerminalCount(page)
    await page.keyboard.press('Meta+t')
    await waitForTerminalCount(page, initialCount + 1)
  })
})
