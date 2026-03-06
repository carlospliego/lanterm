import { ipcMain } from 'electron'
import { readdir, stat, readFile } from 'fs/promises'
import { join } from 'path'
import { FILE_BROWSER_IPC } from '../shared/channels'

export function registerFileBrowserHandlers() {
  ipcMain.handle(FILE_BROWSER_IPC.FILE_LIST, async (_event, dir: string) => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      const results = await Promise.all(
        entries
          .filter(e => !e.name.startsWith('.'))
          .map(async (e) => {
            const fullPath = join(dir, e.name)
            try {
              const s = await stat(fullPath)
              return {
                name: e.name,
                path: fullPath,
                isDirectory: e.isDirectory(),
                size: s.size,
                modified: s.mtimeMs,
              }
            } catch {
              return {
                name: e.name,
                path: fullPath,
                isDirectory: e.isDirectory(),
                size: 0,
                modified: 0,
              }
            }
          })
      )
      // Sort: directories first, then by name
      return results.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    } catch {
      return []
    }
  })

  ipcMain.handle(FILE_BROWSER_IPC.FILE_READ, async (_event, path: string) => {
    try {
      const content = await readFile(path, 'utf8')
      return content.slice(0, 50000) // limit preview size
    } catch {
      return null
    }
  })
}

export function unregisterFileBrowserHandlers() {
  Object.values(FILE_BROWSER_IPC).forEach(ch => ipcMain.removeHandler(ch))
}
