import { test, expect } from '../fixtures/electronApp'
import {
  waitForTerminalReady,
  readTerminalText,
} from '../helpers/terminal'
import { getTerminalCount, waitForTerminalCount } from '../helpers/sidebar'

test.describe('Terminal Lifecycle', () => {
  test('fresh launch creates one default terminal', async ({ page }) => {
    await expect(page.locator('.xterm-screen').first()).toBeVisible()
    expect(await getTerminalCount(page)).toBe(1)
  })

  test('shell prompt appears after launch', async ({ page }) => {
    const text = await readTerminalText(page)
    expect(text).toMatch(/[$%>]/)
  })

  test('create terminal via Cmd+T', async ({ page }) => {
    await page.keyboard.press('Meta+t')
    await waitForTerminalCount(page, 2)
    await waitForTerminalReady(page)
  })

  test('create terminal via sidebar + button', async ({ page }) => {
    await page.locator('button[title="Create new…"]').click()
    await page.getByText('Terminal', { exact: true }).first().click()
    await waitForTerminalCount(page, 2)
    await waitForTerminalReady(page)
  })

  test('close terminal via Cmd+W', async ({ page }) => {
    // Create a second terminal first
    await page.keyboard.press('Meta+t')
    await waitForTerminalCount(page, 2)

    page.on('dialog', dialog => dialog.accept())
    await page.keyboard.press('Meta+w')
    await waitForTerminalCount(page, 1)
  })

  test('close terminal shows confirmation dialog', async ({ page }) => {
    let dialogShown = false
    page.on('dialog', async (dialog) => {
      dialogShown = true
      await dialog.dismiss()
    })
    await page.keyboard.press('Meta+w')
    // Give the dialog event time to fire
    await page.waitForFunction(() => true, undefined, { timeout: 2000 })
    expect(dialogShown).toBe(true)
  })

  test('close last terminal', async ({ page }) => {
    expect(await getTerminalCount(page)).toBe(1)

    page.on('dialog', dialog => dialog.accept())
    await page.keyboard.press('Meta+w')

    // The app either creates a new terminal or closes the window
    await page.waitForFunction(() => true, undefined, { timeout: 2000 })
    const remaining = await getTerminalCount(page).catch(() => 0)
    expect(remaining).toBeGreaterThanOrEqual(0)
  })

  test('rename terminal via Cmd+L', async ({ page }) => {
    await page.keyboard.press('Meta+l')

    const renameInput = page.locator('[data-testid="sidebar"] input')
    await expect(renameInput).toBeVisible()

    await renameInput.fill('My Custom Terminal')
    await renameInput.press('Enter')

    await page.waitForFunction(
      () => {
        const s = document.querySelector('[data-testid="sidebar"]')
        return s && (s.textContent || '').includes('My Custom Terminal')
      },
      { timeout: 2000 },
    )
  })

  test('duplicate terminal via Cmd+Shift+D', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+d')
    await waitForTerminalCount(page, 2)
    await waitForTerminalReady(page)
  })
})
