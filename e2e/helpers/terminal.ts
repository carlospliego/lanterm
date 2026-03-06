import type { Page } from '@playwright/test'

/** Wait for a terminal to be ready (xterm screen + shell prompt) */
export async function waitForTerminalReady(page: Page, timeout = 10_000) {
  await page.waitForFunction(() => {
    const panes = document.querySelectorAll('[data-testid="terminal-pane"]')
    for (const pane of panes) {
      if ((pane as HTMLElement).style.display === 'none') continue
      if (pane.querySelector('.xterm-screen')) return true
    }
    return false
  }, { timeout })
  await waitForPrompt(page, timeout)
}

/** Get the active (visible) terminal pane */
function activeTerminalSelector() {
  return '[data-testid="terminal-pane"][style*="display: flex"] .xterm-screen'
}

/** Type a command into the active terminal and press Enter */
export async function typeInTerminal(page: Page, command: string) {
  const screen = page.locator(activeTerminalSelector()).first()
  await screen.click()
  await page.keyboard.type(command, { delay: 5 })
  await page.keyboard.press('Enter')
}

/** Wait until the terminal output contains the given text */
export async function waitForOutput(
  page: Page,
  text: string,
  timeout = 5_000,
) {
  await page.waitForFunction(
    (searchText) => {
      const panes = document.querySelectorAll('[data-testid="terminal-pane"]')
      for (const pane of panes) {
        if ((pane as HTMLElement).style.display === 'none') continue
        const rows = pane.querySelectorAll('.xterm-rows > div')
        if (rows.length > 0) {
          const content = Array.from(rows).map(row => row.textContent ?? '').join('\n')
          if (content.includes(searchText)) return true
        }
      }
      return false
    },
    text,
    { timeout },
  )
}

/** Wait until the active terminal does NOT contain the given text */
export async function waitForOutputGone(
  page: Page,
  text: string,
  timeout = 5_000,
) {
  await page.waitForFunction(
    (searchText) => {
      const panes = document.querySelectorAll('[data-testid="terminal-pane"]')
      for (const pane of panes) {
        if ((pane as HTMLElement).style.display === 'none') continue
        const rows = pane.querySelectorAll('.xterm-rows > div')
        if (rows.length > 0) {
          const content = Array.from(rows).map(r => r.textContent ?? '').join('\n')
          return !content.includes(searchText)
        }
      }
      return true
    },
    text,
    { timeout },
  )
}

/** Read all visible text from the active terminal pane */
export async function readTerminalText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const panes = document.querySelectorAll('[data-testid="terminal-pane"]')
    for (const pane of panes) {
      const style = (pane as HTMLElement).style
      if (style.display === 'none') continue
      const rows = pane.querySelectorAll('.xterm-rows > div')
      if (rows.length > 0) {
        return Array.from(rows)
          .map(row => row.textContent ?? '')
          .join('\n')
      }
    }
    const rows = document.querySelectorAll('.xterm-rows > div')
    return Array.from(rows)
      .map(row => row.textContent ?? '')
      .join('\n')
  })
}

/** Wait for a shell prompt character ($ or %) to appear */
export async function waitForPrompt(page: Page, timeout = 10_000) {
  await page.waitForFunction(
    () => {
      const panes = document.querySelectorAll('[data-testid="terminal-pane"]')
      for (const pane of panes) {
        if ((pane as HTMLElement).style.display === 'none') continue
        const rows = pane.querySelectorAll('.xterm-rows > div')
        if (rows.length > 0) {
          const content = Array.from(rows).map(row => row.textContent ?? '').join('\n')
          const trimmed = content.trimEnd()
          if (/[$%>]\s*$/.test(trimmed) || /[$%>] /.test(content)) return true
        }
      }
      return false
    },
    { timeout },
  )
}
