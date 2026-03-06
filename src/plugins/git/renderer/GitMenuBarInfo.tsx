import React, { useEffect, useState } from 'react'
import { setWorktreeStatus, clearWorktreeStatus } from '../../../renderer/worktreeTracker'

type GitInfo = { branch: string; dirty: boolean; ahead: number; isWorktree?: boolean; worktreePath?: string } | null

export function GitMenuBarInfo({ sessionId, cwd }: { sessionId: string; cwd: string }) {
  const [gitInfo, setGitInfo] = useState<GitInfo>(null)

  useEffect(() => {
    window.termAPI.gitBranch(sessionId, cwd).then(info => {
      setGitInfo(info)
      if (info) setWorktreeStatus(sessionId, !!info.isWorktree, info.worktreePath, info.branch)
      else clearWorktreeStatus(sessionId)
    })
    return () => { window.termAPI.gitUnwatch(sessionId); clearWorktreeStatus(sessionId) }
  }, [sessionId, cwd])

  useEffect(() => {
    return window.termAPI.onGitUpdate((id, info) => {
      if (id === sessionId) {
        setGitInfo(info)
        // Don't update worktree status here — the watcher queries gitRoot (not
        // the terminal's cwd), so isWorktree is always false for worktree terminals.
        // Worktree status is set correctly by the gitBranch call above.
      }
    })
  }, [sessionId])

  if (!gitInfo) return null

  return (
    <span style={{ color: 'var(--git-branch)', marginLeft: 10, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
      <span>⎇ {gitInfo.branch}</span>
      {gitInfo.dirty && <span style={{ color: 'var(--status-dirty)' }} title="Uncommitted changes">●</span>}
      {gitInfo.ahead > 0 && <span style={{ color: 'var(--status-ahead)' }} title={`${gitInfo.ahead} unpushed commit${gitInfo.ahead > 1 ? 's' : ''}`}>↑{gitInfo.ahead}</span>}
    </span>
  )
}
