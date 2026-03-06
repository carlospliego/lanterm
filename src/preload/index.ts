import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { homedir } from 'os'
import { IPC } from '../shared/ipcChannels'
import type {
  PtyCreateArgs,
  PtyDataEvent,
  PtyExitEvent,
} from '../shared/ipcChannels'
import type { WindowState, Settings } from '../shared/types'
import { pluginPreloadFactories } from '../plugins/registry-preload'

const termAPI = {
  homedir: homedir(),

  ptyCreate: (args: PtyCreateArgs) =>
    ipcRenderer.invoke(IPC.PTY_CREATE, args),

  ptyWrite: (id: string, data: string) =>
    ipcRenderer.invoke(IPC.PTY_WRITE, { id, data }),

  ptyResize: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC.PTY_RESIZE, { id, cols, rows }),

  ptyKill: (id: string) =>
    ipcRenderer.invoke(IPC.PTY_KILL, { id }),

  ptyCwd: (id: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PTY_GET_CWD, { id }),

  ptyHasRunningChild: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.PTY_HAS_RUNNING_CHILD, { id }),

  ptyForegroundProcess: (id: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.PTY_FOREGROUND_PROCESS, { id }),

  ptyShellPid: (id: string): Promise<number | null> =>
    ipcRenderer.invoke(IPC.PTY_SHELL_PID, { id }),

  windowStateLoad: (): Promise<{ windowState: WindowState | null; settings: Settings }> =>
    ipcRenderer.invoke(IPC.WINDOW_STATE_LOAD),

  windowStateSave: (state: WindowState): Promise<void> =>
    ipcRenderer.invoke(IPC.WINDOW_STATE_SAVE, state),

  settingsSave: (settings: Settings): Promise<void> =>
    ipcRenderer.invoke(IPC.SETTINGS_SAVE, settings),

  onSettingsChanged: (cb: (settings: Settings) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, settings: Settings) => cb(settings)
    ipcRenderer.on(IPC.SETTINGS_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.SETTINGS_CHANGED, handler)
  },

  getWindowId: (): string => {
    const params = new URLSearchParams(window.location.search)
    return params.get('windowId') ?? ''
  },

  onPtyData: (cb: (id: string, data: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: PtyDataEvent) =>
      cb(event.id, event.data)
    ipcRenderer.on(IPC.PTY_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.PTY_DATA, handler)
  },

  setBadge: (count: number): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_BADGE, count),

  onPtyExit: (cb: (id: string, code: number) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: PtyExitEvent) =>
      cb(event.id, event.code)
    ipcRenderer.on(IPC.PTY_EXIT, handler)
    return () => ipcRenderer.removeListener(IPC.PTY_EXIT, handler)
  },

  historyRead: (): Promise<string[]> => ipcRenderer.invoke(IPC.HISTORY_READ),

  setAppZoom: (level: number): void => webFrame.setZoomLevel(level),
  getAppZoom: (): number => webFrame.zoomLevel,
  getDefaultShell: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_DEFAULT_SHELL),

  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_EXTERNAL_URL, url),

  openFileInEditor: (filePath: string, cwd: string, line?: number, column?: number): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_FILE_IN_EDITOR, { filePath, cwd, line, column }),

  showOpenDialog: (options: { properties?: string[]; title?: string; defaultPath?: string }): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke(IPC.SHOW_OPEN_DIALOG, options),

  openInNewWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC.OPEN_IN_NEW_WINDOW),

  resetAllData: (): Promise<void> =>
    ipcRenderer.invoke(IPC.RESET_ALL_DATA),

  // Cross-window terminal search
  searchOtherWindows: (query: string, maxPerTerminal?: number) =>
    ipcRenderer.invoke(IPC.TERMINAL_SEARCH_OTHER_WINDOWS, { query, maxPerTerminal }),

  focusTerminalResult: (windowId: string, terminalId: string, lineIndex: number, matchStart: number, matchLength: number) =>
    ipcRenderer.invoke(IPC.TERMINAL_FOCUS_RESULT, { windowId, terminalId, lineIndex, matchStart, matchLength }),

  onActivateAndScroll: (cb: (terminalId: string, lineIndex: number, matchStart: number, matchLength: number) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: { terminalId: string; lineIndex: number; matchStart: number; matchLength: number }) =>
      cb(data.terminalId, data.lineIndex, data.matchStart, data.matchLength)
    ipcRenderer.on('terminal:activateAndScroll', handler)
    return () => ipcRenderer.removeListener('terminal:activateAndScroll', handler)
  },

  // External plugins
  externalPluginsScan: () => ipcRenderer.invoke(IPC.EXTERNAL_PLUGINS_SCAN),
  externalPluginRemove: (pluginId: string) => ipcRenderer.invoke(IPC.EXTERNAL_PLUGIN_REMOVE, pluginId),
  externalPluginImport: () => ipcRenderer.invoke(IPC.EXTERNAL_PLUGIN_IMPORT),
  externalPluginsOpenDir: () => ipcRenderer.invoke(IPC.EXTERNAL_PLUGINS_OPEN_DIR),

  // Plugin APIs
  ...pluginPreloadFactories.reduce((acc, factory) => ({ ...acc, ...factory(ipcRenderer) }), {}),
}

contextBridge.exposeInMainWorld('termAPI', termAPI)
