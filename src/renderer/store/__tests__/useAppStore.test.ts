import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the plugin registry before importing the store
vi.mock('../../../plugins/registry', () => ({
  allPlugins: [
    { id: 'testPlugin', name: 'Test', description: 'test', order: 1, PanelComponent: () => null, defaultInstalled: true, defaultCollapsed: false },
    { id: 'otherPlugin', name: 'Other', description: 'other', order: 2, PanelComponent: () => null, defaultInstalled: false, defaultCollapsed: true },
  ],
}))

import { useAppStore } from '../useAppStore'
import type { Folder, TerminalSession, SplitLayout, TrashedItem } from '../../../shared/types'

function makeFolder(overrides: Partial<Folder> & { id: string }): Folder {
  return { name: 'Folder', order: 0, ...overrides }
}

function makeTerminal(overrides: Partial<TerminalSession> & { id: string }): TerminalSession {
  return { title: 'Terminal', cwd: '/tmp', order: 0, scrollback: '', ...overrides }
}

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      folders: [],
      terminals: [],
      activeTerminalId: null,
      splitLayouts: [],
      focusedPaneId: null,
      favoriteIds: [],
      installedPlugins: ['testPlugin'],
      commandHistory: [],
      trashedItems: [],
      activeFolderId: null,
      lastActiveTerminalByFolder: {},
    })
  })

  /* ── removeFolder ─────────────────────────────────── */

  describe('removeFolder', () => {
    it('removes a folder', () => {
      useAppStore.setState({ folders: [makeFolder({ id: 'f1' })] })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().folders).toHaveLength(0)
    })

    it('removes descendant folders (BFS)', () => {
      useAppStore.setState({
        folders: [
          makeFolder({ id: 'f1' }),
          makeFolder({ id: 'f2', parentId: 'f1' }),
          makeFolder({ id: 'f3', parentId: 'f2' }),
        ],
      })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().folders).toHaveLength(0)
    })

    it('removes terminals in deleted folders', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1' })],
        terminals: [
          makeTerminal({ id: 't1', folderId: 'f1' }),
          makeTerminal({ id: 't2' }),
        ],
      })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().terminals).toHaveLength(1)
      expect(useAppStore.getState().terminals[0].id).toBe('t2')
    })

    it('reassigns activeTerminalId if removed', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1' })],
        terminals: [
          makeTerminal({ id: 't1', folderId: 'f1' }),
          makeTerminal({ id: 't2' }),
        ],
        activeTerminalId: 't1',
      })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().activeTerminalId).toBe('t2')
    })

    it('sets activeTerminalId to null when no terminals remain', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1' })],
        terminals: [makeTerminal({ id: 't1', folderId: 'f1' })],
        activeTerminalId: 't1',
      })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().activeTerminalId).toBeNull()
    })

    it('cleans up favoriteIds', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1' })],
        terminals: [makeTerminal({ id: 't1', folderId: 'f1' })],
        favoriteIds: ['f1', 't1', 'other'],
      })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().favoriteIds).toEqual(['other'])
    })

    it('resets activeFolderId if removed folder was active', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1' })],
        activeFolderId: 'f1',
      })
      useAppStore.getState().removeFolder('f1')
      expect(useAppStore.getState().activeFolderId).toBeNull()
    })
  })

  /* ── reorderFolder ────────────────────────────────── */

  describe('reorderFolder', () => {
    it('reorders siblings', () => {
      useAppStore.setState({
        folders: [
          makeFolder({ id: 'f1', order: 0 }),
          makeFolder({ id: 'f2', order: 1 }),
          makeFolder({ id: 'f3', order: 2 }),
        ],
      })
      useAppStore.getState().reorderFolder('f3', 'f1', true) // f3 before f1
      const orders = useAppStore.getState().folders.sort((a, b) => a.order - b.order)
      expect(orders.map(f => f.id)).toEqual(['f3', 'f1', 'f2'])
    })

    it('updates parentId when dragging between groups', () => {
      useAppStore.setState({
        folders: [
          makeFolder({ id: 'parent', order: 0 }),
          makeFolder({ id: 'f1', parentId: 'parent', order: 0 }),
          makeFolder({ id: 'f2', order: 1 }),
        ],
      })
      useAppStore.getState().reorderFolder('f1', 'f2', false) // f1 after f2 at top level
      const f1 = useAppStore.getState().folders.find(f => f.id === 'f1')!
      expect(f1.parentId).toBe(undefined)
    })

    it('no-op when dragging to self', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1', order: 0 })],
      })
      useAppStore.getState().reorderFolder('f1', 'f1', true)
      expect(useAppStore.getState().folders).toHaveLength(1)
    })
  })

  /* ── nestFolder ───────────────────────────────────── */

  describe('nestFolder', () => {
    it('nests a folder under a target', () => {
      useAppStore.setState({
        folders: [
          makeFolder({ id: 'f1', order: 0 }),
          makeFolder({ id: 'f2', order: 1 }),
        ],
      })
      useAppStore.getState().nestFolder('f1', 'f2')
      const f1 = useAppStore.getState().folders.find(f => f.id === 'f1')!
      expect(f1.parentId).toBe('f2')
    })

    it('prevents nesting into own subtree (cycle detection)', () => {
      useAppStore.setState({
        folders: [
          makeFolder({ id: 'f1', order: 0 }),
          makeFolder({ id: 'f2', parentId: 'f1', order: 0 }),
        ],
      })
      useAppStore.getState().nestFolder('f1', 'f2')
      // Should be no-op — f1 should NOT become child of f2
      const f1 = useAppStore.getState().folders.find(f => f.id === 'f1')!
      expect(f1.parentId).toBeUndefined()
    })

    it('prevents nesting into self', () => {
      useAppStore.setState({
        folders: [makeFolder({ id: 'f1', order: 0 })],
      })
      useAppStore.getState().nestFolder('f1', 'f1')
      const f1 = useAppStore.getState().folders.find(f => f.id === 'f1')!
      expect(f1.parentId).toBeUndefined()
    })
  })

  /* ── removeTerminal ───────────────────────────────── */

  describe('removeTerminal', () => {
    it('removes a terminal', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1' }), makeTerminal({ id: 't2' })],
        activeTerminalId: 't1',
      })
      useAppStore.getState().removeTerminal('t1')
      expect(useAppStore.getState().terminals).toHaveLength(1)
      expect(useAppStore.getState().activeTerminalId).toBe('t2')
    })

    it('cleans up split layout when terminal is in split', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1' }), makeTerminal({ id: 't2' })],
        splitLayouts: [{ leftId: 't1', rightId: 't2', ratio: 0.5 }],
        activeTerminalId: 't1',
        focusedPaneId: 't1',
      })
      useAppStore.getState().removeTerminal('t1')
      expect(useAppStore.getState().splitLayouts).toHaveLength(0)
      expect(useAppStore.getState().activeTerminalId).toBe('t2')
    })

    it('sets activeTerminalId to null when last terminal removed', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1' })],
        activeTerminalId: 't1',
      })
      useAppStore.getState().removeTerminal('t1')
      expect(useAppStore.getState().activeTerminalId).toBeNull()
    })

    it('removes from favoriteIds', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1' })],
        favoriteIds: ['t1', 'other'],
      })
      useAppStore.getState().removeTerminal('t1')
      expect(useAppStore.getState().favoriteIds).toEqual(['other'])
    })
  })

  /* ── reorderTerminal ──────────────────────────────── */

  describe('reorderTerminal', () => {
    it('reorders within same folder', () => {
      useAppStore.setState({
        terminals: [
          makeTerminal({ id: 't1', folderId: 'f1', order: 0 }),
          makeTerminal({ id: 't2', folderId: 'f1', order: 1 }),
          makeTerminal({ id: 't3', folderId: 'f1', order: 2 }),
        ],
      })
      useAppStore.getState().reorderTerminal('t3', 't1', true)
      const sorted = useAppStore.getState().terminals.sort((a, b) => a.order - b.order)
      expect(sorted.map(t => t.id)).toEqual(['t3', 't1', 't2'])
    })

    it('no-op when dragging to self', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1', order: 0 })],
      })
      useAppStore.getState().reorderTerminal('t1', 't1', true)
      expect(useAppStore.getState().terminals).toHaveLength(1)
    })
  })

  /* ── reorderTerminalPair ──────────────────────────── */

  describe('reorderTerminalPair', () => {
    it('reorders a split pair', () => {
      useAppStore.setState({
        terminals: [
          makeTerminal({ id: 'left', folderId: 'f1', order: 0 }),
          makeTerminal({ id: 'right', folderId: 'f1', order: 0 }),
          makeTerminal({ id: 'target', folderId: 'f1', order: 1 }),
        ],
      })
      useAppStore.getState().reorderTerminalPair('left', 'right', 'target', false)
      const leftTerm = useAppStore.getState().terminals.find(t => t.id === 'left')!
      const rightTerm = useAppStore.getState().terminals.find(t => t.id === 'right')!
      // left and right should have the same order
      expect(leftTerm.order).toBe(rightTerm.order)
    })
  })

  /* ── moveTerminalToFolder ─────────────────────────── */

  describe('moveTerminalToFolder', () => {
    it('moves terminal and assigns correct order', () => {
      useAppStore.setState({
        terminals: [
          makeTerminal({ id: 't1' }),
          makeTerminal({ id: 't2', folderId: 'f1', order: 0 }),
        ],
      })
      useAppStore.getState().moveTerminalToFolder('t1', 'f1')
      const moved = useAppStore.getState().terminals.find(t => t.id === 't1')!
      expect(moved.folderId).toBe('f1')
      expect(moved.order).toBe(1) // after existing t2
    })
  })

  /* ── splitTerminal ────────────────────────────────── */

  describe('splitTerminal', () => {
    it('creates a new terminal and split layout', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1', cwd: '/home' })],
        activeTerminalId: 't1',
      })
      useAppStore.getState().splitTerminal('t1')
      const state = useAppStore.getState()
      expect(state.terminals).toHaveLength(2)
      expect(state.splitLayouts).toHaveLength(1)
      expect(state.splitLayouts[0].leftId).toBe('t1')
      expect(state.splitLayouts[0].ratio).toBe(0.5)
      expect(state.focusedPaneId).toBe('t1')
      // New terminal inherits cwd
      const newTerm = state.terminals.find(t => t.id !== 't1')!
      expect(newTerm.cwd).toBe('/home')
    })

    it('no-op when terminal does not exist', () => {
      useAppStore.getState().splitTerminal('nonexistent')
      expect(useAppStore.getState().splitLayouts).toHaveLength(0)
    })
  })

  /* ── installPlugin / uninstallPlugin / reorderPlugin ── */

  describe('installPlugin', () => {
    it('installs a plugin', () => {
      useAppStore.getState().installPlugin('otherPlugin')
      expect(useAppStore.getState().installedPlugins).toContain('otherPlugin')
    })

    it('does not duplicate', () => {
      useAppStore.getState().installPlugin('testPlugin')
      expect(useAppStore.getState().installedPlugins.filter(id => id === 'testPlugin')).toHaveLength(1)
    })

    it('sets activeRightPlugin if none', () => {
      useAppStore.setState({ activeRightPlugin: null, installedPlugins: [] })
      useAppStore.getState().installPlugin('newPlugin')
      expect(useAppStore.getState().activeRightPlugin).toBe('newPlugin')
    })
  })

  describe('uninstallPlugin', () => {
    it('removes a plugin', () => {
      useAppStore.setState({ installedPlugins: ['a', 'b'], activeRightPlugin: 'a' })
      useAppStore.getState().uninstallPlugin('a')
      expect(useAppStore.getState().installedPlugins).toEqual(['b'])
      expect(useAppStore.getState().activeRightPlugin).toBe('b')
    })

    it('sets activeRightPlugin to null when last removed', () => {
      useAppStore.setState({ installedPlugins: ['a'], activeRightPlugin: 'a' })
      useAppStore.getState().uninstallPlugin('a')
      expect(useAppStore.getState().activeRightPlugin).toBeNull()
    })
  })

  describe('reorderPlugin', () => {
    it('reorders plugins', () => {
      useAppStore.setState({ installedPlugins: ['a', 'b', 'c'] })
      useAppStore.getState().reorderPlugin('c', 'a', true)
      expect(useAppStore.getState().installedPlugins).toEqual(['c', 'a', 'b'])
    })
  })

  /* ── moveToTrash ──────────────────────────────────── */

  describe('moveToTrash', () => {
    it('trashes a terminal', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1', folderId: 'f1', order: 2 })],
        activeTerminalId: 't1',
      })
      useAppStore.getState().moveToTrash('terminal', 't1')
      const state = useAppStore.getState()
      expect(state.terminals).toHaveLength(0)
      expect(state.trashedItems).toHaveLength(1)
      expect(state.trashedItems[0].type).toBe('terminal')
      expect(state.trashedItems[0].terminals[0].id).toBe('t1')
    })

    it('trashes a folder and its descendants', () => {
      useAppStore.setState({
        folders: [
          makeFolder({ id: 'f1' }),
          makeFolder({ id: 'f2', parentId: 'f1' }),
        ],
        terminals: [
          makeTerminal({ id: 't1', folderId: 'f1' }),
          makeTerminal({ id: 't2', folderId: 'f2' }),
          makeTerminal({ id: 't3' }),
        ],
        activeTerminalId: 't1',
      })
      useAppStore.getState().moveToTrash('folder', 'f1')
      const state = useAppStore.getState()
      expect(state.folders).toHaveLength(0)
      expect(state.terminals).toHaveLength(1)
      expect(state.terminals[0].id).toBe('t3')
      expect(state.trashedItems).toHaveLength(1)
      expect(state.trashedItems[0].terminals).toHaveLength(2)
      expect(state.trashedItems[0].childFolders).toHaveLength(1)
    })

    it('cleans up split layouts when trashing terminal', () => {
      useAppStore.setState({
        terminals: [makeTerminal({ id: 't1' }), makeTerminal({ id: 't2' })],
        splitLayouts: [{ leftId: 't1', rightId: 't2', ratio: 0.5 }],
        activeTerminalId: 't1',
      })
      useAppStore.getState().moveToTrash('terminal', 't1')
      expect(useAppStore.getState().splitLayouts).toHaveLength(0)
      expect(useAppStore.getState().activeTerminalId).toBe('t2')
    })
  })

  /* ── restoreFromTrash ─────────────────────────────── */

  describe('restoreFromTrash', () => {
    it('restores a trashed terminal', () => {
      useAppStore.setState({
        trashedItems: [{
          id: 'trash1',
          trashedAt: Date.now(),
          type: 'terminal',
          originalFolderId: undefined,
          originalOrder: 0,
          folder: undefined,
          terminals: [makeTerminal({ id: 't1' })],
          childFolders: [],
        }],
      })
      useAppStore.getState().restoreFromTrash('trash1')
      expect(useAppStore.getState().terminals).toHaveLength(1)
      expect(useAppStore.getState().trashedItems).toHaveLength(0)
    })

    it('restores terminal to top-level when original folder is gone', () => {
      useAppStore.setState({
        folders: [],
        trashedItems: [{
          id: 'trash1',
          trashedAt: Date.now(),
          type: 'terminal',
          originalFolderId: 'f1',
          originalOrder: 0,
          folder: undefined,
          terminals: [makeTerminal({ id: 't1', folderId: 'f1' })],
          childFolders: [],
        }],
      })
      useAppStore.getState().restoreFromTrash('trash1')
      expect(useAppStore.getState().terminals[0].folderId).toBeUndefined()
    })

    it('restores a trashed folder with children', () => {
      useAppStore.setState({
        trashedItems: [{
          id: 'trash1',
          trashedAt: Date.now(),
          type: 'folder',
          originalFolderId: undefined,
          originalOrder: 0,
          folder: makeFolder({ id: 'f1' }),
          terminals: [makeTerminal({ id: 't1', folderId: 'f1' })],
          childFolders: [makeFolder({ id: 'f2', parentId: 'f1' })],
        }],
      })
      useAppStore.getState().restoreFromTrash('trash1')
      expect(useAppStore.getState().folders).toHaveLength(2)
      expect(useAppStore.getState().terminals).toHaveLength(1)
      expect(useAppStore.getState().trashedItems).toHaveLength(0)
    })
  })

  /* ── purgeExpiredTrash ────────────────────────────── */

  describe('purgeExpiredTrash', () => {
    it('removes items older than 30 days', () => {
      vi.useFakeTimers()
      const now = Date.now()
      const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000
      useAppStore.setState({
        trashedItems: [
          { id: 'old', trashedAt: thirtyOneDaysAgo, type: 'terminal', originalOrder: 0, terminals: [], childFolders: [] } as TrashedItem,
          { id: 'new', trashedAt: now, type: 'terminal', originalOrder: 0, terminals: [], childFolders: [] } as TrashedItem,
        ],
      })
      useAppStore.getState().purgeExpiredTrash()
      expect(useAppStore.getState().trashedItems).toHaveLength(1)
      expect(useAppStore.getState().trashedItems[0].id).toBe('new')
      vi.useRealTimers()
    })

    it('no-op when nothing is expired', () => {
      const now = Date.now()
      useAppStore.setState({
        trashedItems: [
          { id: 'recent', trashedAt: now, type: 'terminal', originalOrder: 0, terminals: [], childFolders: [] } as TrashedItem,
        ],
      })
      useAppStore.getState().purgeExpiredTrash()
      expect(useAppStore.getState().trashedItems).toHaveLength(1)
    })
  })

  /* ── recordCommandUsage ───────────────────────────── */

  describe('recordCommandUsage', () => {
    it('adds to front of history', () => {
      useAppStore.getState().recordCommandUsage('cmd1')
      useAppStore.getState().recordCommandUsage('cmd2')
      expect(useAppStore.getState().commandHistory).toEqual(['cmd2', 'cmd1'])
    })

    it('moves existing command to front (MRU)', () => {
      useAppStore.getState().recordCommandUsage('cmd1')
      useAppStore.getState().recordCommandUsage('cmd2')
      useAppStore.getState().recordCommandUsage('cmd1')
      expect(useAppStore.getState().commandHistory).toEqual(['cmd1', 'cmd2'])
    })

    it('caps at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        useAppStore.getState().recordCommandUsage(`cmd${i}`)
      }
      expect(useAppStore.getState().commandHistory).toHaveLength(50)
      expect(useAppStore.getState().commandHistory[0]).toBe('cmd59')
    })
  })

  /* ── toggleFavorite ───────────────────────────────── */

  describe('toggleFavorite', () => {
    it('adds a favorite', () => {
      useAppStore.getState().toggleFavorite('t1')
      expect(useAppStore.getState().favoriteIds).toContain('t1')
    })

    it('removes a favorite', () => {
      useAppStore.setState({ favoriteIds: ['t1'] })
      useAppStore.getState().toggleFavorite('t1')
      expect(useAppStore.getState().favoriteIds).not.toContain('t1')
    })
  })

  /* ── setFontSize ──────────────────────────────────── */

  describe('setFontSize', () => {
    it('sets font size', () => {
      useAppStore.getState().setFontSize(16)
      expect(useAppStore.getState().fontSize).toBe(16)
    })

    it('clamps minimum to 8', () => {
      useAppStore.getState().setFontSize(2)
      expect(useAppStore.getState().fontSize).toBe(8)
    })

    it('clamps maximum to 32', () => {
      useAppStore.getState().setFontSize(50)
      expect(useAppStore.getState().fontSize).toBe(32)
    })
  })

  /* ── setAppZoom ───────────────────────────────────── */

  describe('setAppZoom', () => {
    it('sets zoom level', () => {
      useAppStore.getState().setAppZoom(2)
      expect(useAppStore.getState().appZoom).toBe(2)
    })

    it('clamps to -5', () => {
      useAppStore.getState().setAppZoom(-10)
      expect(useAppStore.getState().appZoom).toBe(-5)
    })

    it('clamps to 5', () => {
      useAppStore.getState().setAppZoom(10)
      expect(useAppStore.getState().appZoom).toBe(5)
    })
  })

  /* ── setSidebarWidth ──────────────────────────────── */

  describe('setSidebarWidth', () => {
    it('sets width', () => {
      useAppStore.getState().setSidebarWidth(300)
      expect(useAppStore.getState().sidebarWidth).toBe(300)
    })

    it('clamps minimum to 140', () => {
      useAppStore.getState().setSidebarWidth(50)
      expect(useAppStore.getState().sidebarWidth).toBe(140)
    })

    it('clamps maximum to 500', () => {
      useAppStore.getState().setSidebarWidth(800)
      expect(useAppStore.getState().sidebarWidth).toBe(500)
    })
  })

  /* ── toggleSidebar ────────────────────────────────── */

  describe('toggleSidebar', () => {
    it('toggles sidebar open/closed', () => {
      useAppStore.setState({ sidebarOpen: true })
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })
  })

  /* ── updateSettings / updatePluginSettings ────────── */

  describe('updateSettings', () => {
    it('merges settings', () => {
      useAppStore.getState().updateSettings({ shell: '/bin/zsh' })
      expect(useAppStore.getState().settings.shell).toBe('/bin/zsh')
    })
  })

  describe('updatePluginSettings', () => {
    it('merges plugin settings', () => {
      useAppStore.getState().updatePluginSettings('git', { maxCommits: 200 })
      expect(useAppStore.getState().settings.pluginSettings.git.maxCommits).toBe(200)
    })
  })

  /* ── setPanelCollapsed ────────────────────────────── */

  describe('setPanelCollapsed', () => {
    it('sets panel collapsed state', () => {
      useAppStore.getState().setPanelCollapsed('testPlugin', true)
      expect(useAppStore.getState().panelCollapsed.testPlugin).toBe(true)
    })
  })
})
