import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { execFileSync } from 'child_process'
import { join, resolve, isAbsolute } from 'path'
import { homedir } from 'os'
import fs from 'fs'

import { PtyManager } from './ptyManager'

// macOS GUI apps get a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin).
// Resolve the user's full PATH from their login shell before spawning any PTYs.
if (process.platform === 'darwin') {
  try {
    const loginShell = process.env.SHELL || '/bin/zsh'
    const resolved = execFileSync(loginShell, ['-lc', 'printf "%s" "$PATH"'], {
      encoding: 'utf8',
      timeout: 5000,
    }).trim()
    if (resolved && resolved.includes('/')) {
      process.env.PATH = resolved
    }
  } catch {
    // keep existing PATH
  }
}
import {
  loadPersistedState,
  getSettings,
  updateSettings,
  getWindowState,
  saveWindowState,
  saveWindowBounds,
  removeWindowState,
  getAllWindowStates,
  clearAllData,
} from './stateManager'
import { scanExternalPlugins, removeExternalPlugin, importExternalPlugin, getPluginsDir } from './externalPluginScanner'
import { IPC } from '../shared/ipcChannels'
import type {
  PtyCreateArgs,
  PtyWriteArgs,
  PtyResizeArgs,
  PtyKillArgs,
  PtyGetCwdArgs,
} from '../shared/ipcChannels'
import type { Settings, WindowState } from '../shared/types'
import { v4 as uuidv4 } from 'uuid'
import { pluginMainModules } from '../plugins/registry-main'

const ptyManager = new PtyManager()
const windows = new Set<BrowserWindow>()
const windowIdMap = new Map<number, string>() // webContents.id -> windowId
const windowBoundsCache = new Map<string, { x: number; y: number; width: number; height: number }>()
let handlersRegistered = false
let isQuitting = false
let pendingReset = false

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b[()][AB012]|\x1b[=>]/g, '')
}

function broadcastToAll(channel: string, ...args: unknown[]) {
  for (const win of windows) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args)
  }
}

function registerHandlers() {
  if (handlersRegistered) return
  handlersRegistered = true

  // PTY -> renderer push (broadcast to all windows)
  ptyManager.onData((id, data) => {
    broadcastToAll(IPC.PTY_DATA, { id, data })
  })
  ptyManager.onExit((id, code) => {
    broadcastToAll(IPC.PTY_EXIT, { id, code })
  })

  // IPC handlers
  ipcMain.handle(IPC.APP_GET_DEFAULT_SHELL, () => process.env.SHELL || '/bin/zsh')

  ipcMain.handle(IPC.PTY_CREATE, (_e, args: PtyCreateArgs) => {
    ptyManager.create(args.id, args.cwd, args.cols, args.rows, args.shell)
  })

  ipcMain.handle(IPC.PTY_WRITE, (_e, args: PtyWriteArgs) => {
    ptyManager.write(args.id, args.data)
  })

  ipcMain.handle(IPC.PTY_RESIZE, (_e, args: PtyResizeArgs) => {
    ptyManager.resize(args.id, args.cols, args.rows)
  })

  ipcMain.handle(IPC.PTY_KILL, (_e, args: PtyKillArgs) => {
    ptyManager.kill(args.id)
  })

  ipcMain.handle(IPC.PTY_GET_CWD, (_e, args: PtyGetCwdArgs) => {
    return ptyManager.getCwd(args.id)
  })

  ipcMain.handle(IPC.PTY_HAS_RUNNING_CHILD, (_e, args: { id: string }) => {
    return ptyManager.hasRunningChild(args.id)
  })

  ipcMain.handle(IPC.PTY_FOREGROUND_PROCESS, (_e, args: { id: string }) => {
    return ptyManager.getForegroundProcessName(args.id)
  })

  ipcMain.handle(IPC.PTY_SHELL_PID, (_e, args: { id: string }) =>
    ptyManager.getShellPid(args.id))

  // Window state load: returns { windowState, settings } for the requesting window
  ipcMain.handle(IPC.WINDOW_STATE_LOAD, (event) => {
    const windowId = windowIdMap.get(event.sender.id)
    if (!windowId) return { windowState: null, settings: getSettings() }
    const ws = getWindowState(windowId)
    return { windowState: ws, settings: getSettings() }
  })

  // Window state save: upserts per-window state
  ipcMain.handle(IPC.WINDOW_STATE_SAVE, (event, ws: WindowState) => {
    const windowId = windowIdMap.get(event.sender.id)
    if (!windowId) return
    ws.windowId = windowId
    saveWindowState(windowId, ws)
  })

  // Settings save: updates shared settings, broadcasts to other windows
  ipcMain.handle(IPC.SETTINGS_SAVE, (event, settings: Settings) => {
    updateSettings(settings)
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents.id !== event.sender.id) {
        win.webContents.send(IPC.SETTINGS_CHANGED, settings)
      }
    }
  })

  ipcMain.handle(IPC.OPEN_EXTERNAL_URL, (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
  })

  ipcMain.handle(IPC.OPEN_FILE_IN_EDITOR, (_e, args: { filePath: string; cwd: string; line?: number; column?: number }) => {
    const resolved = isAbsolute(args.filePath)
      ? args.filePath
      : resolve(args.cwd, args.filePath)
    if (!fs.existsSync(resolved)) return
    shell.openPath(resolved)
  })

  ipcMain.handle(IPC.SHOW_OPEN_DIALOG, async (_e, options: Electron.OpenDialogOptions) => {
    return dialog.showOpenDialog(options)
  })

  ipcMain.handle(IPC.HISTORY_READ, async () => {
    const home = homedir()
    const zshPath = join(home, '.zsh_history')
    const bashPath = join(home, '.bash_history')
    let raw = ''
    try { raw = fs.readFileSync(zshPath, 'latin1') }
    catch { try { raw = fs.readFileSync(bashPath, 'utf8') } catch { return [] } }

    const lines = raw.split('\n').filter(Boolean)
    const cmds: string[] = lines.map(l =>
      l.startsWith(':') ? l.replace(/^: \d+:\d+;/, '') : l
    ).filter(Boolean)

    const seen = new Set<string>()
    const result: string[] = []
    for (let i = cmds.length - 1; i >= 0; i--) {
      if (!seen.has(cmds[i])) { seen.add(cmds[i]); result.push(cmds[i]) }
    }
    return result.slice(0, 2000)
  })

  // External plugin handlers
  ipcMain.handle(IPC.EXTERNAL_PLUGINS_SCAN, () => scanExternalPlugins())

  ipcMain.handle(IPC.EXTERNAL_PLUGIN_REMOVE, (_e, pluginId: string) => {
    return removeExternalPlugin(pluginId)
  })

  ipcMain.handle(IPC.EXTERNAL_PLUGIN_IMPORT, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, error: 'Cancelled' }
    }
    return importExternalPlugin(result.filePaths[0])
  })

  ipcMain.handle(IPC.EXTERNAL_PLUGINS_OPEN_DIR, () => {
    shell.openPath(getPluginsDir())
  })

  // Open in new window handler
  ipcMain.handle(IPC.OPEN_IN_NEW_WINDOW, () => {
    createWindow()
  })

  // Delete all saved data and restart fresh (in-process)
  ipcMain.handle(IPC.RESET_ALL_DATA, () => {
    pendingReset = true
    ptyManager.killAll()
    clearAllData()
    // Destroy all windows (skips 'close' event, so saveWindowBounds won't re-write)
    for (const win of BrowserWindow.getAllWindows()) {
      win.destroy()
    }
    windows.clear()
    windowIdMap.clear()
    windowBoundsCache.clear()
    pendingReset = false
    createWindow()
  })

  // Cross-window terminal search
  ipcMain.handle(IPC.TERMINAL_SEARCH_OTHER_WINDOWS, (event, args: { query: string; maxPerTerminal?: number }) => {
    const { query, maxPerTerminal = 50 } = args
    if (!query) return []

    const requestingWindowId = windowIdMap.get(event.sender.id)
    const allStates = getAllWindowStates()
    const lowerQuery = query.toLowerCase()
    const results: Array<{
      terminalId: string
      terminalTitle: string
      windowId: string
      lineIndex: number
      lineText: string
      matchStart: number
      matchLength: number
    }> = []

    for (const ws of allStates) {
      if (ws.windowId === requestingWindowId) continue
      for (const term of ws.terminals) {
        if (!term.scrollback) continue
        const lines = term.scrollback.split(/\r?\n/)
        let count = 0
        for (let i = 0; i < lines.length && count < maxPerTerminal; i++) {
          const clean = stripAnsi(lines[i])
          const lowerLine = clean.toLowerCase()
          let searchFrom = 0
          while (count < maxPerTerminal) {
            const idx = lowerLine.indexOf(lowerQuery, searchFrom)
            if (idx === -1) break
            results.push({
              terminalId: term.id,
              terminalTitle: term.title || 'Terminal',
              windowId: ws.windowId,
              lineIndex: i,
              lineText: clean,
              matchStart: idx,
              matchLength: query.length,
            })
            count++
            searchFrom = idx + 1
          }
        }
      }
    }

    return results
  })

  // Focus a terminal result in another window
  ipcMain.handle(IPC.TERMINAL_FOCUS_RESULT, (_event, args: { windowId: string; terminalId: string; lineIndex: number; matchStart: number; matchLength: number }) => {
    for (const [webContentsId, wId] of windowIdMap) {
      if (wId === args.windowId) {
        for (const win of windows) {
          if (!win.isDestroyed() && win.webContents.id === webContentsId) {
            win.show()
            win.focus()
            win.webContents.send('terminal:activateAndScroll', {
              terminalId: args.terminalId,
              lineIndex: args.lineIndex,
              matchStart: args.matchStart,
              matchLength: args.matchLength,
            })
            return
          }
        }
      }
    }
  })

  // Register plugin-specific handlers
  const getWindows = () => windows
  for (const mod of pluginMainModules) mod.register(getWindows)
}

function createWindow(windowId?: string, bounds?: { x: number; y: number; width: number; height: number }) {
  const id = windowId ?? uuidv4()

  const isTest = process.env.NODE_ENV === 'test'

  const win = new BrowserWindow({
    width: bounds?.width ?? 1200,
    height: bounds?.height ?? 800,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 400,
    minHeight: 300,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  windows.add(win)
  windowIdMap.set(win.webContents.id, id)

  if (!isTest) {
    win.once('ready-to-show', () => win.show())
  }

  const webContentsId = win.webContents.id

  // Cache bounds on every move/resize so we always have them at quit time
  const cacheBounds = () => {
    if (!win.isDestroyed()) {
      const b = win.getBounds()
      windowBoundsCache.set(id, { x: b.x, y: b.y, width: b.width, height: b.height })
    }
  }
  cacheBounds()
  win.on('move', cacheBounds)
  win.on('resize', cacheBounds)

  win.on('close', () => {
    // Persist cached bounds into window state
    const cachedBounds = windowBoundsCache.get(id)
    if (cachedBounds) {
      saveWindowBounds(id, cachedBounds)
    }
  })

  win.on('closed', () => {
    windowIdMap.delete(webContentsId)
    windowBoundsCache.delete(id)
    windows.delete(win)

    // If this is a single-window close (not app quit or reset), remove its persisted state
    if (!isQuitting && !pendingReset) {
      removeWindowState(id)
    }
  })

  // Notify plugins about the first window being ready
  if (windows.size === 1) {
    const getWin = () => windows
    win.webContents.once('did-finish-load', () => {
      for (const mod of pluginMainModules) mod.onWindowReady?.(getWin)
    })
  }

  // Load app — pass windowId via query param
  if (process.env.NODE_ENV === 'development' || process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL']!
    const sep = base.includes('?') ? '&' : '?'
    win.loadURL(`${base}${sep}windowId=${id}`)
    if (windows.size === 1) win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const query: Record<string, string> = { windowId: id }
    if (isTest) query.testMode = '1'
    win.loadFile(join(__dirname, '../renderer/index.html'), { query })
  }
}

app.on('before-quit', () => {
  isQuitting = true
})

// GPU acceleration flags — enable before app is ready
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

app.whenReady().then(() => {
  registerHandlers()

  const persisted = loadPersistedState()
  const settings = persisted.settings
  const savedWindows = persisted.windows

  if (settings?.restoreWindows && savedWindows.length > 0) {
    // Restore all saved windows
    for (const ws of savedWindows) {
      createWindow(ws.windowId, ws.bounds)
    }
  } else {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (pendingReset) return // reset handler manages its own cleanup
  ptyManager.killAll()
  for (const mod of pluginMainModules) mod.cleanup()
  // Remove all ipcMain handlers to avoid duplicate registration on re-open
  Object.values(IPC).forEach(ch => {
    ipcMain.removeHandler(ch)
    ipcMain.removeAllListeners(ch)
  })
  handlersRegistered = false
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  isQuitting = false
  if (windows.size === 0) {
    registerHandlers()

    const persisted = loadPersistedState()
    const settings = persisted.settings
    const savedWindows = persisted.windows

    if (settings?.restoreWindows && savedWindows.length > 0) {
      for (const ws of savedWindows) {
        createWindow(ws.windowId, ws.bounds)
      }
    } else {
      createWindow()
    }
  }
})
