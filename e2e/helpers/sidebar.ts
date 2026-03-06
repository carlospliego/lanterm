import type { Page } from '@playwright/test'

/** Click a terminal entry in the sidebar by its title text */
export async function clickTerminalInSidebar(page: Page, title: string) {
  const sidebar = page.locator('[data-testid="sidebar"]')
  await sidebar.locator(`text="${title}"`).click()
}

/** Get the count of terminal entries in the sidebar */
export async function getTerminalCount(page: Page): Promise<number> {
  const sidebar = page.locator('[data-testid="sidebar"]')
  const entries = sidebar.locator('[data-testid="terminal-entry"]')
  return entries.count()
}

/** Wait until the terminal entry count in the sidebar equals the expected value */
export async function waitForTerminalCount(page: Page, expected: number, timeout = 5_000) {
  await page.waitForFunction(
    (count) => {
      const sidebar = document.querySelector('[data-testid="sidebar"]')
      if (!sidebar) return false
      return sidebar.querySelectorAll('[data-testid="terminal-entry"]').length === count
    },
    expected,
    { timeout },
  )
}

/** Check if the left sidebar is visible */
export async function isSidebarVisible(page: Page): Promise<boolean> {
  const sidebar = page.locator('[data-testid="sidebar"]')
  const box = await sidebar.boundingBox()
  return box !== null && box.width > 0
}
