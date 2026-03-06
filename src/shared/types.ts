export interface Folder {
  id: string
  name: string
  order: number
  parentId?: string
  icon?: string
  worktreePath?: string
  // Default settings for new terminals created in this folder
  defaultCwd?: string
  defaultTerminalIcon?: string
  defaultTerminalTheme?: string
  defaultFontSize?: number
}

export interface TerminalSession {
  id: string
  folderId?: string
  title: string
  cwd: string
  order: number
  scrollback: string
  fontSize?: number
  icon?: string
  terminalTheme?: string
  /** Snapshot of resolvedTheme at creation time; prevents global theme changes from cascading */
  themeResolvedAs?: 'light' | 'dark'
  /** Transient: command to execute after PTY creation (not meaningful after first run) */
  initialCommand?: string
}

export interface PaletteAction {
  id: string
  label: string
  group: string
  shortcut?: string
  execute: () => void
}

export interface TrashedItem {
  id: string                    // unique trash entry id (UUID)
  trashedAt: number             // Date.now() timestamp for 30-day expiry
  type: 'folder' | 'terminal'
  originalFolderId?: string     // parent folder the item lived in (for restore)
  originalOrder: number         // position in original list
  folder?: Folder               // set when type === 'folder'
  terminals: TerminalSession[]  // the terminal(s) captured
  childFolders: Folder[]        // descendant folders (only for type === 'folder')
}

export interface SplitLayout {
  leftId: string
  rightId: string
  ratio: number
}

export interface CustomCommand {
  id: string       // crypto.randomUUID()
  label: string    // "Deploy Staging"
  command: string  // "npm run deploy:staging"
}

export interface GitPluginSettings {
  maxCommits: number
  maxLanes: number
  panelMaxHeight: number
}

export interface ClaudeHistoryPluginSettings {
  maxEntries: number
  pollIntervalMs: number
}

export interface WorktreePluginSettings {
  defaultBasePath: string
  panelMaxHeight: number
  allowTasks: boolean
  sortCompletedToBottom: boolean
  hideCompleted: boolean
}

export interface ButtonsPluginSettings {
  panelMaxHeight: number
}

export interface PluginSettingsMap {
  git: GitPluginSettings
  claudeHistory: ClaudeHistoryPluginSettings
  worktree: WorktreePluginSettings
  buttons: ButtonsPluginSettings
  [key: string]: Record<string, unknown>
}

import type { CommandId, Keybinding } from './keybindings'

export interface Settings {
  shell: string       // '' means use system default ($SHELL)
  defaultDirectory: string  // '' means use home dir
  fontFamily: string  // full CSS font-family stack
  scrollback: number  // default 5000
  keybindings: Partial<Record<CommandId, Keybinding>>
  pluginKeybindings: Record<string, Keybinding>  // action id → binding
  theme: 'light' | 'dark' | 'system'
  terminalTheme: string  // theme id, default 'auto'
  customCommands: CustomCommand[]
  pluginSettings: PluginSettingsMap
  restoreWindows: boolean
  onboardingComplete: boolean
}

export interface SyncPayload {
  folders: Folder[]
  terminals: TerminalSession[]
  favoriteIds: string[]
  trashedItems: TrashedItem[]
}

export interface AppState {
  folders: Folder[]
  terminals: TerminalSession[]
  activeTerminalId: string | null
  sidebarOpen: boolean
  rightSidebarOpen: boolean
  activeRightPlugin?: string | null
  splitLayouts: SplitLayout[]
  focusedPaneId: string | null
  fontSize: number
  appZoom: number
  panelCollapsed: Record<string, boolean>
  pluginIconOverrides: Record<string, string>
  sidebarWidth: number
  rightSidebarWidth: number
  settings: Settings
  favoriteIds: string[]
  installedPlugins: string[]
  commandHistory: string[]
  trashedItems: TrashedItem[]
  lastActiveTerminalByFolder?: Record<string, string>
  [key: string]: unknown
}

export interface WindowState {
  windowId: string
  folders: Folder[]
  terminals: TerminalSession[]
  activeTerminalId: string | null
  sidebarOpen: boolean
  rightSidebarOpen: boolean
  activeRightPlugin?: string | null
  splitLayouts: SplitLayout[]
  focusedPaneId: string | null
  fontSize: number
  appZoom: number
  panelCollapsed: Record<string, boolean>
  pluginIconOverrides: Record<string, string>
  sidebarWidth: number
  rightSidebarWidth: number
  favoriteIds: string[]
  installedPlugins: string[]
  commandHistory: string[]
  trashedItems: TrashedItem[]
  lastActiveTerminalByFolder?: Record<string, string>
  bounds?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}

export interface PersistedState {
  version: 2
  settings: Settings
  windows: WindowState[]
}
