import type { BrowserWindow } from 'electron'

export interface PluginMainModule {
  register(getWindows: () => Set<BrowserWindow>): void
  onWindowReady?(getWindows: () => Set<BrowserWindow>): void
  cleanup(): void
}

export function broadcast(getWindows: () => Set<BrowserWindow>, channel: string, ...args: unknown[]) {
  for (const win of getWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args)
  }
}
