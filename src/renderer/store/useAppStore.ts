import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { AppState, Folder, TerminalSession, SplitLayout, Settings, CustomCommand, TrashedItem, PluginSettingsMap, WindowState } from '../../shared/types'
import type { CommandId, Keybinding } from '../../shared/keybindings'
import { allPlugins } from '../../plugins/registry'

const DEFAULT_PLUGIN_SETTINGS: PluginSettingsMap = {
  git: { maxCommits: 150, maxLanes: 5, panelMaxHeight: 360 },
  claudeHistory: { maxEntries: 10, pollIntervalMs: 500 },
  worktree: { defaultBasePath: '', panelMaxHeight: 260, allowTasks: true, sortCompletedToBottom: false, hideCompleted: false },
  buttons: { panelMaxHeight: 300 },
}

const DEFAULT_SETTINGS: Settings = {
  shell: '',
  defaultDirectory: '',
  fontFamily: '"Cascadia Code", "Fira Code", Menlo, Monaco, monospace',
  scrollback: 5000,
  keybindings: {},
  pluginKeybindings: {},
  theme: 'dark',
  terminalTheme: 'auto',
  customCommands: [],
  pluginSettings: DEFAULT_PLUGIN_SETTINGS,
  restoreWindows: true,
  onboardingComplete: false,
}

interface AppStore extends AppState {
  // Window identity
  windowId: string

  // Hydrate from persisted state
  hydrate: (state: AppState) => void

  // Folder actions
  addFolder: (folder: Folder) => void
  removeFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  setFolderIcon: (id: string, icon: string | undefined) => void
  updateFolderDefaults: (id: string, defaults: Partial<Pick<Folder, 'defaultCwd' | 'defaultTerminalIcon' | 'defaultTerminalTheme' | 'defaultFontSize'>>) => void
  clearFolderWorktreePath: (worktreePath: string) => void
  reorderFolder: (draggedId: string, targetId: string, before: boolean) => void
  nestFolder: (draggedId: string, targetParentId: string) => void

  // Terminal actions
  createTerminal: () => void
  addTerminal: (terminal: TerminalSession) => void
  removeTerminal: (id: string) => void
  setActiveTerminal: (id: string | null) => void
  updateCwd: (id: string, cwd: string) => void
  updateScrollback: (id: string, scrollback: string) => void
  updateTitle: (id: string, title: string) => void
  setTerminalIcon: (id: string, icon: string | undefined) => void
  moveTerminalToFolder: (terminalId: string, targetFolderId: string | undefined) => void
  moveTerminalPairToFolder: (leftId: string, rightId: string, folderId: string | undefined) => void
  reorderTerminal: (draggedId: string, targetId: string, before: boolean) => void
  reorderTerminalPair: (leftId: string, rightId: string, targetId: string, before: boolean) => void

  // Split actions
  splitTerminal: (leftId: string) => void
  clearSplitLayout: (id?: string) => void
  setSplitRatio: (id: string, ratio: number) => void
  setFocusedPane: (id: string | null) => void

  // Activity bar
  activeRightPlugin: string | null
  setActiveRightPlugin: (id: string | null) => void

  // UI
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarOpen: (open: boolean) => void
  promptOpen: boolean
  openPrompt: () => void
  closePrompt: () => void
  togglePrompt: () => void
  setFontSize: (size: number) => void
  setTerminalFontSize: (id: string, size: number) => void
  setTerminalTheme: (id: string, themeId: string | undefined) => void
  appZoom: number
  setAppZoom: (level: number) => void
  setPanelCollapsed: (panel: string, collapsed: boolean) => void
  pluginIconOverrides: Record<string, string>
  setPluginIconOverride: (pluginId: string, icon: string | undefined) => void
  setSidebarWidth: (width: number) => void
  setRightSidebarWidth: (width: number) => void
  settingsOpen: boolean
  settingsTab: string | null
  settingsSubTab: string | null
  openSettings: (tab?: string, subTab?: string) => void
  closeSettings: () => void
  paletteOpen: boolean
  paletteMode: 'default' | 'find' | 'history'
  openPalette: (mode?: 'default' | 'find' | 'history') => void
  closePalette: () => void
  newMenuOpen: boolean
  openNewMenu: () => void
  closeNewMenu: () => void
  updateSettings: (patch: Partial<Settings>) => void
  updatePluginSettings: (pluginId: string, patch: Record<string, unknown>) => void
  installedPlugins: string[]
  pluginGalleryOpen: boolean
  installPlugin: (id: string) => void
  uninstallPlugin: (id: string) => void
  reorderPlugin: (draggedId: string, targetId: string, before: boolean) => void
  openPluginGallery: () => void
  closePluginGallery: () => void
  updateKeybinding: (id: CommandId, binding: Keybinding | null) => void
  updatePluginKeybinding: (actionId: string, binding: Keybinding | null) => void
  addCustomCommand: (label: string, command: string) => void
  updateCustomCommand: (id: string, patch: Partial<Pick<CustomCommand, 'label' | 'command'>>) => void
  removeCustomCommand: (id: string) => void
  resolvedTheme: 'light' | 'dark'
  setResolvedTheme: (theme: 'light' | 'dark') => void
  favoriteIds: string[]
  toggleFavorite: (id: string) => void
  commandHistory: string[]
  recordCommandUsage: (id: string) => void

  // Folder page
  activeFolderId: string | null
  setActiveFolder: (id: string | null) => void

  // Sidebar folder collapse (non-persisted)
  collapsedFolderIds: string[]
  toggleFolderCollapsed: (folderId: string) => void
  expandFolder: (folderId: string) => void

  // Hints mode
  hintsActive: boolean
  openHints: () => void
  closeHints: () => void

  // Trash
  trashedItems: TrashedItem[]
  trashOpen: boolean
  openTrash: () => void
  closeTrash: () => void
  moveToTrash: (type: 'folder' | 'terminal', id: string) => void
  restoreFromTrash: (trashId: string) => void
  permanentlyDelete: (trashId: string) => void
  emptyTrash: () => void
  purgeExpiredTrash: () => void

  // Cross-window settings sync
  mergeSettings: (settings: Settings) => void

  // Get current serializable state
  getAppState: () => AppState
  getWindowState: () => WindowState
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    windowId: '',
    folders: [],
    terminals: [],
    activeTerminalId: null,
    sidebarOpen: true,
    rightSidebarOpen: true,
    promptOpen: false,
    splitLayouts: [],
    focusedPaneId: null,
    fontSize: 13,
    appZoom: 0,
    panelCollapsed: Object.fromEntries(allPlugins.map(p => [p.id, p.defaultCollapsed ?? false])),
    pluginIconOverrides: {},
    sidebarWidth: 220,
    rightSidebarWidth: 260,
    settings: { ...DEFAULT_SETTINGS },
    settingsOpen: false,
    settingsTab: null,
    settingsSubTab: null,
    paletteOpen: false,
    paletteMode: 'default' as 'default' | 'find' | 'history',
    newMenuOpen: false,
    installedPlugins: allPlugins.filter(p => p.defaultInstalled).map(p => p.id),
    pluginGalleryOpen: false,
    resolvedTheme: 'dark' as 'light' | 'dark',
    favoriteIds: [],
    commandHistory: [],
    trashedItems: [],
    activeRightPlugin: allPlugins.filter(p => p.defaultInstalled).map(p => p.id)[0] ?? null,
    lastActiveTerminalByFolder: {},
    trashOpen: false,
    activeFolderId: null,
    collapsedFolderIds: [] as string[],
    hintsActive: false,

    hydrate: (state) => {
      for (const p of allPlugins) p.state?.hydrate((state as any)[p.state.stateKey])
      set({
        folders: state.folders,
        terminals: state.terminals,
        activeTerminalId: state.activeTerminalId,
        sidebarOpen: state.sidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen ?? true,
        // backward compat: old persisted state may have splitLayout (singular)
        splitLayouts: state.splitLayouts ?? ((state as any).splitLayout ? [(state as any).splitLayout] : []),
        focusedPaneId: state.focusedPaneId ?? null,
        fontSize: state.fontSize ?? 13,
        appZoom: state.appZoom ?? 0,
        panelCollapsed: state.panelCollapsed ?? Object.fromEntries(allPlugins.map(p => [p.id, p.defaultCollapsed ?? false])),
        pluginIconOverrides: (state as any).pluginIconOverrides ?? {},
        sidebarWidth: state.sidebarWidth ?? 220,
        rightSidebarWidth: state.rightSidebarWidth ?? 260,
        settings: state.settings ? {
          ...DEFAULT_SETTINGS,
          ...state.settings,
          onboardingComplete: state.settings.onboardingComplete ?? (Object.keys(state.settings).length > 0),
          pluginSettings: {
            ...DEFAULT_PLUGIN_SETTINGS,
            ...state.settings?.pluginSettings,
            git: { ...DEFAULT_PLUGIN_SETTINGS.git, ...state.settings?.pluginSettings?.git },
            claudeHistory: { ...DEFAULT_PLUGIN_SETTINGS.claudeHistory, ...state.settings?.pluginSettings?.claudeHistory },
            worktree: {
              ...DEFAULT_PLUGIN_SETTINGS.worktree,
              ...state.settings?.pluginSettings?.worktree,
              // Migrate task settings from old tasks plugin
              ...(state.settings?.pluginSettings?.tasks && !('allowTasks' in (state.settings?.pluginSettings?.worktree ?? {})) ? {
                sortCompletedToBottom: (state.settings.pluginSettings.tasks as any).sortCompletedToBottom ?? false,
                hideCompleted: (state.settings.pluginSettings.tasks as any).hideCompleted ?? false,
              } : {}),
            },
            buttons: { ...DEFAULT_PLUGIN_SETTINGS.buttons, ...state.settings?.pluginSettings?.buttons },
          },
        } : { ...DEFAULT_SETTINGS },
        installedPlugins: (() => {
          const base = (state.installedPlugins ?? (state as any).installedApps ?? allPlugins.filter(p => p.defaultInstalled).map(p => p.id)).filter((id: string) => id !== 'tasks')
          // Ensure worktree and git are always installed
          for (const required of ['worktree', 'git']) {
            if (!base.includes(required)) base.push(required)
          }
          return base
        })(),
        activeRightPlugin: state.activeRightPlugin ?? (state.installedPlugins ?? allPlugins.filter(p => p.defaultInstalled).map(p => p.id))[0] ?? null,
        favoriteIds: state.favoriteIds ?? [],
        commandHistory: state.commandHistory ?? [],
        trashedItems: state.trashedItems ?? [],
        lastActiveTerminalByFolder: state.lastActiveTerminalByFolder ?? {},
      })
    },

    addFolder: (folder) =>
      set(s => ({ folders: [...s.folders, folder] })),

    removeFolder: (id) =>
      set(s => {
        // Collect folder and all descendants
        const toRemove = new Set<string>()
        const queue = [id]
        while (queue.length) {
          const cur = queue.pop()!
          toRemove.add(cur)
          s.folders.filter(f => f.parentId === cur).forEach(f => queue.push(f.id))
        }
        const remaining = s.terminals.filter(t => !t.folderId || !toRemove.has(t.folderId))
        const removedTermIds = new Set(s.terminals.filter(t => t.folderId && toRemove.has(t.folderId)).map(t => t.id))
        const activeGone = toRemove.has(s.activeTerminalId ?? '') ||
          s.terminals.find(t => t.id === s.activeTerminalId && t.folderId && toRemove.has(t.folderId)) != null
        return {
          folders: s.folders.filter(f => !toRemove.has(f.id)),
          terminals: remaining,
          activeTerminalId: activeGone ? (remaining[remaining.length - 1]?.id ?? null) : s.activeTerminalId,
          favoriteIds: s.favoriteIds.filter(fid => !toRemove.has(fid) && !removedTermIds.has(fid)),
          activeFolderId: s.activeFolderId && toRemove.has(s.activeFolderId) ? null : s.activeFolderId,
        }
      }),

    renameFolder: (id, name) =>
      set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, name } : f) })),

    setFolderIcon: (id, icon) =>
      set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, icon } : f) })),

    updateFolderDefaults: (id, defaults) =>
      set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...defaults } : f) })),

    clearFolderWorktreePath: (worktreePath) =>
      set(s => ({
        folders: s.folders.map(f =>
          f.worktreePath === worktreePath ? { ...f, worktreePath: undefined } : f
        ),
      })),

    reorderFolder: (draggedId, targetId, before) =>
      set(s => {
        const dragged = s.folders.find(f => f.id === draggedId)
        const target = s.folders.find(f => f.id === targetId)
        if (!dragged || !target || draggedId === targetId) return s
        const newParentId = target.parentId
        // Siblings at target's level, excluding dragged
        const siblings = s.folders
          .filter(f => f.parentId === newParentId && f.id !== draggedId)
          .sort((a, b) => a.order - b.order)
        const targetIdx = siblings.findIndex(f => f.id === targetId)
        if (targetIdx === -1) return s
        siblings.splice(before ? targetIdx : targetIdx + 1, 0, dragged)
        const newOrders = new Map(siblings.map((f, i) => [f.id, i]))
        return {
          folders: s.folders.map(f =>
            newOrders.has(f.id)
              ? { ...f, parentId: newParentId, order: newOrders.get(f.id)! }
              : f
          ),
        }
      }),

    nestFolder: (draggedId, targetParentId) =>
      set(s => {
        // Prevent nesting a folder into its own subtree
        const isInSubtree = (nodeId: string, ancestorId: string): boolean => {
          if (nodeId === ancestorId) return true
          const node = s.folders.find(f => f.id === nodeId)
          return node?.parentId ? isInSubtree(node.parentId, ancestorId) : false
        }
        if (isInSubtree(targetParentId, draggedId)) return s
        const siblings = s.folders.filter(f => f.parentId === targetParentId && f.id !== draggedId)
        return {
          folders: s.folders.map(f =>
            f.id === draggedId ? { ...f, parentId: targetParentId, order: siblings.length } : f
          ),
        }
      }),

    createTerminal: () => {
      const { terminals: ts, settings: s, activeTerminalId, folders } = get()
      const active = ts.find(t => t.id === activeTerminalId)
      const folderId = active?.folderId
      const id = uuidv4()

      if (folderId) {
        const folder = folders.find(f => f.id === folderId)
        const folderTerminals = ts.filter(t => t.folderId === folderId)
        const cwd = folder?.defaultCwd || s.defaultDirectory || (folderTerminals.length > 0 ? folderTerminals[folderTerminals.length - 1].cwd : window.termAPI.homedir)
        get().addTerminal({
          id,
          folderId,
          title: `Terminal ${folderTerminals.length + 1}`,
          cwd,
          order: folderTerminals.length,
          scrollback: '',
          icon: folder?.defaultTerminalIcon ?? 'fa:fa-solid fa-terminal',
          terminalTheme: folder?.defaultTerminalTheme,
          fontSize: folder?.defaultFontSize,
        })
      } else {
        const standalone = ts.filter(t => !t.folderId)
        const cwd = s.defaultDirectory || active?.cwd || (standalone.length > 0 ? standalone[standalone.length - 1].cwd : window.termAPI.homedir)
        get().addTerminal({ id, title: `Terminal ${ts.length + 1}`, cwd, order: standalone.length, scrollback: '', icon: 'fa:fa-solid fa-terminal' })
      }

      get().setActiveTerminal(id)
    },

    addTerminal: (terminal) =>
      set(s => ({ terminals: [...s.terminals, terminal] })),

    removeTerminal: (id) =>
      set(s => {
        const remaining = s.terminals.filter(t => t.id !== id)
        let nextActive = s.activeTerminalId
        let splitLayouts = s.splitLayouts
        let focusedPaneId: string | null = s.focusedPaneId

        const affectedSplit = splitLayouts.find(sl => sl.leftId === id || sl.rightId === id)
        if (affectedSplit) {
          const survivorId = affectedSplit.leftId === id ? affectedSplit.rightId : affectedSplit.leftId
          splitLayouts = splitLayouts.filter(sl => sl !== affectedSplit)
          focusedPaneId = splitLayouts.some(sl => sl.leftId === focusedPaneId || sl.rightId === focusedPaneId)
            ? focusedPaneId
            : null
          nextActive = survivorId
        } else if (s.activeTerminalId === id) {
          const idx = s.terminals.findIndex(t => t.id === id)
          const next = s.terminals[idx + 1] ?? s.terminals[idx - 1]
          nextActive = next?.id ?? null
        }

        return { terminals: remaining, activeTerminalId: nextActive, splitLayouts, focusedPaneId, favoriteIds: s.favoriteIds.filter(fid => fid !== id) }
      }),

    setActiveTerminal: (id) => set(s => {
      const update: Partial<AppStore> = { activeTerminalId: id, activeFolderId: null }
      if (id) {
        const term = s.terminals.find(t => t.id === id)
        if (term?.folderId) {
          update.lastActiveTerminalByFolder = { ...s.lastActiveTerminalByFolder, [term.folderId]: id }
        }
      }
      return update
    }),

    updateCwd: (id, cwd) =>
      set(s => ({ terminals: s.terminals.map(t => t.id === id ? { ...t, cwd } : t) })),

    updateScrollback: (id, scrollback) =>
      set(s => ({ terminals: s.terminals.map(t => t.id === id ? { ...t, scrollback } : t) })),

    updateTitle: (id, title) =>
      set(s => ({ terminals: s.terminals.map(t => t.id === id ? { ...t, title } : t) })),

    setTerminalIcon: (id, icon) =>
      set(s => ({ terminals: s.terminals.map(t => t.id === id ? { ...t, icon } : t) })),

    moveTerminalToFolder: (terminalId, targetFolderId) =>
      set(s => {
        const targetCount = s.terminals.filter(t => t.folderId === targetFolderId).length
        return {
          terminals: s.terminals.map(t =>
            t.id === terminalId
              ? { ...t, folderId: targetFolderId, order: targetCount }
              : t
          ),
        }
      }),

    moveTerminalPairToFolder: (leftId, rightId, folderId) =>
      set(s => {
        const targetCount = s.terminals.filter(
          t => t.folderId === folderId && t.id !== leftId && t.id !== rightId
        ).length
        return {
          terminals: s.terminals.map(t =>
            t.id === leftId || t.id === rightId ? { ...t, folderId, order: targetCount } : t
          ),
        }
      }),

    reorderTerminalPair: (leftId, rightId, targetId, before) =>
      set(s => {
        const left = s.terminals.find(t => t.id === leftId)
        const target = s.terminals.find(t => t.id === targetId)
        if (!left || !target || leftId === targetId || rightId === targetId) return s
        const newFolderId = target.folderId
        const siblings = s.terminals
          .filter(t => t.folderId === newFolderId && t.id !== leftId && t.id !== rightId)
          .sort((a, b) => a.order - b.order)
        const targetIdx = siblings.findIndex(t => t.id === targetId)
        if (targetIdx === -1) return s
        siblings.splice(before ? targetIdx : targetIdx + 1, 0, left)
        const newOrders = new Map(siblings.map((t, i) => [t.id, i]))
        const leftNewOrder = newOrders.get(leftId)!
        return {
          terminals: s.terminals.map(t => {
            if (newOrders.has(t.id)) return { ...t, folderId: newFolderId, order: newOrders.get(t.id)! }
            if (t.id === rightId) return { ...t, folderId: newFolderId, order: leftNewOrder }
            return t
          }),
        }
      }),

    reorderTerminal: (draggedId, targetId, before) =>
      set(s => {
        const dragged = s.terminals.find(t => t.id === draggedId)
        const target = s.terminals.find(t => t.id === targetId)
        if (!dragged || !target || draggedId === targetId) return s
        const newFolderId = target.folderId
        const siblings = s.terminals
          .filter(t => t.folderId === newFolderId && t.id !== draggedId)
          .sort((a, b) => a.order - b.order)
        const targetIdx = siblings.findIndex(t => t.id === targetId)
        if (targetIdx === -1) return s
        siblings.splice(before ? targetIdx : targetIdx + 1, 0, dragged)
        const newOrders = new Map(siblings.map((t, i) => [t.id, i]))
        return {
          terminals: s.terminals.map(t =>
            newOrders.has(t.id) ? { ...t, folderId: newFolderId, order: newOrders.get(t.id)! } : t
          ),
        }
      }),

    splitTerminal: (leftId) => {
      const { terminals, folders } = get()
      const leftSession = terminals.find(t => t.id === leftId)
      if (!leftSession) return
      const folder = leftSession.folderId ? folders.find(f => f.id === leftSession.folderId) : undefined
      const newId = crypto.randomUUID()
      const newSession: TerminalSession = {
        id: newId,
        title: `Terminal ${terminals.length + 1}`,
        cwd: leftSession.cwd,
        order: terminals.length,
        scrollback: '',
        folderId: leftSession.folderId,
        icon: folder?.defaultTerminalIcon ?? 'fa:fa-solid fa-terminal',
        terminalTheme: folder?.defaultTerminalTheme,
        fontSize: folder?.defaultFontSize,
      }
      set(s => ({
        terminals: [...s.terminals, newSession],
        splitLayouts: [...s.splitLayouts, { leftId, rightId: newId, ratio: 0.5 }],
        focusedPaneId: leftId,
        activeTerminalId: leftId,
      }))
    },

    clearSplitLayout: (id?: string) =>
      set(s => ({
        splitLayouts: id != null
          ? s.splitLayouts.filter(sl => sl.leftId !== id && sl.rightId !== id)
          : [],
        focusedPaneId: null,
      })),

    setSplitRatio: (id, ratio) =>
      set(s => ({
        splitLayouts: s.splitLayouts.map(sl =>
          sl.leftId === id || sl.rightId === id ? { ...sl, ratio } : sl
        ),
      })),

    setFocusedPane: (id) => set({ focusedPaneId: id }),

    setActiveRightPlugin: (id) => set({ activeRightPlugin: id }),

    toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleRightSidebar: () => set(s => ({ rightSidebarOpen: !s.rightSidebarOpen })),
    setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
    setFontSize: (size) => set({ fontSize: Math.min(32, Math.max(8, size)) }),
    setAppZoom: (level) => set({ appZoom: Math.min(5, Math.max(-5, level)) }),
    setPanelCollapsed: (panel, collapsed) =>
      set(s => ({ panelCollapsed: { ...s.panelCollapsed, [panel]: collapsed } })),
    setPluginIconOverride: (pluginId, icon) =>
      set(s => {
        const next = { ...s.pluginIconOverrides }
        if (icon === undefined) delete next[pluginId]
        else next[pluginId] = icon
        return { pluginIconOverrides: next }
      }),
    setSidebarWidth: (width) => set({ sidebarWidth: Math.min(500, Math.max(140, width)) }),
    setRightSidebarWidth: (width) => set({ rightSidebarWidth: Math.min(500, Math.max(140, width)) }),
    setTerminalFontSize: (id, size) =>
      set(s => ({
        terminals: s.terminals.map(t =>
          t.id === id ? { ...t, fontSize: Math.min(32, Math.max(8, size)) } : t
        ),
      })),
    setTerminalTheme: (id, themeId) =>
      set(s => ({
        terminals: s.terminals.map(t =>
          t.id === id ? { ...t, terminalTheme: themeId } : t
        ),
      })),
    openPrompt: () => set({ promptOpen: true }),
    closePrompt: () => set({ promptOpen: false }),
    togglePrompt: () => set(s => ({ promptOpen: !s.promptOpen })),

    openSettings: (tab, subTab) => set({ settingsOpen: true, settingsTab: tab ?? null, settingsSubTab: subTab ?? null }),
    closeSettings: () => set({ settingsOpen: false, settingsTab: null, settingsSubTab: null }),
    openPalette: (mode) => set({ paletteOpen: true, paletteMode: mode ?? 'default' }),
    closePalette: () => set({ paletteOpen: false }),
    openNewMenu: () => set({ newMenuOpen: true }),
    closeNewMenu: () => set({ newMenuOpen: false }),
    installPlugin: (id) => set(s => {
      if (s.installedPlugins.includes(id)) return s
      const next: Partial<AppStore> = { installedPlugins: [...s.installedPlugins, id] }
      if (s.activeRightPlugin === null) next.activeRightPlugin = id
      return next
    }),
    uninstallPlugin: (id) => set(s => {
      const remaining = s.installedPlugins.filter(a => a !== id)
      const next: Partial<AppStore> = { installedPlugins: remaining }
      if (s.activeRightPlugin === id) {
        next.activeRightPlugin = remaining[0] ?? null
      }
      return next
    }),
    reorderPlugin: (draggedId, targetId, before) => set(s => {
      const arr = s.installedPlugins.filter(id => id !== draggedId)
      const targetIdx = arr.indexOf(targetId)
      if (targetIdx === -1) return s
      arr.splice(before ? targetIdx : targetIdx + 1, 0, draggedId)
      return { installedPlugins: arr }
    }),
    openPluginGallery: () => set({ pluginGalleryOpen: true }),
    closePluginGallery: () => set({ pluginGalleryOpen: false }),
    updateSettings: (patch) => set(s => ({
      settings: { ...s.settings, ...patch },
    })),
    updatePluginSettings: (pluginId, patch) => set(s => ({
      settings: {
        ...s.settings,
        pluginSettings: {
          ...s.settings.pluginSettings,
          [pluginId]: { ...(s.settings.pluginSettings[pluginId] ?? {}), ...patch },
        },
      },
    })),
    setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
    updateKeybinding: (id, binding) => set(s => {
      const kbs = { ...s.settings.keybindings }
      if (binding === null) delete kbs[id]
      else kbs[id] = binding
      return { settings: { ...s.settings, keybindings: kbs } }
    }),
    updatePluginKeybinding: (actionId, binding) => set(s => {
      const pkb = { ...(s.settings.pluginKeybindings ?? {}) }
      if (binding === null) delete pkb[actionId]
      else pkb[actionId] = binding
      return { settings: { ...s.settings, pluginKeybindings: pkb } }
    }),
    addCustomCommand: (label, command) => set(s => ({
      settings: {
        ...s.settings,
        customCommands: [...(s.settings.customCommands ?? []), { id: crypto.randomUUID(), label, command }],
      },
    })),
    updateCustomCommand: (id, patch) => set(s => ({
      settings: {
        ...s.settings,
        customCommands: (s.settings.customCommands ?? []).map(c => c.id === id ? { ...c, ...patch } : c),
      },
    })),
    removeCustomCommand: (id) => set(s => ({
      settings: {
        ...s.settings,
        customCommands: (s.settings.customCommands ?? []).filter(c => c.id !== id),
      },
    })),

    toggleFavorite: (id) =>
      set(s => ({
        favoriteIds: s.favoriteIds.includes(id)
          ? s.favoriteIds.filter(fid => fid !== id)
          : [...s.favoriteIds, id],
      })),

    recordCommandUsage: (id) => set(s => ({
      commandHistory: [id, ...s.commandHistory.filter(c => c !== id)].slice(0, 50),
    })),

    setActiveFolder: (id) => set({ activeFolderId: id }),
    toggleFolderCollapsed: (folderId) => set(s => ({
      collapsedFolderIds: s.collapsedFolderIds.includes(folderId)
        ? s.collapsedFolderIds.filter(id => id !== folderId)
        : [...s.collapsedFolderIds, folderId],
    })),
    expandFolder: (folderId) => set(s => ({
      collapsedFolderIds: s.collapsedFolderIds.filter(id => id !== folderId),
    })),

    openHints: () => set({ hintsActive: true }),
    closeHints: () => set({ hintsActive: false }),

    openTrash: () => set({ trashOpen: true }),
    closeTrash: () => set({ trashOpen: false }),

    moveToTrash: (type, id) =>
      set(s => {
        if (type === 'terminal') {
          const term = s.terminals.find(t => t.id === id)
          if (!term) return s
          const trashEntry: TrashedItem = {
            id: crypto.randomUUID(),
            trashedAt: Date.now(),
            type: 'terminal',
            originalFolderId: term.folderId,
            originalOrder: term.order,
            folder: undefined,
            terminals: [term],
            childFolders: [],
          }
          // Remove terminal (same cleanup as removeTerminal)
          const remaining = s.terminals.filter(t => t.id !== id)
          let nextActive = s.activeTerminalId
          let splitLayouts = s.splitLayouts
          let focusedPaneId: string | null = s.focusedPaneId
          const affectedSplit = splitLayouts.find(sl => sl.leftId === id || sl.rightId === id)
          if (affectedSplit) {
            const survivorId = affectedSplit.leftId === id ? affectedSplit.rightId : affectedSplit.leftId
            splitLayouts = splitLayouts.filter(sl => sl !== affectedSplit)
            focusedPaneId = splitLayouts.some(sl => sl.leftId === focusedPaneId || sl.rightId === focusedPaneId)
              ? focusedPaneId : null
            nextActive = survivorId
          } else if (s.activeTerminalId === id) {
            const idx = s.terminals.findIndex(t => t.id === id)
            const next = s.terminals[idx + 1] ?? s.terminals[idx - 1]
            nextActive = next?.id ?? null
          }
          return {
            terminals: remaining,
            activeTerminalId: nextActive,
            splitLayouts,
            focusedPaneId,
            favoriteIds: s.favoriteIds.filter(fid => fid !== id),
            trashedItems: [...s.trashedItems, trashEntry],
          }
        } else {
          // type === 'folder'
          const folder = s.folders.find(f => f.id === id)
          if (!folder) return s
          // Collect folder and all descendants
          const toRemove = new Set<string>()
          const queue = [id]
          while (queue.length) {
            const cur = queue.pop()!
            toRemove.add(cur)
            s.folders.filter(f => f.parentId === cur).forEach(f => queue.push(f.id))
          }
          const removedTerminals = s.terminals.filter(t => t.folderId != null && toRemove.has(t.folderId))
          const removedTermIds = new Set(removedTerminals.map(t => t.id))
          const childFolders = s.folders.filter(f => toRemove.has(f.id) && f.id !== id)
          const trashEntry: TrashedItem = {
            id: crypto.randomUUID(),
            trashedAt: Date.now(),
            type: 'folder',
            originalFolderId: folder.parentId,
            originalOrder: folder.order,
            folder,
            terminals: removedTerminals,
            childFolders,
          }
          const remaining = s.terminals.filter(t => !t.folderId || !toRemove.has(t.folderId))
          const activeGone = toRemove.has(s.activeTerminalId ?? '') ||
            s.terminals.find(t => t.id === s.activeTerminalId && t.folderId && toRemove.has(t.folderId)) != null
          // Clean up split layouts that reference removed terminals
          const splitLayouts = s.splitLayouts.filter(sl => !removedTermIds.has(sl.leftId) && !removedTermIds.has(sl.rightId))
          const focusedPaneId = splitLayouts.some(sl => sl.leftId === s.focusedPaneId || sl.rightId === s.focusedPaneId)
            ? s.focusedPaneId : null
          return {
            folders: s.folders.filter(f => !toRemove.has(f.id)),
            terminals: remaining,
            activeTerminalId: activeGone ? (remaining[remaining.length - 1]?.id ?? null) : s.activeTerminalId,
            splitLayouts,
            focusedPaneId,
            favoriteIds: s.favoriteIds.filter(fid => !toRemove.has(fid) && !removedTermIds.has(fid)),
            trashedItems: [...s.trashedItems, trashEntry],
            activeFolderId: s.activeFolderId && toRemove.has(s.activeFolderId) ? null : s.activeFolderId,
          }
        }
      }),

    restoreFromTrash: (trashId) =>
      set(s => {
        const item = s.trashedItems.find(i => i.id === trashId)
        if (!item) return s
        let folders = [...s.folders]
        let terminals = [...s.terminals]
        if (item.type === 'terminal' && item.terminals.length > 0) {
          const term = item.terminals[0]
          // If original folder still exists, restore there; otherwise top-level
          const parentExists = term.folderId && folders.some(f => f.id === term.folderId)
          terminals.push({ ...term, folderId: parentExists ? term.folderId : undefined })
        } else if (item.type === 'folder' && item.folder) {
          // If original parent still exists, restore there; otherwise top-level
          const parentExists = item.folder.parentId && folders.some(f => f.id === item.folder!.parentId)
          folders.push({ ...item.folder, parentId: parentExists ? item.folder.parentId : undefined })
          // Restore child folders
          for (const cf of item.childFolders) {
            // Child folder's parent is either still in the restored tree or the top-level folder
            const cfParentInTree = cf.parentId === item.folder.id || item.childFolders.some(f => f.id === cf.parentId)
            folders.push({ ...cf, parentId: cfParentInTree ? cf.parentId : item.folder.id })
          }
          // Restore terminals
          for (const t of item.terminals) {
            const tParentExists = t.folderId && (t.folderId === item.folder.id || item.childFolders.some(f => f.id === t.folderId))
            terminals.push({ ...t, folderId: tParentExists ? t.folderId : item.folder.id })
          }
        }
        return {
          folders,
          terminals,
          trashedItems: s.trashedItems.filter(i => i.id !== trashId),
        }
      }),

    permanentlyDelete: (trashId) =>
      set(s => ({ trashedItems: s.trashedItems.filter(i => i.id !== trashId) })),

    emptyTrash: () => set({ trashedItems: [] }),

    purgeExpiredTrash: () =>
      set(s => {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
        const filtered = s.trashedItems.filter(i => i.trashedAt > cutoff)
        return filtered.length === s.trashedItems.length ? s : { trashedItems: filtered }
      }),

    mergeSettings: (settings: Settings) =>
      set(s => ({
        settings: { ...DEFAULT_SETTINGS, ...settings, pluginSettings: { ...DEFAULT_PLUGIN_SETTINGS, ...settings?.pluginSettings } },
      })),

    getAppState: () => {
      const { folders, terminals, activeTerminalId, sidebarOpen, rightSidebarOpen, activeRightPlugin, splitLayouts, focusedPaneId, fontSize, appZoom, panelCollapsed, pluginIconOverrides, sidebarWidth, rightSidebarWidth, settings, favoriteIds, installedPlugins, commandHistory, trashedItems, lastActiveTerminalByFolder } = get()
      const result: AppState = { folders, terminals, activeTerminalId, sidebarOpen, rightSidebarOpen, activeRightPlugin, splitLayouts, focusedPaneId, fontSize, appZoom, panelCollapsed, pluginIconOverrides, sidebarWidth, rightSidebarWidth, settings, favoriteIds, installedPlugins, commandHistory, trashedItems, lastActiveTerminalByFolder }
      for (const p of allPlugins) {
        if (p.state) result[p.state.stateKey] = p.state.serialize()
      }
      return result
    },

    getWindowState: () => {
      const { windowId, folders, terminals, activeTerminalId, sidebarOpen, rightSidebarOpen, activeRightPlugin, splitLayouts, focusedPaneId, fontSize, appZoom, panelCollapsed, pluginIconOverrides, sidebarWidth, rightSidebarWidth, favoriteIds, installedPlugins, commandHistory, trashedItems, lastActiveTerminalByFolder } = get()
      const result: WindowState = { windowId, folders, terminals, activeTerminalId, sidebarOpen, rightSidebarOpen, activeRightPlugin, splitLayouts, focusedPaneId, fontSize, appZoom, panelCollapsed, pluginIconOverrides, sidebarWidth, rightSidebarWidth, favoriteIds, installedPlugins, commandHistory, trashedItems, lastActiveTerminalByFolder }
      for (const p of allPlugins) {
        if (p.state) result[p.state.stateKey] = p.state.serialize()
      }
      return result
    },
  }))
)
