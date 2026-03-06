import type { Page } from '@playwright/test'

/**
 * Ensure a plugin is installed and its panel is visible.
 * On fresh test launches, no plugins are installed by default.
 */
export async function activatePlugin(page: Page, pluginName: string) {
  const activityBar = page.locator('[data-testid="activity-bar"]')
  const btn = activityBar.locator(`button[title*="${pluginName}"]`)

  // If the plugin button isn't in the activity bar yet, install it via gallery
  if (await btn.count() === 0) {
    await installPlugin(page, pluginName)
  }

  // After install, the first plugin auto-activates. Check if the right sidebar
  // is already visible before clicking (clicking an active plugin toggles it off).
  const rightSidebar = page.locator('[data-testid="right-sidebar"]')
  const isVisible = await rightSidebar.isVisible().catch(() => false)
  if (!isVisible) {
    await btn.click({ timeout: 5_000 })
    await rightSidebar.waitFor({ state: 'visible', timeout: 5_000 })
  }
}

/** Install a plugin via the Plugin Gallery */
export async function installPlugin(page: Page, pluginName: string) {
  // Open Plugin Gallery
  const galleryBtn = page.locator('button[title="Plugin gallery"]')
  await galleryBtn.click()
  const gallery = page.locator('[data-testid="plugin-gallery"]')
  await gallery.waitFor({ state: 'visible', timeout: 5_000 })

  // Click the plugin row to select it
  await gallery.locator(`text=${pluginName}`).first().click()

  // Click Install
  const installBtn = gallery.locator('button', { hasText: 'Install' })
  await installBtn.click({ timeout: 3_000 })

  // Close gallery
  await page.keyboard.press('Escape')
  await gallery.waitFor({ state: 'hidden', timeout: 3_000 }).catch(() => {})
}
