import { test, expect } from '../../../../e2e/fixtures/electronApp'
import { activatePlugin } from '../../../../e2e/helpers/plugins'

test.describe('Claude History Plugin', () => {
  test('panel renders when activated', async ({ page }) => {
    await activatePlugin(page, 'Claude')
    const panel = page.locator('[data-testid="plugin-panel-claudeHistory"]')
    await expect(panel).toBeVisible()
  })

  test('panel has title', async ({ page }) => {
    await activatePlugin(page, 'Claude')
    const panel = page.locator('[data-testid="plugin-panel-claudeHistory"]')
    await expect(panel).toContainText('Claude History')
  })

  test('panel has content', async ({ page }) => {
    await activatePlugin(page, 'Claude')
    const panel = page.locator('[data-testid="plugin-panel-claudeHistory"]')
    const text = await panel.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })
})
