import { test, expect } from '../../../../e2e/fixtures/electronApp'
import { activatePlugin, installPlugin } from '../../../../e2e/helpers/plugins'

test.describe('Vim Shortcuts Plugin', () => {
  test('can be installed from Plugin Gallery', async ({ page }) => {
    await installPlugin(page, 'Vim Shortcuts')

    // After install, the plugin should appear in the activity bar
    const activityBar = page.locator('[data-testid="activity-bar"]')
    const btn = activityBar.locator('button[title*="Vim Shortcuts"]')
    await expect(btn).toBeVisible()
  })

  test('panel renders after install', async ({ page }) => {
    await activatePlugin(page, 'Vim Shortcuts')
    const panel = page.locator('[data-testid="plugin-panel-vimShortcuts"]')
    await expect(panel).toBeVisible()
  })

  test('panel has title after install', async ({ page }) => {
    await activatePlugin(page, 'Vim Shortcuts')
    const panel = page.locator('[data-testid="plugin-panel-vimShortcuts"]')
    await expect(panel).toContainText('Vim Shortcuts')
  })
})
