import type { PluginPreloadFactory } from '../../plugin-preload'
import { CLAUDE_IPC } from '../shared/channels'
import type { ClaudeHistoryEntry } from '../shared/types'

export const claudeHistoryPreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  onClaudePrompt: (cb: (text: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, text: string) => cb(text)
    ipcRenderer.on(CLAUDE_IPC.CLAUDE_PROMPT, handler)
    return () => ipcRenderer.removeListener(CLAUDE_IPC.CLAUDE_PROMPT, handler)
  },

  claudeHistory: (): Promise<ClaudeHistoryEntry[]> =>
    ipcRenderer.invoke(CLAUDE_IPC.CLAUDE_HISTORY),

  claudeHistoryClear: (cwd: string): Promise<void> =>
    ipcRenderer.invoke(CLAUDE_IPC.CLAUDE_HISTORY_CLEAR, cwd),

  onClaudeHistoryUpdate: (cb: () => void): (() => void) => {
    const handler = () => cb()
    ipcRenderer.on(CLAUDE_IPC.CLAUDE_HISTORY_UPDATE, handler)
    return () => ipcRenderer.removeListener(CLAUDE_IPC.CLAUDE_HISTORY_UPDATE, handler)
  },
})
