import { test, expect } from '../../../../e2e/fixtures/electronApp'
import { activatePlugin } from '../../../../e2e/helpers/plugins'

test.describe('File Browser Plugin', () => {
  test('panel renders when activated', async ({ page }) => {
    await activatePlugin(page, 'Files')
    const panel = page.locator('[data-testid="plugin-panel-fileBrowser"]')
    await expect(panel).toBeVisible()
  })

  test('panel has title', async ({ page }) => {
    await activatePlugin(page, 'Files')
    const panel = page.locator('[data-testid="plugin-panel-fileBrowser"]')
    await expect(panel).toContainText('Files')
  })

  test('panel has content', async ({ page }) => {
    await activatePlugin(page, 'Files')
    const panel = page.locator('[data-testid="plugin-panel-fileBrowser"]')
    const text = await panel.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })
})
