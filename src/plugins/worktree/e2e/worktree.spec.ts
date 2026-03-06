import { test, expect } from '../../../../e2e/fixtures/electronApp'
import { activatePlugin } from '../../../../e2e/helpers/plugins'

test.describe('Worktree Plugin', () => {
  test('panel renders when activated', async ({ page }) => {
    await activatePlugin(page, 'Worktrees')
    const panel = page.locator('[data-testid="plugin-panel-worktree"]')
    await expect(panel).toBeVisible()
  })

  test('panel has title', async ({ page }) => {
    await activatePlugin(page, 'Worktrees')
    const panel = page.locator('[data-testid="plugin-panel-worktree"]')
    await expect(panel).toContainText('Worktrees')
  })

  test('panel has content', async ({ page }) => {
    await activatePlugin(page, 'Worktrees')
    const panel = page.locator('[data-testid="plugin-panel-worktree"]')
    const text = await panel.textContent()
    expect(text!.length).toBeGreaterThan(0)
  })
})
