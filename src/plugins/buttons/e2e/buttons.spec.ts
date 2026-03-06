import { test, expect } from '../../../../e2e/fixtures/electronApp'
import { activatePlugin } from '../../../../e2e/helpers/plugins'

test.describe('Buttons Plugin', () => {
  test('panel renders when activated', async ({ page }) => {
    await activatePlugin(page, 'Buttons')
    const panel = page.locator('[data-testid="plugin-panel-buttons"]')
    await expect(panel).toBeVisible()
  })

  test('panel has title', async ({ page }) => {
    await activatePlugin(page, 'Buttons')
    const panel = page.locator('[data-testid="plugin-panel-buttons"]')
    await expect(panel).toContainText('Buttons')
  })

  test('panel has content', async ({ page }) => {
    await activatePlugin(page, 'Buttons')
    const panel = page.locator('[data-testid="plugin-panel-buttons"]')
    const text = await panel.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })

  test('has add button UI', async ({ page }) => {
    await activatePlugin(page, 'Buttons')
    const panel = page.locator('[data-testid="plugin-panel-buttons"]')
    // The panel should have an add button for creating new buttons
    const addBtn = panel.locator('button[title="New button"]')
    await expect(addBtn.first()).toBeVisible()
  })
})
