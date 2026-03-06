import { useSyncExternalStore } from 'react'

export type WorktreeInfo = { worktreePath: string; branch: string }

// External store tracking which terminal IDs are in a git worktree, with path+branch info
const worktreeMap = new Map<string, WorktreeInfo>()
const listeners = new Set<() => void>()
let snapshot = new Map<string, WorktreeInfo>()

function notify() {
  snapshot = new Map(worktreeMap)
  for (const l of listeners) l()
}

export function setWorktreeStatus(terminalId: string, isWorktree: boolean, worktreePath?: string, branch?: string) {
  if (isWorktree && worktreePath && branch) {
    const prev = worktreeMap.get(terminalId)
    if (!prev || prev.worktreePath !== worktreePath || prev.branch !== branch) {
      worktreeMap.set(terminalId, { worktreePath, branch })
      notify()
    }
  } else if (!isWorktree && worktreeMap.has(terminalId)) {
    worktreeMap.delete(terminalId)
    notify()
  }
}

export function clearWorktreeStatus(terminalId: string) {
  if (worktreeMap.delete(terminalId)) notify()
}

export function clearWorktreeByPath(worktreePath: string) {
  let changed = false
  for (const [id, info] of worktreeMap) {
    if (info.worktreePath === worktreePath) {
      worktreeMap.delete(id)
      changed = true
    }
  }
  if (changed) notify()
}

export function useWorktreeTerminals(): Map<string, WorktreeInfo> {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb) },
    () => snapshot,
  )
}
