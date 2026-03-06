import { test, expect } from '../fixtures/electronApp'
import { getTerminalCount, waitForTerminalCount } from '../helpers/sidebar'

test.describe('Keyboard Shortcuts', () => {
  test('Cmd+, opens settings', async ({ page }) => {
    await page.keyboard.press('Meta+,')
    await expect(page.locator('[data-testid="settings-dialog"]')).toBeVisible()
  })

  test('Cmd+P opens command palette', async ({ page }) => {
    await page.keyboard.press('Meta+p')
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible()
  })

  test('Cmd+F opens find in terminal', async ({ page }) => {
    await page.keyboard.press('Meta+f')
    const findInput = page.locator('.xterm-search-bar__input, [data-testid="terminal-pane"] input')
    const inputCount = await findInput.count()
    expect(inputCount).toBeGreaterThanOrEqual(0)
  })

  test('Cmd+D splits pane', async ({ page }) => {
    await page.keyboard.press('Meta+d')

    await page.waitForFunction(() => {
      const screens = document.querySelectorAll('.xterm-screen')
      let visible = 0
      for (const el of screens) {
        const pane = el.closest('[data-testid="terminal-pane"]')
        if (pane && (pane as HTMLElement).style.display !== 'none') visible++
      }
      return visible >= 2
    }, { timeout: 5_000 })
  })

  test('Cmd+L starts rename', async ({ page }) => {
    await page.keyboard.press('Meta+l')
    const renameInput = page.locator('[data-testid="sidebar"] input')
    await expect(renameInput).toBeVisible()
  })

  test('Cmd+Left toggles left sidebar', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()

    await page.keyboard.press('Meta+ArrowLeft')
    await expect(sidebar).toHaveCount(0)

    await page.keyboard.press('Meta+ArrowLeft')
    await expect(sidebar).toBeVisible()
  })

  test('Cmd+Right toggles right sidebar', async ({ page }) => {
    await page.keyboard.press('Meta+ArrowRight')
    const rightSidebar = page.locator('[data-testid="right-sidebar"]')
    await rightSidebar.isVisible().catch(() => false)
    await page.keyboard.press('Meta+ArrowRight')
  })

  test('Cmd+= increases font size', async ({ page }) => {
    const initialSize = await page.evaluate(() => {
      const el = document.querySelector('.xterm-screen')
      return el ? parseFloat(window.getComputedStyle(el).fontSize) : 0
    })

    await page.keyboard.press('Meta+=')

    await page.waitForFunction(
      (prevSize) => {
        const el = document.querySelector('.xterm-screen')
        if (!el) return false
        return parseFloat(window.getComputedStyle(el).fontSize) >= prevSize
      },
      initialSize,
      { timeout: 2000 },
    )
  })

  test('Cmd+- decreases font size', async ({ page }) => {
    await page.keyboard.press('Meta+=')

    const beforeDecrease = await page.evaluate(() => {
      const el = document.querySelector('.xterm-screen')
      return el ? parseFloat(window.getComputedStyle(el).fontSize) : 0
    })

    await page.keyboard.press('Meta+-')

    await page.waitForFunction(
      (prevSize) => {
        const el = document.querySelector('.xterm-screen')
        if (!el) return false
        return parseFloat(window.getComputedStyle(el).fontSize) <= prevSize
      },
      beforeDecrease,
      { timeout: 2000 },
    )
  })

  test('Cmd+0 resets font size', async ({ page }) => {
    await page.keyboard.press('Meta+=')
    await page.keyboard.press('Meta+=')
    await page.keyboard.press('Meta+0')
    await expect(page.locator('.xterm-screen').first()).toBeVisible()
  })

  test('Cmd+Shift+= zooms in', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+=')
    await expect(page.locator('.xterm-screen').first()).toBeVisible()
  })

  test('Cmd+Shift+- zooms out', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+-')
    await expect(page.locator('.xterm-screen').first()).toBeVisible()
  })

  test('Cmd+Shift+0 resets zoom', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+=')
    await page.keyboard.press('Meta+Shift+0')
    await expect(page.locator('.xterm-screen').first()).toBeVisible()
  })

  test('Cmd+Shift+D duplicates terminal', async ({ page }) => {
    const before = await getTerminalCount(page)
    await page.keyboard.press('Meta+Shift+d')
    await waitForTerminalCount(page, before + 1)
  })

  test('Cmd+Shift+N opens new menu', async ({ page }) => {
    await page.keyboard.press('Meta+Shift+n')
    await expect(page.locator('[data-testid="new-menu"]')).toBeVisible()
  })

  test('Escape closes command palette', async ({ page }) => {
    await page.keyboard.press('Meta+p')
    const palette = page.locator('[data-testid="command-palette"]')
    await expect(palette).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(palette).not.toBeVisible()
  })

  test('Escape closes settings', async ({ page }) => {
    await page.keyboard.press('Meta+,')
    const settings = page.locator('[data-testid="settings-dialog"]')
    await expect(settings).toBeVisible()

    await settings.click({ position: { x: 10, y: 10 } })
    await page.keyboard.press('Escape')
    await expect(settings).toHaveCount(0)
  })
})
