/// <reference types="vite/client" />
import type { WindowState, Settings } from '../shared/types'
import type { ExternalPluginPayload } from '../shared/externalPluginTypes'
import type { PluginTermAPI } from '../plugins/registry-types'
import type { RemoteFindMatch } from './terminalRegistry'

interface CoreTermAPI {
  homedir: string

  // PTY
  ptyCreate(args: { id: string; cwd: string; cols: number; rows: number; shell?: string }): Promise<void>
  ptyWrite(id: string, data: string): Promise<void>
  ptyResize(id: string, cols: number, rows: number): Promise<void>
  ptyKill(id: string): Promise<void>
  ptyCwd(id: string): Promise<string | null>
  ptyHasRunningChild(id: string): Promise<boolean>
  ptyForegroundProcess(id: string): Promise<string | null>
  ptyShellPid(id: string): Promise<number | null>
  onPtyData(cb: (id: string, data: string) => void): () => void
  onPtyExit(cb: (id: string, code: number) => void): () => void

  // Per-window state
  windowStateLoad(): Promise<{ windowState: WindowState | null; settings: Settings }>
  windowStateSave(state: WindowState): Promise<void>

  // Shared settings
  settingsSave(settings: Settings): Promise<void>
  onSettingsChanged(cb: (settings: Settings) => void): () => void

  // Window identity
  getWindowId(): string

  // App
  setBadge(count: number): Promise<void>
  setAppZoom(level: number): void
  getAppZoom(): number
  getDefaultShell(): Promise<string>
  historyRead(): Promise<string[]>
  openExternalUrl(url: string): Promise<void>
  openFileInEditor(filePath: string, cwd: string, line?: number, column?: number): Promise<void>
  showOpenDialog(options: { properties?: string[]; title?: string; defaultPath?: string }): Promise<{ canceled: boolean; filePaths: string[] }>
  openInNewWindow(): Promise<void>
  resetAllData(): Promise<void>

  // Cross-window terminal search
  searchOtherWindows(query: string, maxPerTerminal?: number): Promise<RemoteFindMatch[]>
  focusTerminalResult(windowId: string, terminalId: string, lineIndex: number, matchStart: number, matchLength: number): Promise<void>
  onActivateAndScroll(cb: (terminalId: string, lineIndex: number, matchStart: number, matchLength: number) => void): () => void

  // External plugins
  externalPluginsScan(): Promise<ExternalPluginPayload[]>
  externalPluginRemove(pluginId: string): Promise<boolean>
  externalPluginImport(): Promise<{ ok: boolean; error?: string }>
  externalPluginsOpenDir(): Promise<void>
}

type TermAPI = CoreTermAPI & PluginTermAPI

declare global {
  interface Window {
    termAPI: TermAPI
  }
}

declare const __APP_VERSION__: string
export {}
