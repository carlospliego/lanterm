import { ipcMain, type BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { BUTTONS_IPC } from '../shared/channels'
import type { ButtonRunArgs } from '../shared/types'
import { broadcast } from '../../plugin-main'
import os from 'os'

const running = new Map<string, ChildProcess>()

export function registerButtonsHandlers(getWindows: () => Set<BrowserWindow>) {
  ipcMain.handle(BUTTONS_IPC.RUN, (_event, args: ButtonRunArgs) => {
    const { buttonId, command, cwd } = args
    const resolvedCwd = cwd || os.homedir()

    // Don't start if already running
    if (running.has(buttonId)) {
      return { pid: running.get(buttonId)!.pid }
    }

    const startTime = Date.now()
    const child = spawn(command, [], {
      shell: true,
      cwd: resolvedCwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    running.set(buttonId, child)

    const sendOutput = (data: Buffer) => {
      broadcast(getWindows, BUTTONS_IPC.OUTPUT, buttonId, data.toString())
    }

    child.stdout?.on('data', sendOutput)
    child.stderr?.on('data', sendOutput)

    child.on('close', (code) => {
      running.delete(buttonId)
      const durationMs = Date.now() - startTime
      broadcast(getWindows, BUTTONS_IPC.EXIT, buttonId, code ?? 1, durationMs)
    })

    child.on('error', (err) => {
      running.delete(buttonId)
      const durationMs = Date.now() - startTime
      broadcast(getWindows, BUTTONS_IPC.OUTPUT, buttonId, `Error: ${err.message}\n`)
      broadcast(getWindows, BUTTONS_IPC.EXIT, buttonId, 1, durationMs)
    })

    return { pid: child.pid }
  })

  ipcMain.handle(BUTTONS_IPC.KILL, (_event, buttonId: string) => {
    const child = running.get(buttonId)
    if (child && child.pid) {
      try {
        process.kill(-child.pid)
      } catch {
        try { child.kill() } catch { /* already dead */ }
      }
      running.delete(buttonId)
      return { ok: true }
    }
    return { ok: false }
  })
}

export function unregisterButtonsHandlers() {
  // Kill all running processes
  for (const [, child] of running) {
    try { child.kill() } catch { /* ignore */ }
  }
  running.clear()

  ipcMain.removeHandler(BUTTONS_IPC.RUN)
  ipcMain.removeHandler(BUTTONS_IPC.KILL)
}
