import type { PluginPreloadFactory } from '../../plugin-preload'
import { FILE_BROWSER_IPC } from '../shared/channels'
import type { FileEntry } from '../shared/types'

export const fileBrowserPreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  fileList: (dir: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke(FILE_BROWSER_IPC.FILE_LIST, dir),

  fileRead: (path: string): Promise<string | null> =>
    ipcRenderer.invoke(FILE_BROWSER_IPC.FILE_READ, path),
})
