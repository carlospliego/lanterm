import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mocks
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockUuidv4 = vi.fn(() => 'test-uuid-1234')

vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userData',
  },
}))

vi.mock('fs', () => ({
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
}))

vi.mock('uuid', () => ({
  v4: () => mockUuidv4(),
}))

describe('stateManager', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockReadFileSync.mockReset()
    mockWriteFileSync.mockReset()
    mockUuidv4.mockReturnValue('test-uuid-1234')
  })

  async function importModule() {
    return import('../stateManager')
  }

  describe('loadPersistedState', () => {
    it('returns empty state when no file exists', async () => {
      mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })
      const { loadPersistedState } = await importModule()
      const state = loadPersistedState()
      expect(state.version).toBe(2)
      expect(state.windows).toEqual([])
    })

    it('returns cached state on subsequent calls', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [{ windowId: 'w1', folders: [], terminals: [] }],
      }))
      const { loadPersistedState } = await importModule()
      const first = loadPersistedState()
      const second = loadPersistedState()
      expect(first).toBe(second) // same reference
      expect(mockReadFileSync).toHaveBeenCalledTimes(1)
    })

    it('loads v2 state directly', async () => {
      const v2State = {
        version: 2,
        settings: { shell: '/bin/bash' },
        windows: [{ windowId: 'w1' }],
      }
      mockReadFileSync.mockReturnValue(JSON.stringify(v2State))
      const { loadPersistedState } = await importModule()
      const state = loadPersistedState()
      expect(state.version).toBe(2)
      expect(state.settings.shell).toBe('/bin/bash')
    })

    it('migrates v1 state to v2', async () => {
      const v1State = {
        folders: [{ id: 'f1', name: 'F1', order: 0 }],
        terminals: [{ id: 't1', title: 'T1', cwd: '/tmp', order: 0, scrollback: '' }],
        activeTerminalId: 't1',
        sidebarOpen: true,
        rightSidebarOpen: false,
        splitLayouts: [],
        focusedPaneId: null,
        fontSize: 14,
        appZoom: 1,
        panelCollapsed: {},
        sidebarWidth: 250,
        rightSidebarWidth: 300,
        favoriteIds: [],
        installedPlugins: ['git'],
        commandHistory: [],
        trashedItems: [],
        settings: { shell: '/bin/zsh' },
      }
      mockReadFileSync.mockReturnValue(JSON.stringify(v1State))
      const { loadPersistedState } = await importModule()
      const state = loadPersistedState()
      expect(state.version).toBe(2)
      expect(state.windows).toHaveLength(1)
      expect(state.windows[0].windowId).toBe('test-uuid-1234')
      expect(state.windows[0].folders).toEqual(v1State.folders)
      expect(state.windows[0].terminals).toEqual(v1State.terminals)
      expect(state.windows[0].fontSize).toBe(14)
      expect(state.settings.shell).toBe('/bin/zsh')
      // Should write migrated state to disk
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    })

    it('handles invalid JSON', async () => {
      mockReadFileSync.mockReturnValue('not-valid-json{{{')
      const { loadPersistedState } = await importModule()
      const state = loadPersistedState()
      expect(state.version).toBe(2)
      expect(state.windows).toEqual([])
    })
  })

  describe('getWindowState', () => {
    it('returns matching window', async () => {
      const ws = { windowId: 'w1', folders: [], terminals: [] }
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [ws],
      }))
      const { getWindowState } = await importModule()
      const result = getWindowState('w1')
      expect(result).not.toBeNull()
      expect(result!.windowId).toBe('w1')
    })

    it('returns null for non-existent window', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [],
      }))
      const { getWindowState } = await importModule()
      expect(getWindowState('nope')).toBeNull()
    })
  })

  describe('saveWindowState', () => {
    it('updates existing window', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [{ windowId: 'w1', folders: [], terminals: [] }],
      }))
      const { saveWindowState, getWindowState } = await importModule()
      saveWindowState('w1', { windowId: 'w1', folders: [{ id: 'f1', name: 'New', order: 0 }], terminals: [] } as any)
      const result = getWindowState('w1')
      expect(result!.folders).toHaveLength(1)
      expect(mockWriteFileSync).toHaveBeenCalled()
    })

    it('adds new window', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [],
      }))
      const { saveWindowState, loadPersistedState } = await importModule()
      saveWindowState('w2', { windowId: 'w2', folders: [], terminals: [] } as any)
      expect(loadPersistedState().windows).toHaveLength(1)
    })
  })

  describe('saveWindowBounds', () => {
    it('saves bounds to existing window', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [{ windowId: 'w1', folders: [], terminals: [] }],
      }))
      const { saveWindowBounds, getWindowState } = await importModule()
      saveWindowBounds('w1', { x: 100, y: 200, width: 800, height: 600 })
      const result = getWindowState('w1')
      expect(result!.bounds).toEqual({ x: 100, y: 200, width: 800, height: 600 })
    })

    it('creates minimal entry for unknown window', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [],
      }))
      const { saveWindowBounds, loadPersistedState } = await importModule()
      saveWindowBounds('w3', { x: 0, y: 0, width: 1024, height: 768 })
      const state = loadPersistedState()
      expect(state.windows).toHaveLength(1)
      expect(state.windows[0].windowId).toBe('w3')
      expect(state.windows[0].bounds).toEqual({ x: 0, y: 0, width: 1024, height: 768 })
    })
  })

  describe('removeWindowState', () => {
    it('removes a window', async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify({
        version: 2,
        settings: {},
        windows: [
          { windowId: 'w1', folders: [], terminals: [] },
          { windowId: 'w2', folders: [], terminals: [] },
        ],
      }))
      const { removeWindowState, loadPersistedState } = await importModule()
      removeWindowState('w1')
      expect(loadPersistedState().windows).toHaveLength(1)
      expect(loadPersistedState().windows[0].windowId).toBe('w2')
    })
  })
})
