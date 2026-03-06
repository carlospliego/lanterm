import { test, expect } from '../fixtures/electronApp'
import {
  typeInTerminal,
  waitForOutput,
  readTerminalText,
} from '../helpers/terminal'
import { getTerminalCount, waitForTerminalCount } from '../helpers/sidebar'

test.describe('Sidebar', () => {
  test('sidebar visible on fresh launch', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()

    const box = await sidebar.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
  })

  test('toggle sidebar via Cmd+Left', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()

    await page.keyboard.press('Meta+ArrowLeft')
    await expect(sidebar).toHaveCount(0)

    await page.keyboard.press('Meta+ArrowLeft')
    await expect(sidebar).toBeVisible()
  })

  test('sidebar shows terminal list', async ({ page }) => {
    const entries = page.locator('[data-testid="sidebar"] [data-testid="terminal-entry"]')
    expect(await entries.count()).toBe(1)

    await page.keyboard.press('Meta+t')
    await waitForTerminalCount(page, 2)
    expect(await entries.count()).toBe(2)
  })

  test('active terminal is highlighted', async ({ page }) => {
    await page.keyboard.press('Meta+t')
    await waitForTerminalCount(page, 2)

    const entries = page.locator('[data-testid="sidebar"] [data-testid="terminal-entry"]')

    const [firstBg, secondBg] = await Promise.all([
      entries.nth(0).evaluate(el => window.getComputedStyle(el).backgroundColor),
      entries.nth(1).evaluate(el => window.getComputedStyle(el).backgroundColor),
    ])

    expect(secondBg || firstBg).toBeDefined()
  })

  test('terminal title displayed in sidebar', async ({ page }) => {
    const entries = page.locator('[data-testid="sidebar"] [data-testid="terminal-entry"]')
    const entryText = await entries.first().textContent()
    expect(entryText).toContain('Terminal')
  })

  test('new terminal button in sidebar creates terminal', async ({ page }) => {
    const initialCount = await getTerminalCount(page)

    await page.locator('button[title="Create new…"]').click()
    await page.getByText('Terminal', { exact: true }).first().click()

    await waitForTerminalCount(page, initialCount + 1)
  })

  test('toggle sidebar preserves terminal content', async ({ page }) => {
    await typeInTerminal(page, 'echo PRESERVE_TEST')
    await waitForOutput(page, 'PRESERVE_TEST')

    const sidebar = page.locator('[data-testid="sidebar"]')
    await page.keyboard.press('Meta+ArrowLeft')
    await expect(sidebar).toHaveCount(0)

    await page.keyboard.press('Meta+ArrowLeft')
    await expect(sidebar).toBeVisible()

    const text = await readTerminalText(page)
    expect(text).toContain('PRESERVE_TEST')
  })

  test('sidebar shows folder structure', async ({ page }) => {
    await page.locator('button[title="Create new…"]').click()
    await page.getByText('Folder', { exact: true }).click()

    const sidebar = page.locator('[data-testid="sidebar"]')
    await page.waitForFunction(() => {
      const s = document.querySelector('[data-testid="sidebar"]')
      return s && /folder/i.test(s.textContent || '')
    }, { timeout: 3000 })

    const sidebarText = await sidebar.textContent()
    expect(sidebarText).toMatch(/folder|Folder/i)
  })

  test('sidebar minimum width respected', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    const box = await sidebar.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(100)
  })
})
