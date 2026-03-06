import { ipcMain, type BrowserWindow } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import fs from 'fs'
import { CLAUDE_IPC } from '../shared/channels'
import { broadcast } from '../../plugin-main'

let promptWatcher: fs.FSWatcher | null = null
let getWindows: () => Set<BrowserWindow> = () => new Set()

const claudeDir = join(homedir(), '.claude')
const lastPromptPath = join(claudeDir, 'last-prompt.txt')
const historyPath = join(claudeDir, 'history.jsonl')

function sendLastPrompt() {
  try {
    const text = fs.readFileSync(lastPromptPath, 'utf8').trim()
    if (text) broadcast(getWindows, CLAUDE_IPC.CLAUDE_PROMPT, text)
  } catch { /* file doesn't exist yet, ignore */ }
}

export function registerClaudeHandlers(getWin: () => Set<BrowserWindow>) {
  getWindows = getWin

  ipcMain.handle(CLAUDE_IPC.CLAUDE_HISTORY, () => {
    try {
      const raw = fs.readFileSync(historyPath, 'utf8')
      return raw.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line) } catch { return null }
      }).filter(Boolean)
    } catch { return [] }
  })

  ipcMain.handle(CLAUDE_IPC.CLAUDE_HISTORY_CLEAR, (_e, cwd: string) => {
    try {
      const raw = fs.readFileSync(historyPath, 'utf8')
      const kept = raw.split('\n').filter(Boolean).filter(line => {
        try { return JSON.parse(line).project !== cwd } catch { return true }
      })
      fs.writeFileSync(historyPath, kept.length ? kept.join('\n') + '\n' : '', 'utf8')
      broadcast(getWindows, CLAUDE_IPC.CLAUDE_HISTORY_UPDATE)
    } catch { /* file doesn't exist, nothing to clear */ }
  })
}

export function startClaudeWatcher(getWin: () => Set<BrowserWindow>) {
  getWindows = getWin
  sendLastPrompt()
  try {
    promptWatcher = fs.watch(claudeDir, (_, filename) => {
      if (filename === 'last-prompt.txt') sendLastPrompt()
      if (filename === 'history.jsonl') broadcast(getWindows, CLAUDE_IPC.CLAUDE_HISTORY_UPDATE)
    })
    promptWatcher.on('error', () => { promptWatcher = null })
  } catch { /* can't watch dir, live without it */ }
}

export function cleanupClaudeHandlers() {
  promptWatcher?.close()
  promptWatcher = null
  Object.values(CLAUDE_IPC).forEach(ch => {
    ipcMain.removeHandler(ch)
  })
}
