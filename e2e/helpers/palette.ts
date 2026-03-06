import type { Page } from '@playwright/test'

/** Open the command palette with Cmd+P */
export async function openPalette(page: Page) {
  await page.keyboard.press('Meta+p')
  await page.waitForSelector('[data-testid="command-palette"]', {
    timeout: 5_000,
  })
}

/** Open palette, type a query, and press Enter */
export async function runCommand(page: Page, query: string) {
  await openPalette(page)
  await page.keyboard.type(query, { delay: 30 })
  await page.keyboard.press('Enter')
}

/** Close the command palette with Escape */
export async function closePalette(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForSelector('[data-testid="command-palette"]', {
    state: 'hidden',
    timeout: 3_000,
  }).catch(() => {
    // Already closed
  })
}
