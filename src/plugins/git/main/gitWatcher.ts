import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import type { BrowserWindow } from 'electron'
import { GIT_IPC } from '../shared/channels'
import { broadcast } from '../../plugin-main'

const execFileAsync = promisify(execFile)

interface GitWatchEntry {
  watcher: fs.FSWatcher
  terminals: Set<string>
}

const gitWatchers = new Map<string, GitWatchEntry>()   // gitRoot -> entry
const termToGitRoot = new Map<string, string>()        // terminalId -> gitRoot
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

type GitInfo = { branch: string; dirty: boolean; ahead: number; files: string[]; isWorktree: boolean }

export async function queryGitInfo(cwd: string): Promise<GitInfo | null> {
  const opts = { cwd, timeout: 3000 }
  const [branchResult, statusResult, aheadResult, gitDirResult] = await Promise.allSettled([
    execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts),
    execFileAsync('git', ['status', '--porcelain'], opts),
    execFileAsync('git', ['rev-list', '@{u}..HEAD', '--count'], opts),
    execFileAsync('git', ['rev-parse', '--git-dir'], opts),
  ])
  if (branchResult.status === 'rejected') return null
  const branch = branchResult.value.stdout.trim()
  if (!branch) return null
  const files = statusResult.status === 'fulfilled'
    ? statusResult.value.stdout.trim().split('\n').filter(Boolean)
    : []
  const dirty = files.length > 0
  const ahead = aheadResult.status === 'fulfilled'
    ? parseInt(aheadResult.value.stdout.trim(), 10) || 0
    : 0
  const gitDir = gitDirResult.status === 'fulfilled' ? gitDirResult.value.stdout.trim() : ''
  const isWorktree = gitDir.includes('/.git/worktrees/')
  return { branch, dirty, ahead, files, isWorktree }
}

export function unwatchTerminal(id: string) {
  const gitRoot = termToGitRoot.get(id)
  if (!gitRoot) return
  termToGitRoot.delete(id)
  const entry = gitWatchers.get(gitRoot)
  if (!entry) return
  entry.terminals.delete(id)
  if (entry.terminals.size === 0) {
    entry.watcher.close()
    gitWatchers.delete(gitRoot)
    const t = debounceTimers.get(gitRoot)
    if (t) { clearTimeout(t); debounceTimers.delete(gitRoot) }
  }
}

export function watchTerminal(id: string, gitRoot: string, getWindows: () => Set<BrowserWindow>) {
  const existing = gitWatchers.get(gitRoot)
  if (existing) {
    existing.terminals.add(id)
    termToGitRoot.set(id, gitRoot)
    return
  }
  try {
    const terminals = new Set<string>([id])
    const watcher = fs.watch(`${gitRoot}/.git`, { recursive: true }, () => {
      const prev = debounceTimers.get(gitRoot)
      if (prev) clearTimeout(prev)
      debounceTimers.set(gitRoot, setTimeout(async () => {
        debounceTimers.delete(gitRoot)
        const entry = gitWatchers.get(gitRoot)
        if (!entry) return
        const info = await queryGitInfo(gitRoot)
        for (const tid of entry.terminals) {
          broadcast(getWindows, GIT_IPC.GIT_UPDATE, { id: tid, info })
        }
      }, 300))
    })
    watcher.on('error', () => {
      gitWatchers.delete(gitRoot)
      for (const tid of terminals) termToGitRoot.delete(tid)
    })
    gitWatchers.set(gitRoot, { watcher, terminals })
    termToGitRoot.set(id, gitRoot)
  } catch { /* can't watch, live without it */ }
}

export function cleanupGitWatchers() {
  for (const { watcher } of gitWatchers.values()) watcher.close()
  gitWatchers.clear()
  termToGitRoot.clear()
  for (const t of debounceTimers.values()) clearTimeout(t)
  debounceTimers.clear()
}
