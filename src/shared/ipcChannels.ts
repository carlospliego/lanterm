export const IPC = {
  // Renderer -> Main (invoke/handle)
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_GET_CWD: 'pty:getCwd',
  PTY_HAS_RUNNING_CHILD: 'pty:hasRunningChild',
  PTY_FOREGROUND_PROCESS: 'pty:foregroundProcess',
  PTY_SHELL_PID: 'pty:shellPid',
  WINDOW_STATE_LOAD: 'windowState:load',
  WINDOW_STATE_SAVE: 'windowState:save',
  SETTINGS_LOAD: 'settings:load',
  SETTINGS_SAVE: 'settings:save',
  SETTINGS_CHANGED: 'settings:changed',
  HISTORY_READ: 'history:read',
  APP_GET_DEFAULT_SHELL: 'app:getDefaultShell',
  OPEN_EXTERNAL_URL: 'app:openExternalUrl',
  OPEN_FILE_IN_EDITOR: 'app:openFileInEditor',
  SHOW_OPEN_DIALOG: 'app:showOpenDialog',
  OPEN_IN_NEW_WINDOW: 'app:openInNewWindow',
  RESET_ALL_DATA: 'app:resetAllData',
  TERMINAL_SEARCH_OTHER_WINDOWS: 'terminal:searchOtherWindows',
  TERMINAL_FOCUS_RESULT: 'terminal:focusResult',

  // External plugins
  EXTERNAL_PLUGINS_SCAN: 'plugins:scan',
  EXTERNAL_PLUGIN_REMOVE: 'plugins:remove',
  EXTERNAL_PLUGIN_IMPORT: 'plugins:import',
  EXTERNAL_PLUGINS_OPEN_DIR: 'plugins:openDir',

  // Main -> Renderer (send/on)
  PTY_DATA: 'pty:data',
  PTY_EXIT: 'pty:exit',

} as const

export type IpcChannels = typeof IPC

// Arg types for each channel
export interface PtyCreateArgs {
  id: string
  cwd: string
  cols: number
  rows: number
  shell?: string
}

export interface PtyWriteArgs {
  id: string
  data: string
}

export interface PtyResizeArgs {
  id: string
  cols: number
  rows: number
}

export interface PtyKillArgs {
  id: string
}

export interface PtyGetCwdArgs {
  id: string
}

export interface PtyDataEvent {
  id: string
  data: string
}

export interface PtyExitEvent {
  id: string
  code: number
}
