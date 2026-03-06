import { app } from 'electron'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { AppState, Settings, WindowState, PersistedState } from '../shared/types'

const STATE_FILE = join(app.getPath('userData'), 'appState.json')

let cachedState: PersistedState | null = null

function readRawFile(): unknown | null {
  try {
    const raw = readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeToDisk(): void {
  if (!cachedState) return
  try {
    writeFileSync(STATE_FILE, JSON.stringify(cachedState, null, 2), 'utf-8')
  } catch (err) {
    console.error('[stateManager] Failed to save state:', err)
  }
}

/** Migrate old flat AppState to PersistedState v2 */
function migrateV1(old: AppState): PersistedState {
  const { settings, ...rest } = old
  const windowId = uuidv4()
  const windowState: WindowState = {
    windowId,
    folders: rest.folders ?? [],
    terminals: rest.terminals ?? [],
    activeTerminalId: rest.activeTerminalId ?? null,
    sidebarOpen: rest.sidebarOpen ?? true,
    rightSidebarOpen: rest.rightSidebarOpen ?? true,
    splitLayouts: rest.splitLayouts ?? [],
    focusedPaneId: rest.focusedPaneId ?? null,
    fontSize: rest.fontSize ?? 13,
    appZoom: rest.appZoom ?? 0,
    panelCollapsed: rest.panelCollapsed ?? {},
    sidebarWidth: rest.sidebarWidth ?? 220,
    rightSidebarWidth: rest.rightSidebarWidth ?? 260,
    favoriteIds: rest.favoriteIds ?? [],
    installedPlugins: rest.installedPlugins ?? [],
    commandHistory: rest.commandHistory ?? [],
    trashedItems: rest.trashedItems ?? [],
    lastActiveTerminalByFolder: rest.lastActiveTerminalByFolder ?? {},
  }
  // Copy any plugin state keys
  for (const [key, val] of Object.entries(rest)) {
    if (!(key in windowState)) {
      windowState[key] = val
    }
  }
  return {
    version: 2,
    settings: settings ?? {} as Settings,
    windows: [windowState],
  }
}

export function loadPersistedState(): PersistedState {
  if (cachedState) return cachedState

  const raw = readRawFile()
  if (!raw || typeof raw !== 'object') {
    // No file or invalid — return empty state
    cachedState = { version: 2, settings: {} as Settings, windows: [] }
    return cachedState
  }

  const obj = raw as Record<string, unknown>
  if (obj.version === 2) {
    cachedState = raw as PersistedState
  } else {
    // Old format — migrate
    cachedState = migrateV1(raw as AppState)
    writeToDisk()
  }
  return cachedState
}

export function getSettings(): Settings {
  const state = loadPersistedState()
  return state.settings
}

export function updateSettings(settings: Settings): void {
  const state = loadPersistedState()
  state.settings = settings
  writeToDisk()
}

export function getWindowState(windowId: string): WindowState | null {
  const state = loadPersistedState()
  return state.windows.find(w => w.windowId === windowId) ?? null
}

export function saveWindowState(windowId: string, ws: WindowState): void {
  const state = loadPersistedState()
  const idx = state.windows.findIndex(w => w.windowId === windowId)
  if (idx >= 0) {
    state.windows[idx] = ws
  } else {
    state.windows.push(ws)
  }
  writeToDisk()
}

export function saveWindowBounds(windowId: string, bounds: { x: number; y: number; width: number; height: number }): void {
  const state = loadPersistedState()
  const existing = state.windows.find(w => w.windowId === windowId)
  if (existing) {
    existing.bounds = bounds
  } else {
    // Window was never saved by renderer yet — create a minimal entry so bounds are preserved
    state.windows.push({
      windowId,
      folders: [],
      terminals: [],
      activeTerminalId: null,
      sidebarOpen: true,
      rightSidebarOpen: true,
      splitLayouts: [],
      focusedPaneId: null,
      fontSize: 13,
      appZoom: 0,
      panelCollapsed: {},
      sidebarWidth: 220,
      rightSidebarWidth: 260,
      favoriteIds: [],
      installedPlugins: [],
      commandHistory: [],
      trashedItems: [],
      bounds,
    })
  }
  writeToDisk()
}

export function removeWindowState(windowId: string): void {
  const state = loadPersistedState()
  state.windows = state.windows.filter(w => w.windowId !== windowId)
  writeToDisk()
}

export function clearAllData(): void {
  try {
    unlinkSync(STATE_FILE)
  } catch { /* file may not exist */ }
  cachedState = null
}

export function getAllWindowStates(): WindowState[] {
  const state = loadPersistedState()
  return state.windows
}
