import { test, expect } from '../../../../e2e/fixtures/electronApp'
import { activatePlugin } from '../../../../e2e/helpers/plugins'

test.describe('Git Plugin', () => {
  test('panel renders when activated', async ({ page }) => {
    await activatePlugin(page, 'Git')
    const panel = page.locator('[data-testid="plugin-panel-git"]')
    await expect(panel).toBeVisible()
  })

  test('panel has title', async ({ page }) => {
    await activatePlugin(page, 'Git')
    const panel = page.locator('[data-testid="plugin-panel-git"]')
    await expect(panel).toContainText('Git')
  })

  test('panel has content', async ({ page }) => {
    await activatePlugin(page, 'Git')
    const panel = page.locator('[data-testid="plugin-panel-git"]')
    const text = await panel.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })
})
