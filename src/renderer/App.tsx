import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from './store/useAppStore'
import { useShallow } from 'zustand/react/shallow'
import { resolveKeybindings, matchesBinding } from '../shared/keybindings'
import type { Keybinding } from '../shared/keybindings'
import { serializeRegistry, focusRegistry } from './terminalRegistry'
import { FONT_MONO, TYPE, RADIUS, SPACE, btnReset } from './designTokens'
import { deriveUITheme, applyDerivedTheme } from './themeDerivation'
import { getThemeById, AUTO_THEME_ID } from './terminalThemes'
import { Sidebar } from './components/Sidebar'
import { TerminalPane } from './components/TerminalPane'
import { SettingsDialog } from './components/SettingsDialog'
import { PluginGallery } from './components/PluginGallery'
import { UnifiedPalette } from './components/UnifiedPalette'
import { TrashDialog } from './components/TrashDialog'
import { ToastContainer } from './components/Toast'
import { ZoomIndicator, showZoomIndicator } from './components/ZoomIndicator'
import { InputDialogContainer } from './components/InputDialog'
import { ConfirmDialogContainer } from './components/ConfirmDialog'
import { ListPickerContainer } from './components/ListPicker'
import { HintsOverlay } from './components/HintsOverlay'
import { OnboardingTour } from './components/OnboardingTour'
import { NewMenu } from './components/NewMenu'
import { FolderPage } from './components/FolderPage'
import { ActivityBar } from './components/ActivityBar'
import { useCombinedPlugins, scanAndLoadExternalPlugins } from './useExternalPlugins'
import type { SidebarPlugin } from '../plugins/registry'
import type { TerminalSession } from '../../shared/types'

export function App() {
  // Data selectors — only re-render when these specific values change
  const {
    terminals,
    folders,
    activeTerminalId,
    sidebarOpen,
    rightSidebarOpen,
    splitLayouts,
    focusedPaneId,
    sidebarWidth,
    rightSidebarWidth,
    settings,
    installedPlugins,
    activeRightPlugin,
    activeFolderId,
  } = useAppStore(useShallow(s => ({
    terminals: s.terminals,
    folders: s.folders,
    activeTerminalId: s.activeTerminalId,
    sidebarOpen: s.sidebarOpen,
    rightSidebarOpen: s.rightSidebarOpen,
    splitLayouts: s.splitLayouts,
    focusedPaneId: s.focusedPaneId,
    sidebarWidth: s.sidebarWidth,
    rightSidebarWidth: s.rightSidebarWidth,
    settings: s.settings,
    installedPlugins: s.installedPlugins,
    activeRightPlugin: s.activeRightPlugin,
    activeFolderId: s.activeFolderId,
  })))

  // Action selectors — stable references, never cause re-renders
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const toggleRightSidebar = useAppStore(s => s.toggleRightSidebar)
  const setSidebarWidth = useAppStore(s => s.setSidebarWidth)
  const setRightSidebarWidth = useAppStore(s => s.setRightSidebarWidth)
  const hydrate = useAppStore(s => s.hydrate)
  const addTerminal = useAppStore(s => s.addTerminal)
  const addFolder = useAppStore(s => s.addFolder)
  const removeTerminal = useAppStore(s => s.removeTerminal)
  const setActiveTerminal = useAppStore(s => s.setActiveTerminal)
  const splitTerminal = useAppStore(s => s.splitTerminal)
  const setSplitRatio = useAppStore(s => s.setSplitRatio)
  const setFocusedPane = useAppStore(s => s.setFocusedPane)
  const togglePrompt = useAppStore(s => s.togglePrompt)
  const setTerminalFontSize = useAppStore(s => s.setTerminalFontSize)
  const setAppZoom = useAppStore(s => s.setAppZoom)
  const openSettings = useAppStore(s => s.openSettings)
  const closeSettings = useAppStore(s => s.closeSettings)
  const setResolvedTheme = useAppStore(s => s.setResolvedTheme)
  const openPalette = useAppStore(s => s.openPalette)
  const closePalette = useAppStore(s => s.closePalette)
  const mergeSettings = useAppStore(s => s.mergeSettings)

  const combinedPlugins = useCombinedPlugins()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)
  const isSettingsMerge = useRef(false)
  const mainRef = useRef<HTMLDivElement>(null)

  // Load persisted state on mount
  useEffect(() => {
    const windowId = window.termAPI.getWindowId()
    useAppStore.setState({ windowId })

    window.termAPI.windowStateLoad().then(({ windowState, settings: loadedSettings }) => {
      if (windowState) {
        // Restore existing window — merge settings into AppState shape for hydrate()
        hydrate({ ...windowState, settings: loadedSettings } as any)
        useAppStore.getState().purgeExpiredTrash()
        window.termAPI.setAppZoom(windowState.appZoom ?? 0)
      } else {
        // Fresh window — just apply settings
        const termId = uuidv4()
        hydrate({
          folders: [],
          terminals: [{
            id: termId,
            title: 'Terminal 1',
            cwd: window.termAPI.homedir,
            order: 0,
            scrollback: '',
            icon: 'fa:fa-solid fa-terminal',
          }],
          activeTerminalId: termId,
          sidebarOpen: true,
          rightSidebarOpen: true,
          splitLayouts: [],
          focusedPaneId: null,
          fontSize: 13,
          appZoom: 0,
          panelCollapsed: {},
          sidebarWidth: 220,
          rightSidebarWidth: 260,
          settings: loadedSettings,
          favoriteIds: [],
          installedPlugins: [],
          commandHistory: [],
          trashedItems: [],
          lastActiveTerminalByFolder: {},
        } as any)
      }
      hydratedRef.current = true
    })
  }, [hydrate])

  // Scan for external plugins on startup
  useEffect(() => { scanAndLoadExternalPlugins() }, [])

  // Listen for cross-window activate-and-scroll requests
  useEffect(() => {
    return window.termAPI.onActivateAndScroll((terminalId, lineIndex, matchStart, matchLength) => {
      setActiveTerminal(terminalId)
      setTimeout(() => {
        const term = focusRegistry.get(terminalId)
        if (term) {
          term.scrollToLine(lineIndex)
          term.select(matchStart, lineIndex, matchLength)
          term.focus()
        }
      }, 50)
    })
  }, [setActiveTerminal])

  // Apply theme to <html data-theme="..."> and sync resolvedTheme into store
  // When a named terminal theme is selected, derive UI CSS vars from it
  useEffect(() => {
    const apply = () => {
      const { theme, terminalTheme } = useAppStore.getState().settings

      if (terminalTheme !== AUTO_THEME_ID) {
        // Named theme — derive UI colors from the terminal palette
        const def = getThemeById(terminalTheme)
        if (def) {
          const effective: 'light' | 'dark' = def.isDark ? 'dark' : 'light'
          document.documentElement.setAttribute('data-theme', effective)
          setResolvedTheme(effective)
          applyDerivedTheme(deriveUITheme(def))
          return
        }
      }

      // Auto theme — clear any derived overrides, use stylesheet
      applyDerivedTheme(null)
      const effective: 'light' | 'dark' =
        theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme
      document.documentElement.setAttribute('data-theme', effective)
      setResolvedTheme(effective)
    }
    apply()
    if (settings.terminalTheme === AUTO_THEME_ID && settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [settings.theme, settings.terminalTheme, setResolvedTheme])

  const captureAndSave = useCallback(() => {
    if (!hydratedRef.current) return
    const { updateScrollback, getWindowState } = useAppStore.getState()
    for (const [id, addon] of serializeRegistry) {
      try { updateScrollback(id, addon.serialize()) } catch { /* ignore */ }
    }
    window.termAPI.windowStateSave(useAppStore.getState().getWindowState())
  }, [])

  // Debounced save on structural state changes
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      state => ({ folders: state.folders, terminals: state.terminals, sidebarOpen: state.sidebarOpen, rightSidebarOpen: state.rightSidebarOpen, activeRightPlugin: state.activeRightPlugin, splitLayouts: state.splitLayouts, sidebarWidth: state.sidebarWidth, rightSidebarWidth: state.rightSidebarWidth, settings: state.settings, installedPlugins: state.installedPlugins, commandHistory: state.commandHistory, trashedItems: state.trashedItems }),
      () => {
        if (!hydratedRef.current) return
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(captureAndSave, 1000)
      }
    )
    return () => {
      unsubscribe()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [captureAndSave])

  // Save settings changes to main process (debounced 500ms)
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      state => state.settings,
      () => {
        if (!hydratedRef.current || isSettingsMerge.current) return
        if (settingsSaveTimerRef.current) clearTimeout(settingsSaveTimerRef.current)
        settingsSaveTimerRef.current = setTimeout(() => {
          window.termAPI.settingsSave(useAppStore.getState().settings)
        }, 500)
      }
    )
    return () => {
      unsubscribe()
      if (settingsSaveTimerRef.current) clearTimeout(settingsSaveTimerRef.current)
    }
  }, [])

  // Receive settings changes from other windows
  useEffect(() => {
    return window.termAPI.onSettingsChanged((settings) => {
      isSettingsMerge.current = true
      mergeSettings(settings)
      isSettingsMerge.current = false
    })
  }, [mergeSettings])

  // Save on unload
  useEffect(() => {
    window.addEventListener('beforeunload', captureAndSave)
    return () => window.removeEventListener('beforeunload', captureAndSave)
  }, [captureAndSave])

  const createTerminal = useAppStore(s => s.createTerminal)

  const moveToTrash = useAppStore(s => s.moveToTrash)

  const closeActiveTerminal = useCallback(async () => {
    const { terminals: ts, activeTerminalId: activeId, activeFolderId: folderId, folders: fs } = useAppStore.getState()

    // If a folder page is active, trash the folder
    if (folderId) {
      const folder = fs.find(f => f.id === folderId)
      const childTerminals = ts.filter(t => t.folderId === folderId)
      if (childTerminals.length > 0) {
        const confirmed = window.confirm(`Move "${folder?.name ?? 'folder'}" to trash?\n\nThis will close ${childTerminals.length} terminal${childTerminals.length === 1 ? '' : 's'}.`)
        if (!confirmed) return
      }
      childTerminals.forEach(t => window.termAPI.ptyKill(t.id))
      moveToTrash('folder', folderId)
      return
    }

    if (ts.length === 0) {
      window.close()
      return
    }
    if (!activeId) return
    window.termAPI.ptyKill(activeId)
    moveToTrash('terminal', activeId)
  }, [moveToTrash])

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    const { splitLayouts: sls, activeTerminalId: activeId } = useAppStore.getState()
    const sl = sls.find(l => l.leftId === activeId || l.rightId === activeId)
    if (!sl || !mainRef.current) return
    e.preventDefault()
    const startX = e.clientX
    const startRatio = sl.ratio
    const splitId = sl.leftId
    const containerWidth = mainRef.current.offsetWidth
    const onMove = (ev: MouseEvent) => {
      const delta = (ev.clientX - startX) / containerWidth
      setSplitRatio(splitId, Math.min(0.85, Math.max(0.15, startRatio + delta)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setSplitRatio])

  const onLeftSidebarResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = useAppStore.getState().sidebarWidth
    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(startWidth + (ev.clientX - startX))
      window.dispatchEvent(new Event('resize'))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setSidebarWidth])

  const onRightSidebarResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = useAppStore.getState().rightSidebarWidth
    const onMove = (ev: MouseEvent) => {
      setRightSidebarWidth(startWidth - (ev.clientX - startX))
      window.dispatchEvent(new Event('resize'))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [setRightSidebarWidth])

  const getOrderedTerminals = useCallback((): TerminalSession[] => {
    const result: TerminalSession[] = []

    terminals
      .filter(t => !t.folderId)
      .sort((a, b) => a.order - b.order)
      .forEach(t => result.push(t))

    function visitFolder(folderId: string) {
      terminals
        .filter(t => t.folderId === folderId)
        .sort((a, b) => a.order - b.order)
        .forEach(t => result.push(t))
      folders
        .filter(f => f.parentId === folderId)
        .sort((a, b) => a.order - b.order)
        .forEach(f => visitFolder(f.id))
    }

    folders
      .filter(f => !f.parentId)
      .sort((a, b) => a.order - b.order)
      .forEach(f => visitFolder(f.id))

    return result
  }, [terminals, folders])

  const executeCommand = useCallback((id: string) => {
    switch (id) {
      case 'newTerminal': createTerminal(); break
      case 'closeTerminal': closeActiveTerminal(); break
      case 'toggleSidebar':
        toggleSidebar()
        setTimeout(() => { window.dispatchEvent(new Event('resize')) }, 50)
        break
      case 'toggleRightSidebar':
        toggleRightSidebar()
        setTimeout(() => { window.dispatchEvent(new Event('resize')) }, 50)
        break
      case 'openSettings':
        if (useAppStore.getState().settingsOpen) closeSettings()
        else openSettings()
        break
      case 'findInTerminal':
        if (useAppStore.getState().paletteOpen) closePalette()
        else openPalette('find')
        break
      case 'togglePrompt': togglePrompt(); break
      case 'commandPalette':
        if (useAppStore.getState().paletteOpen) closePalette()
        else openPalette()
        break
      case 'increaseFontSize': {
        const { focusedPaneId: fp, activeTerminalId: at, terminals: ts, fontSize: gfs, splitLayouts: sls } = useAppStore.getState()
        const inSplit = sls.some(sl => sl.leftId === at || sl.rightId === at)
        const targetId = (inSplit && fp) ? fp : at
        if (targetId) {
          const cur = ts.find(t => t.id === targetId)?.fontSize ?? gfs
          const next = cur + 1
          setTerminalFontSize(targetId, next)
          showZoomIndicator(`Font ${next}px`)
        }
        break
      }
      case 'decreaseFontSize': {
        const { focusedPaneId: fp, activeTerminalId: at, terminals: ts, fontSize: gfs, splitLayouts: sls } = useAppStore.getState()
        const inSplit = sls.some(sl => sl.leftId === at || sl.rightId === at)
        const targetId = (inSplit && fp) ? fp : at
        if (targetId) {
          const cur = ts.find(t => t.id === targetId)?.fontSize ?? gfs
          const next = cur - 1
          setTerminalFontSize(targetId, next)
          showZoomIndicator(`Font ${next}px`)
        }
        break
      }
      case 'resetFontSize': {
        const { focusedPaneId: fp, activeTerminalId: at, splitLayouts: sls } = useAppStore.getState()
        const inSplit = sls.some(sl => sl.leftId === at || sl.rightId === at)
        const targetId = (inSplit && fp) ? fp : at
        if (targetId) {
          setTerminalFontSize(targetId, 13)
          showZoomIndicator('Font 13px')
        }
        break
      }
      case 'zoomIn': {
        const next = useAppStore.getState().appZoom + 1
        setAppZoom(next)
        window.termAPI.setAppZoom(next)
        showZoomIndicator(`Zoom ${Math.round(100 * Math.pow(1.2, next))}%`)
        break
      }
      case 'zoomOut': {
        const next = useAppStore.getState().appZoom - 1
        setAppZoom(next)
        window.termAPI.setAppZoom(next)
        showZoomIndicator(`Zoom ${Math.round(100 * Math.pow(1.2, next))}%`)
        break
      }
      case 'resetZoom':
        setAppZoom(0)
        window.termAPI.setAppZoom(0)
        showZoomIndicator('Zoom 100%')
        break
      case 'splitPane': {
        const { activeTerminalId: activeId, splitLayouts: sls } = useAppStore.getState()
        if (activeId && !sls.some(sl => sl.leftId === activeId || sl.rightId === activeId)) {
          splitTerminal(activeId)
        }
        break
      }
      case 'focusLeftPane': {
        const { splitLayouts: sls, activeTerminalId: activeId } = useAppStore.getState()
        const sl = sls.find(l => l.leftId === activeId || l.rightId === activeId)
        if (sl) { setFocusedPane(sl.leftId); focusRegistry.get(sl.leftId)?.focus() }
        break
      }
      case 'focusRightPane': {
        const { splitLayouts: sls, activeTerminalId: activeId } = useAppStore.getState()
        const sl = sls.find(l => l.leftId === activeId || l.rightId === activeId)
        if (sl) { setFocusedPane(sl.rightId); focusRegistry.get(sl.rightId)?.focus() }
        break
      }
      case 'switchPaneLeft':
      case 'switchPaneRight': {
        const { splitLayouts: sls, activeTerminalId: activeId, focusedPaneId: fp } = useAppStore.getState()
        const sl = sls.find(l => l.leftId === activeId || l.rightId === activeId)
        if (sl) {
          const target = id === 'switchPaneLeft'
            ? (fp === sl.leftId ? sl.rightId : sl.leftId)
            : (fp === sl.rightId ? sl.leftId : sl.rightId)
          setFocusedPane(target)
          focusRegistry.get(target)?.focus()
        }
        break
      }
      case 'hintsMode': {
        const { hintsActive } = useAppStore.getState()
        if (hintsActive) useAppStore.getState().closeHints()
        else useAppStore.getState().openHints()
        break
      }
      case 'newFolder': {
        const { folders: fs, setActiveFolder: setFolder } = useAppStore.getState()
        const folderId = uuidv4()
        addFolder({ id: folderId, name: `Folder ${fs.length + 1}`, order: fs.length, icon: 'fa:fa-solid fa-folder' })
        setFolder(folderId)
        break
      }
      case 'newWindow': {
        window.termAPI.openInNewWindow()
        break
      }
      case 'newMenu': {
        const { newMenuOpen } = useAppStore.getState()
        if (newMenuOpen) useAppStore.getState().closeNewMenu()
        else useAppStore.getState().openNewMenu()
        break
      }
      case 'activatePlugin1': case 'activatePlugin2': case 'activatePlugin3':
      case 'activatePlugin4': case 'activatePlugin5': case 'activatePlugin6':
      case 'activatePlugin7': case 'activatePlugin8': case 'activatePlugin9': {
        const idx = parseInt(id.replace('activatePlugin', '')) - 1
        const { installedPlugins: ip, rightSidebarOpen: rso, activeRightPlugin: arp } = useAppStore.getState()
        const pluginMap = new Map(combinedPlugins.map(p => [p.id, p]))
        const installed = ip.map(id => pluginMap.get(id)).filter((p): p is SidebarPlugin => p != null)
        if (idx < installed.length) {
          const pluginId = installed[idx].id
          if (rso && arp === pluginId) {
            toggleRightSidebar()
          } else {
            useAppStore.getState().setActiveRightPlugin(pluginId)
            if (!rso) toggleRightSidebar()
          }
          setTimeout(() => { window.dispatchEvent(new Event('resize')) }, 50)
        }
        break
      }
      case 'renameTerminal': {
        window.dispatchEvent(new CustomEvent('rename-active-terminal'))
        break
      }
      case 'duplicateTerminal': {
        const { activeTerminalId: activeId, activeFolderId: folderId, terminals: ts } = useAppStore.getState()

        // If a folder page is active, duplicate the folder
        if (folderId) {
          window.dispatchEvent(new CustomEvent('duplicate-active-folder', { detail: folderId }))
          break
        }

        if (!activeId) break
        const term = ts.find(t => t.id === activeId)
        if (!term) break
        const siblings = ts.filter(t => t.folderId === term.folderId)
        const newId = uuidv4()
        addTerminal({
          id: newId,
          title: term.title + ' (copy)',
          cwd: term.cwd,
          order: siblings.length,
          scrollback: '',
          folderId: term.folderId,
          icon: term.icon,
          terminalTheme: term.terminalTheme,
          fontSize: term.fontSize,
        })
        setActiveTerminal(newId)
        break
      }
      case 'prevTerminal': {
        const { activeTerminalId: activeId, focusedPaneId: fp, splitLayouts: sls } = useAppStore.getState()
        const currentSplit = sls.find(sl => sl.leftId === activeId || sl.rightId === activeId)
        if (currentSplit && (fp === currentSplit.rightId || (!fp && activeId === currentSplit.rightId))) {
          setFocusedPane(currentSplit.leftId)
          focusRegistry.get(currentSplit.leftId)?.focus()
        } else {
          const ordered = getOrderedTerminals()
          if (ordered.length < 2) return
          const curIdx = ordered.findIndex(t => t.id === activeId)
          let prevIdx = curIdx
          do {
            prevIdx = prevIdx <= 0 ? ordered.length - 1 : prevIdx - 1
          } while (currentSplit && (ordered[prevIdx].id === currentSplit.leftId || ordered[prevIdx].id === currentSplit.rightId) && prevIdx !== curIdx)
          if (prevIdx === curIdx) return
          const prevId = ordered[prevIdx].id
          setActiveTerminal(prevId)
          const prevSplit = sls.find(sl => sl.leftId === prevId || sl.rightId === prevId)
          if (prevSplit) {
            setFocusedPane(prevSplit.rightId)
            focusRegistry.get(prevSplit.rightId)?.focus()
          }
        }
        break
      }
      case 'nextTerminal': {
        const { activeTerminalId: activeId, focusedPaneId: fp, splitLayouts: sls } = useAppStore.getState()
        const currentSplit = sls.find(sl => sl.leftId === activeId || sl.rightId === activeId)
        if (currentSplit && (fp === currentSplit.leftId || (!fp && activeId === currentSplit.leftId))) {
          setFocusedPane(currentSplit.rightId)
          focusRegistry.get(currentSplit.rightId)?.focus()
        } else {
          const ordered = getOrderedTerminals()
          if (ordered.length < 2) return
          const curIdx = ordered.findIndex(t => t.id === activeId)
          let nextIdx = curIdx
          do {
            nextIdx = nextIdx >= ordered.length - 1 ? 0 : nextIdx + 1
          } while (currentSplit && (ordered[nextIdx].id === currentSplit.leftId || ordered[nextIdx].id === currentSplit.rightId) && nextIdx !== curIdx)
          if (nextIdx === curIdx) return
          const nextId = ordered[nextIdx].id
          setActiveTerminal(nextId)
          const nextSplit = sls.find(sl => sl.leftId === nextId || sl.rightId === nextId)
          if (nextSplit) {
            setFocusedPane(nextSplit.leftId)
            focusRegistry.get(nextSplit.leftId)?.focus()
          }
        }
        break
      }
    }
  }, [createTerminal, closeActiveTerminal, toggleSidebar, toggleRightSidebar, openSettings, closeSettings, openPalette, closePalette, togglePrompt, setTerminalFontSize, setAppZoom, splitTerminal, setFocusedPane, setActiveTerminal, getOrderedTerminals, addFolder, addTerminal])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Built-in command keybindings
      // Cmd+Delete → same as closeTerminal
      if (e.metaKey && !e.shiftKey && !e.altKey && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault()
        executeCommand('closeTerminal')
        return
      }

      const kb = resolveKeybindings(useAppStore.getState().settings.keybindings)
      const commandIds = Object.keys(kb) as (keyof typeof kb)[]
      for (const id of commandIds) {
        if (matchesBinding(e, kb[id])) {
          e.preventDefault()
          executeCommand(id)
          return
        }
      }

      // Plugin action keybindings
      const pluginBindings = useAppStore.getState().settings.pluginKeybindings ?? {}
      const pluginActionIds = Object.keys(pluginBindings)
      if (pluginActionIds.length > 0) {
        for (const actionId of pluginActionIds) {
          if (matchesBinding(e, pluginBindings[actionId])) {
            e.preventDefault()
            // Find the action across all installed plugins and execute it
            const { installedPlugins: ip } = useAppStore.getState()
            for (const plugin of combinedPlugins) {
              if (!ip.includes(plugin.id) || !plugin.actions) continue
              const action = plugin.actions().find(a => a.id === actionId)
              if (action) { action.execute(); return }
            }
            return
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [executeCommand, combinedPlugins])

  // Find the split layout (if any) that contains the currently active terminal.
  // Switching to a non-split terminal hides the split but keeps it alive in the store —
  // clicking either split pane in the sidebar brings it back.
  const activeSplitLayout = splitLayouts.find(
    sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId
  ) ?? null
  const showSplit = activeSplitLayout != null
  const showFolderPage = activeFolderId != null && folders.some(f => f.id === activeFolderId)

  const pluginMap = useMemo(() => new Map(combinedPlugins.map(p => [p.id, p])), [combinedPlugins])

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      {combinedPlugins
        .filter(p => installedPlugins.includes(p.id) && p.OverlayComponent)
        .map(p => <p.OverlayComponent key={`overlay-${p.id}`} />)}
      <OnboardingTour />
      <HintsOverlay />
      <SettingsDialog />
      <PluginGallery />
      <TrashDialog />
      <UnifiedPalette executeCommand={executeCommand} />
      <NewMenu executeCommand={executeCommand} />
      <ToastContainer />
      <ZoomIndicator />
      <InputDialogContainer />
      <ConfirmDialogContainer />
      <ListPickerContainer />
      {sidebarOpen && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Sidebar side="left" width={sidebarWidth} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: -2,
              bottom: 0,
              width: 5,
              cursor: 'col-resize',
              zIndex: 10,
            }}
            onMouseDown={onLeftSidebarResizeMouseDown}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          />
        </div>
      )}
      <div ref={mainRef} data-tour="main-area" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Drag region only when no terminals are open; TerminalPane title bar handles it otherwise */}
        {terminals.length === 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 32,
            zIndex: 5,
            WebkitAppRegion: 'drag',
          } as React.CSSProperties} />
        )}
        <button
          onClick={toggleSidebar}
          title={`${sidebarOpen ? 'Hide' : 'Show'} sidebar (⌘←)`}
          style={{
            ...btnReset,
            position: 'absolute',
            bottom: SPACE.sm,
            left: SPACE.sm,
            zIndex: 10,
            color: sidebarOpen ? 'var(--text-faintest)' : 'var(--text-dim)',
            fontSize: 18,
            padding: `${SPACE.xxs}px ${SPACE.xs}px`,
            borderRadius: RADIUS.md,
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = sidebarOpen ? 'var(--text-faintest)' : 'var(--text-dim)')}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
        <button
          onClick={toggleRightSidebar}
          title={`${rightSidebarOpen ? 'Hide' : 'Show'} right sidebar (⌘→)`}
          style={{
            ...btnReset,
            position: 'absolute',
            bottom: SPACE.sm,
            right: SPACE.sm,
            zIndex: 10,
            color: rightSidebarOpen ? 'var(--text-faintest)' : 'var(--text-dim)',
            fontSize: 18,
            padding: `${SPACE.xxs}px ${SPACE.xs}px`,
            borderRadius: RADIUS.md,
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          onMouseLeave={e => (e.currentTarget.style.color = rightSidebarOpen ? 'var(--text-faintest)' : 'var(--text-dim)')}
        >
          {rightSidebarOpen ? '›' : '‹'}
        </button>
        {terminals.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontFamily: FONT_MONO, maxWidth: 380 }}>
              {/* Command palette section */}
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}>
                  <kbd style={{
                    background: 'var(--elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: RADIUS.md,
                    color: 'var(--text-faint)',
                    fontSize: 11,
                    padding: '2px 7px',
                  }}>⌘P</kbd>
                  <span style={{ color: 'var(--text-muted)', fontSize: TYPE.md, fontWeight: 500 }}>Command Palette</span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '6px 12px',
                  paddingLeft: 4,
                }}>
                  {([
                    ['>', 'commands', 'Run a command'],
                    ['/', 'find', 'Search terminal content'],
                    ['!', 'history', 'Browse shell history'],
                  ] as [string, string, string][]).map(([prefix, , desc]) => (
                    <React.Fragment key={prefix}>
                      <kbd style={{
                        background: 'var(--elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: RADIUS.sm,
                        color: 'var(--accent)',
                        fontSize: 11,
                        padding: '1px 6px',
                        textAlign: 'center',
                        fontWeight: 600,
                        minWidth: 20,
                      }}>{prefix}</kbd>
                      <span style={{ color: 'var(--text-faintest)', fontSize: TYPE.body }}>{desc}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {/* Divider */}
              <div style={{
                borderTop: '1px solid var(--border-subtle)',
                marginBottom: 16,
              }} />
              {/* Shortcuts section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '6px 12px',
              }}>
                {([
                  ['⌘T', 'New terminal'],
                  ['⌘D', 'Split pane'],
                  ['⌘,', 'Settings'],
                  ['⌘←', 'Toggle sidebar'],
                  ['⌘→', 'Toggle right sidebar'],
                ] as [string, string][]).map(([key, label]) => (
                  <React.Fragment key={key}>
                    <kbd style={{
                      background: 'var(--elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: RADIUS.md,
                      color: 'var(--text-faint)',
                      fontSize: 11,
                      padding: '2px 7px',
                      textAlign: 'center',
                    }}>{key}</kbd>
                    <span style={{ color: 'var(--text-faintest)', fontSize: TYPE.body }}>{label}</span>
                  </React.Fragment>
                ))}
              </div>
              {/* Links */}
              <div style={{
                borderTop: '1px solid var(--border-subtle)',
                marginTop: 16,
                paddingTop: 12,
                display: 'flex',
                gap: 16,
              }}>
                <span
                  onClick={() => openSettings('commands')}
                  style={{
                    color: 'var(--text-faintest)',
                    fontSize: TYPE.body,
                    cursor: 'pointer',
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
                >Keybindings &amp; Commands</span>
              </div>
            </div>
          </div>
        )}
        {showFolderPage && <FolderPage />}
        {terminals.map(session => {
          let wrapperStyle: React.CSSProperties

          if (showFolderPage) {
            wrapperStyle = { display: 'none' }
          } else if (showSplit && activeSplitLayout) {
            if (session.id === activeSplitLayout.leftId) {
              wrapperStyle = {
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${activeSplitLayout.ratio * 100}%`,
              }
            } else if (session.id === activeSplitLayout.rightId) {
              wrapperStyle = {
                position: 'absolute',
                top: 0,
                left: `calc(${activeSplitLayout.ratio * 100}% + 4px)`,
                bottom: 0,
                right: 0,
              }
            } else {
              wrapperStyle = { display: 'none' }
            }
          } else {
            wrapperStyle = {
              position: 'absolute',
              inset: 0,
              display: session.id === activeTerminalId ? 'block' : 'none',
            }
          }

          // isInSplit: terminal belongs to ANY split pair (hides split button)
          const isInSplit = splitLayouts.some(sl => session.id === sl.leftId || session.id === sl.rightId)
          // isInActiveSplit: terminal belongs to the currently visible split pair
          const isInActiveSplit = activeSplitLayout != null &&
            (session.id === activeSplitLayout.leftId || session.id === activeSplitLayout.rightId)

          return (
            <div key={session.id} style={{ ...wrapperStyle, zIndex: 6 }}>
              <TerminalPane
                session={session}
                isActive={showSplit ? isInActiveSplit : session.id === activeTerminalId}
                isFocused={showSplit && isInActiveSplit ? session.id === focusedPaneId : undefined}
                showSplitButton={!isInSplit && session.id === activeTerminalId}
                onSplit={!isInSplit ? () => splitTerminal(session.id) : undefined}
                onClose={isInActiveSplit ? () => removeTerminal(session.id) : undefined}
                onFocus={isInActiveSplit ? () => setFocusedPane(session.id) : undefined}
              />
            </div>
          )
        })}
        {showSplit && activeSplitLayout && !showFolderPage && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${activeSplitLayout.ratio * 100}%`,
              width: 4,
              background: 'var(--elevated)',
              cursor: 'col-resize',
              zIndex: 10,
            }}
            onMouseDown={onDividerMouseDown}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--elevated)')}
          />
        )}
      </div>
      {rightSidebarOpen && (() => {
        const installedPluginList = installedPlugins
          .map(id => pluginMap.get(id))
          .filter((p): p is SidebarPlugin => p != null)
        const hasActivePanel = activeRightPlugin && installedPluginList.some(p => p.id === activeRightPlugin)
        return (
          <>
            {hasActivePanel && (
              <div
                style={{
                  width: 4,
                  cursor: 'col-resize',
                  flexShrink: 0,
                  background: 'var(--surface)',
                }}
                onMouseDown={onRightSidebarResizeMouseDown}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
              />
            )}
            <div
              data-testid="right-sidebar"
              style={{
                width: hasActivePanel ? rightSidebarWidth : 0,
                minWidth: hasActivePanel ? 140 : 0,
                height: '100%',
                background: 'var(--surface)',
                display: hasActivePanel ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '6px 0',
              }}
            >
              {installedPluginList.map(p => (
                <div
                  key={p.id}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: activeRightPlugin === p.id ? 'flex' : 'none',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <p.PanelComponent />
                </div>
              ))}
            </div>
            <ActivityBar plugins={installedPluginList} />
          </>
        )
      })()}
    </div>
  )
}
