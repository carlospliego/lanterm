import type { IpcRenderer } from 'electron'

export type PluginPreloadFactory = (ipcRenderer: IpcRenderer) => Record<string, unknown>
