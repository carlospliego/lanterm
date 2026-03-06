import { test, expect } from '../fixtures/electronApp'
import {
  typeInTerminal,
  waitForOutput,
  waitForPrompt,
  readTerminalText,
} from '../helpers/terminal'

test.describe('Terminal I/O', () => {
  test('echo produces output', async ({ page }) => {
    await typeInTerminal(page, 'echo hello')
    await waitForOutput(page, 'hello')
  })

  test('colored output renders', async ({ page }) => {
    await typeInTerminal(page, 'printf "\\033[31mred\\033[0m"')
    await waitForOutput(page, 'red')
  })

  test('long output scrolls', async ({ page }) => {
    await typeInTerminal(page, 'seq 1 200')
    await waitForOutput(page, '200', 10_000)
  })

  test('interactive command (cat)', async ({ page }) => {
    await typeInTerminal(page, 'cat')

    await page.keyboard.type('test input')
    await page.keyboard.press('Enter')

    await waitForOutput(page, 'test input')

    await page.keyboard.press('Control+d')
  })

  test('stderr output displays', async ({ page }) => {
    await typeInTerminal(page, 'ls /nonexistent_dir_12345')
    await waitForOutput(page, 'No such file or directory')
  })

  test('special characters display correctly', async ({ page }) => {
    await typeInTerminal(page, 'echo "hello world & goodbye"')
    await waitForOutput(page, 'hello world & goodbye')
  })

  test('Ctrl+C interrupts running command', async ({ page }) => {
    await typeInTerminal(page, 'cat')
    await page.keyboard.press('Control+c')
    await waitForPrompt(page)

    await typeInTerminal(page, 'echo recovered')
    await waitForOutput(page, 'recovered')
  })
})
