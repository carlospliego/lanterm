import type { PluginPreloadFactory } from '../../plugin-preload'
import { BUTTONS_IPC } from '../shared/channels'

export const buttonsPreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  buttonsRun: (args: { buttonId: string; command: string; cwd: string }): Promise<{ pid: number }> =>
    ipcRenderer.invoke(BUTTONS_IPC.RUN, args),

  buttonsKill: (buttonId: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke(BUTTONS_IPC.KILL, buttonId),

  onButtonsOutput: (cb: (buttonId: string, data: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, buttonId: string, data: string) =>
      cb(buttonId, data)
    ipcRenderer.on(BUTTONS_IPC.OUTPUT, handler)
    return () => ipcRenderer.removeListener(BUTTONS_IPC.OUTPUT, handler)
  },

  onButtonsExit: (cb: (buttonId: string, exitCode: number, durationMs: number) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, buttonId: string, exitCode: number, durationMs: number) =>
      cb(buttonId, exitCode, durationMs)
    ipcRenderer.on(BUTTONS_IPC.EXIT, handler)
    return () => ipcRenderer.removeListener(BUTTONS_IPC.EXIT, handler)
  },
})
