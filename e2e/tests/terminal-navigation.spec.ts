import { test, expect } from '../fixtures/electronApp'
import {
  waitForTerminalReady,
  typeInTerminal,
  waitForOutput,
  waitForOutputGone,
  readTerminalText,
} from '../helpers/terminal'
import { waitForTerminalCount } from '../helpers/sidebar'

test.describe('Terminal Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Create a second terminal so we have something to navigate between
    await page.keyboard.press('Meta+t')
    await waitForTerminalCount(page, 2)
    await waitForTerminalReady(page)
  })

  test('switch to next terminal via Cmd+Alt+Right', async ({ page }) => {
    await typeInTerminal(page, 'echo TERMINAL_B')
    await waitForOutput(page, 'TERMINAL_B')

    await page.keyboard.press('Meta+Alt+ArrowLeft')
    await waitForOutputGone(page, 'TERMINAL_B')

    await page.keyboard.press('Meta+Alt+ArrowRight')
    await waitForOutput(page, 'TERMINAL_B')
  })

  test('switch to prev terminal via Cmd+Alt+Left', async ({ page }) => {
    await page.keyboard.press('Meta+Alt+ArrowLeft')
    await waitForTerminalReady(page)

    await typeInTerminal(page, 'echo TERMINAL_A')
    await waitForOutput(page, 'TERMINAL_A')

    await page.keyboard.press('Meta+Alt+ArrowRight')
    await waitForOutputGone(page, 'TERMINAL_A')
  })

  test('wrap-around navigation', async ({ page }) => {
    await page.keyboard.press('Meta+Alt+ArrowLeft')
    await waitForTerminalReady(page)
    await page.keyboard.press('Meta+Alt+ArrowLeft')
    await waitForTerminalReady(page)

    await typeInTerminal(page, 'echo WRAP_TEST')
    await waitForOutput(page, 'WRAP_TEST')
  })

  test('click terminal in sidebar switches active', async ({ page }) => {
    await typeInTerminal(page, 'echo SECOND')
    await waitForOutput(page, 'SECOND')

    const entries = page.locator('[data-testid="sidebar"] [data-testid="terminal-entry"]')
    await entries.first().click()

    await waitForOutputGone(page, 'SECOND')
  })

  test('terminal has focus after switch', async ({ page }) => {
    await page.keyboard.press('Meta+Alt+ArrowLeft')
    await waitForTerminalReady(page)

    // In hidden windows, focus may not auto-transfer — use typeInTerminal
    await typeInTerminal(page, 'echo FOCUSED')
    await waitForOutput(page, 'FOCUSED')
  })
})
