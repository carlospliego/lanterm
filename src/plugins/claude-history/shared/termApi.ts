import type { ClaudeHistoryEntry } from './types'

export interface ClaudeTermAPI {
  onClaudePrompt(cb: (text: string) => void): () => void
  claudeHistory(): Promise<ClaudeHistoryEntry[]>
  claudeHistoryClear(cwd: string): Promise<void>
  onClaudeHistoryUpdate(cb: () => void): () => void
}
