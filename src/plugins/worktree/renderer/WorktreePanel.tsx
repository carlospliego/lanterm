import React, { useEffect, useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { FONT_MONO, TYPE, RADIUS, SPACE, btnGhost, btnOutline, panelHeaderAction, emptyState, badge, panelTitleStyle } from '../../../renderer/designTokens'
import { setWorktreeStatus, clearWorktreeByPath } from '../../../renderer/worktreeTracker'
import { showInput } from '../../../renderer/components/InputDialog'
import { showConfirm } from '../../../renderer/components/ConfirmDialog'
import { showToast } from '../../../renderer/components/Toast'
import { TasksPanel } from './TasksPanel'
import { useTasksStore } from './useTasksStore'
import type { WorktreeInfo, WorktreePrInfo, MultiRepoWorktreeResult, RepoWorktreeGroup } from '../shared/types'
import type { WorktreePluginSettings } from '../../../shared/types'
import { useWorktreeAvailability } from './useWorktreeAvailability'

const actionBtn: React.CSSProperties = {
  ...btnOutline,
  fontSize: TYPE.body,
  padding: '4px 10px',
  whiteSpace: 'nowrap',
}

const statusColors: Record<string, string> = {
  M: 'var(--warning)',
  A: 'var(--success)',
  D: 'var(--destructive)',
  R: 'var(--accent)',
  '?': 'var(--text-faintest)',
}

function parseStatusChar(line: string): { status: string; file: string } {
  const trimmed = line.trimStart()
  const status = trimmed.charAt(0) === '?' ? '?' : trimmed.charAt(0)
  const file = trimmed.slice(trimmed.indexOf(' ', 1) + 1).trim()
  return { status, file }
}

function WorktreeActions({ wt, hasPr }: { wt: WorktreeInfo; hasPr: boolean }) {
  const [changedFiles, setChangedFiles] = useState<string[]>([])
  const [ahead, setAhead] = useState(0)
  const [filesExpanded, setFilesExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const refreshFiles = useCallback(async () => {
    try {
      const res = await window.termAPI.gitStatus(wt.path)
      if (mountedRef.current && res.ok && res.files) setChangedFiles(res.files)
      else if (mountedRef.current) setChangedFiles([])
    } catch {
      if (mountedRef.current) setChangedFiles([])
    }
    try {
      const branchRes = await window.termAPI.gitBranch('_wt_actions', wt.path)
      if (mountedRef.current) setAhead(branchRes?.ahead ?? 0)
    } catch {
      if (mountedRef.current) setAhead(0)
    }
  }, [wt.path])

  useEffect(() => { refreshFiles() }, [refreshFiles])

  useEffect(() => {
    const unsub = window.termAPI.onGitUpdate(() => { refreshFiles() })
    return unsub
  }, [refreshFiles])

  useEffect(() => {
    const handler = () => { refreshFiles() }
    window.addEventListener('worktree-refresh', handler)
    return () => window.removeEventListener('worktree-refresh', handler)
  }, [refreshFiles])

  const handleCommit = async (andPush: boolean) => {
    const message = await showInput('Commit', 'Commit message\u2026')
    if (!message) return
    setBusy(true)
    try {
      const addRes = await window.termAPI.gitAddAll(wt.path)
      if (!addRes.ok) { showToast(addRes.error ?? 'Failed to stage files', 'error'); return }
      const commitRes = await window.termAPI.gitCommit(wt.path, message)
      if (!commitRes.ok) { showToast(commitRes.error ?? 'Commit failed', 'error'); return }
      if (andPush) {
        const pushRes = await window.termAPI.gitPush(wt.path)
        if (!pushRes.ok) { showToast(pushRes.error ?? 'Push failed', 'error'); return }
        showToast('Committed & pushed')
      } else {
        showToast('Committed')
      }
      refreshFiles()
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  const handlePush = async () => {
    setBusy(true)
    try {
      const res = await window.termAPI.gitPush(wt.path)
      if (res.ok) {
        showToast('Pushed')
        refreshFiles()
      } else {
        showToast(res.error ?? 'Push failed', 'error')
      }
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  const handleCreatePR = async () => {
    setBusy(true)
    try {
      const res = await window.termAPI.worktreeRemoteUrl(wt.path)
      if (!res.ok || !res.url) {
        showToast(res.error ?? 'No remote URL found', 'error')
        return
      }
      const branch = encodeURIComponent(wt.branchShort)
      const prUrl = `${res.url}/compare/main...${branch}?expand=1`
      await window.termAPI.openExternalUrl(prUrl)
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  const handleMergeMain = async () => {
    setBusy(true)
    try {
      const res = await window.termAPI.worktreeMergeBase(wt.path)
      if (res.ok) {
        showToast('Merged main')
        refreshFiles()
      } else {
        showToast(res.error ?? 'Merge failed', 'error')
      }
    } finally {
      if (mountedRef.current) setBusy(false)
    }
  }

  const parsed = changedFiles.map(parseStatusChar)
  const hasDirty = changedFiles.length > 0
  const visibleFiles = filesExpanded ? parsed : parsed.slice(0, 5)
  const hasMore = parsed.length > 5 && !filesExpanded

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        padding: `${SPACE.xs}px ${SPACE.lg}px`,
        paddingLeft: SPACE.lg + 10, // indent past the accent border
        background: 'var(--selection-bg)',
        borderLeft: '2px solid var(--accent)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      {/* Changed files */}
      {hasDirty && (
        <div style={{ marginBottom: SPACE.xs }}>
          <div style={{
            fontSize: TYPE.xs,
            color: 'var(--text-faint)',
            marginBottom: 2,
            fontWeight: 600,
          }}>
            {changedFiles.length} changed file{changedFiles.length !== 1 ? 's' : ''}
          </div>
          {visibleFiles.map(({ status, file }) => (
            <div key={file} style={{
              fontSize: TYPE.xs,
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: SPACE.xs,
              lineHeight: '18px',
              overflow: 'hidden',
            }}>
              <span style={{
                color: statusColors[status] ?? 'var(--text-faintest)',
                fontWeight: 600,
                flexShrink: 0,
                width: 10,
                textAlign: 'center',
              }}>{status}</span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{file}</span>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setFilesExpanded(true)}
              style={{
                ...btnGhost,
                fontSize: TYPE.xs,
                color: 'var(--accent)',
                padding: 0,
                marginTop: 2,
              }}
            >{parsed.length - 5} more\u2026</button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACE.sm,
      }}>
        <button
          onClick={() => handleCommit(false)}
          disabled={busy || !hasDirty}
          style={{ ...actionBtn, opacity: busy || !hasDirty ? 0.5 : 1 }}
          title="Stage all & commit"
        >Commit</button>
        <button
          onClick={() => handleCommit(true)}
          disabled={busy || !hasDirty}
          style={{ ...actionBtn, opacity: busy || !hasDirty ? 0.5 : 1 }}
          title="Stage all, commit & push"
        >Commit & Push</button>
        {ahead > 0 && (
          <button
            onClick={handlePush}
            disabled={busy}
            style={{ ...actionBtn, opacity: busy ? 0.5 : 1 }}
            title={`Push ${ahead} commit${ahead !== 1 ? 's' : ''}`}
          >Push ({ahead})</button>
        )}
        {!wt.isMain && (
          <button
            onClick={handleCreatePR}
            disabled={busy || hasPr}
            style={{ ...actionBtn, opacity: busy || hasPr ? 0.5 : 1 }}
            title={hasPr ? 'PR already exists for this branch' : 'Open GitHub compare page to create a PR'}
          >Create PR</button>
        )}
        {!wt.isMain && (
          <button
            onClick={handleMergeMain}
            disabled={busy || hasDirty}
            style={{ ...actionBtn, opacity: busy || hasDirty ? 0.5 : 1 }}
            title={hasDirty ? 'Commit or stash changes before merging' : 'Merge main into this branch'}
          >Merge Main</button>
        )}
      </div>
    </div>
  )
}

export function WorktreePanel() {
  const activeTerminalId = useAppStore(s => s.activeTerminalId)
  const focusedPaneId = useAppStore(s => s.focusedPaneId)
  const splitLayouts = useAppStore(s => s.splitLayouts)
  const terminals = useAppStore(s => s.terminals)
  const folders = useAppStore(s => s.folders)
  const addFolder = useAppStore(s => s.addFolder)
  const addTerminal = useAppStore(s => s.addTerminal)
  const setActiveTerminal = useAppStore(s => s.setActiveTerminal)
  const clearFolderWorktreePath = useAppStore(s => s.clearFolderWorktreePath)
  const settings = useAppStore(s => s.settings.pluginSettings.worktree) as WorktreePluginSettings | undefined

  const panelMaxHeight = settings?.panelMaxHeight ?? 260
  const allowTasks = settings?.allowTasks ?? true

  // In split mode, use the focused pane's context
  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const effectiveId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const cwd = useAppStore(s => s.terminals.find(t => t.id === effectiveId)?.cwd || null)

  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([])
  const [multiResult, setMultiResult] = useState<MultiRepoWorktreeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [prMap, setPrMap] = useState<Record<string, WorktreePrInfo>>({})
  const [collapsedRepos, setCollapsedRepos] = useState<Set<string> | null>(null)

  const isMultiRepo = multiResult !== null && worktrees.length === 0

  // Initialize all repos as collapsed when multiResult first arrives
  useEffect(() => {
    if (multiResult) {
      setCollapsedRepos(prev => {
        if (prev !== null) return prev
        return new Set(multiResult.repos.map(r => r.gitRoot))
      })
    } else {
      setCollapsedRepos(null)
    }
  }, [multiResult])

  // All worktrees across all repos (for multi-repo matching)
  const allWorktrees = React.useMemo(() => {
    if (!isMultiRepo || !multiResult) return worktrees
    return multiResult.repos.flatMap(r => r.worktrees)
  }, [isMultiRepo, multiResult, worktrees])

  // Determine which worktree matches the active terminal's cwd
  const currentWorktreePath = React.useMemo(() => {
    if (!cwd) return '__default'
    const match = allWorktrees.find(wt => cwd === wt.path || cwd.startsWith(wt.path + '/'))
    return match?.path ?? '__default'
  }, [cwd, allWorktrees])

  const currentWorktreeLabel = React.useMemo(() => {
    if (currentWorktreePath === '__default') return null
    return allWorktrees.find(wt => wt.path === currentWorktreePath)?.branchShort ?? null
  }, [currentWorktreePath, allWorktrees])

  // Sync the tasks store's active worktree whenever it changes
  useEffect(() => {
    useTasksStore.getState().setActiveWorktree(currentWorktreePath)
  }, [currentWorktreePath])

  const [ghWarning, setGhWarning] = useState<string | null>(null)

  const refreshPrStatusRef = useRef<() => Promise<void>>()
  refreshPrStatusRef.current = async () => {
    if (!cwd) { setPrMap({}); return }

    // In multi-repo mode, fetch PR status from each repo
    const cwds = isMultiRepo && multiResult
      ? multiResult.repos.map(r => r.gitRoot)
      : [cwd]

    const map: Record<string, WorktreePrInfo> = {}
    let warning: string | null = null

    await Promise.allSettled(cwds.map(async (dir) => {
      try {
        const res = await window.termAPI.worktreePrStatus(dir)
        if (res.ok && res.prs) {
          for (const pr of res.prs) map[pr.branch] = pr
        } else if (!warning) {
          if (res.error === 'gh-auth' && !localStorage.getItem('worktree:ghWarningDismissed')) {
            warning = 'GitHub CLI not authenticated. Run: gh auth login'
          } else if (res.error === 'gh-missing' && !localStorage.getItem('worktree:ghWarningDismissed')) {
            warning = 'GitHub CLI not found. Install with: brew install gh'
          }
        }
      } catch { /* ignore */ }
    }))

    setPrMap(map)
    if (warning) setGhWarning(warning)
    else setGhWarning(null)
  }

  const dismissGhWarning = useCallback(() => {
    localStorage.setItem('worktree:ghWarningDismissed', '1')
    setGhWarning(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!cwd) { setWorktrees([]); setMultiResult(null); useWorktreeAvailability.setState({ available: false }); return }
    setLoading(true)
    try {
      const result = await window.termAPI.worktreeList(cwd)
      if (result) {
        setWorktrees(result.worktrees)
        setMultiResult(null)
        useWorktreeAvailability.setState({ available: result.worktrees.length > 0 })
      } else {
        // Not a git repo — try scanning child directories
        setWorktrees([])
        const multi = await window.termAPI.worktreeListMulti(cwd)
        setMultiResult(multi)
        useWorktreeAvailability.setState({ available: multi !== null && multi.repos.length > 0 })
      }
    } catch {
      setWorktrees([])
      setMultiResult(null)
      useWorktreeAvailability.setState({ available: false })
    }
    setLoading(false)
    refreshPrStatusRef.current?.()
  }, [cwd])

  const isActive = useAppStore(s => s.activeRightPlugin === 'worktree')

  useEffect(() => {
    refresh()
  }, [refresh])

  // Refetch when panel becomes the active plugin
  useEffect(() => {
    if (isActive) refresh()
  }, [isActive])

  // Auto-refresh when git updates (worktree changes trigger git watcher)
  useEffect(() => {
    const unsub = window.termAPI.onGitUpdate(() => { refresh() })
    return unsub
  }, [refresh])

  // Refresh when palette actions fire
  useEffect(() => {
    const handler = () => { refresh() }
    window.addEventListener('worktree-refresh', handler)
    return () => window.removeEventListener('worktree-refresh', handler)
  }, [refresh])

  const handleCreate = async (repoCwd?: string) => {
    const createCwd = repoCwd ?? cwd
    if (!createCwd) return
    const branch = await showInput('New Worktree', 'Branch name\u2026')
    if (!branch) return
    const result = await window.termAPI.worktreeCreate({ cwd: createCwd, branch })
    if (result.ok) {
      showToast(`Worktree created: ${branch}`)
      refresh()
    } else {
      showToast(result.error ?? 'Failed to create worktree', 'error')
    }
  }

  const handleRemove = async (wt: WorktreeInfo) => {
    if (!cwd) return

    // Check for uncommitted or unpushed changes
    const warnings: string[] = []
    try {
      const statusRes = await window.termAPI.gitStatus(wt.path)
      if (statusRes.ok && statusRes.files && statusRes.files.length > 0) {
        warnings.push(`${statusRes.files.length} uncommitted change${statusRes.files.length !== 1 ? 's' : ''}`)
      }
    } catch { /* ignore */ }
    try {
      const branchRes = await window.termAPI.gitBranch('_wt_check', wt.path)
      if (branchRes && branchRes.ahead > 0) {
        warnings.push(`${branchRes.ahead} unpushed commit${branchRes.ahead !== 1 ? 's' : ''}`)
      }
    } catch { /* ignore */ }

    const hasWarnings = warnings.length > 0
    const confirmed = await showConfirm(
      'Remove Worktree',
      `Remove worktree "${wt.branchShort}" at ${wt.path}?`,
      {
        confirmLabel: 'Remove',
        destructive: true,
        detail: hasWarnings ? `This worktree has ${warnings.join(' and ')}. Commit and push before removing.` : undefined,
        disableConfirm: hasWarnings,
      },
    )
    if (!confirmed) return
    const result = await window.termAPI.worktreeRemove({ cwd, worktreePath: wt.path })
    if (result.ok) {
      showToast(`Removed worktree: ${wt.branchShort}`)
      clearWorktreeByPath(wt.path)
      clearFolderWorktreePath(wt.path)
      refresh()
    } else {
      showToast(result.error ?? 'Failed to remove worktree', 'error')
    }
  }

  const handleOpen = (wt: WorktreeInfo) => {
    // Find or create a folder for this worktree
    let folder = folders.find(f => f.worktreePath === wt.path)
    if (!folder) {
      folder = {
        id: uuidv4(),
        name: wt.branchShort,
        order: folders.filter(f => !f.parentId).length,
        icon: 'fa:fa-solid fa-code-branch',
        defaultCwd: wt.path,
        worktreePath: wt.path,
      }
      addFolder(folder)
    }

    const folderTerminals = terminals.filter(t => t.folderId === folder!.id)
    const id = uuidv4()
    addTerminal({
      id,
      folderId: folder.id,
      title: wt.isMain ? `Terminal ${folderTerminals.length + 1}` : `${wt.branchShort} ${folderTerminals.length + 1}`,
      cwd: wt.path,
      order: folderTerminals.length,
      scrollback: '',
      icon: 'fa:fa-solid fa-terminal',
    })
    if (!wt.isMain) setWorktreeStatus(id, true)
    setActiveTerminal(id)
  }

  const abbreviatePath = (p: string): string => {
    // Show just the last two path segments for brevity
    const parts = p.split('/')
    if (parts.length <= 3) return p
    return '\u2026/' + parts.slice(-2).join('/')
  }

  const renderWorktreeRow = (wt: WorktreeInfo) => {
    const isCurrent = !!cwd && (cwd === wt.path || cwd.startsWith(wt.path + '/'))
    return (
      <React.Fragment key={wt.path}>
        <div
          onMouseEnter={() => setHoveredPath(wt.path)}
          onMouseLeave={() => setHoveredPath(null)}
          style={{
            padding: `${SPACE.xs}px ${SPACE.lg}px`,
            display: 'flex',
            alignItems: 'center',
            gap: SPACE.sm,
            background: isCurrent ? 'var(--selection-bg)' : hoveredPath === wt.path ? 'var(--hover-bg)' : 'transparent',
            borderLeft: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: TYPE.body,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: SPACE.xs,
            }}>
              {wt.branchShort}
              {wt.isMain && (
                <span style={{
                  ...badge,
                  color: 'var(--accent)',
                  background: 'var(--accent-dim)',
                }}>main</span>
              )}
              {wt.isLocked && (
                <span style={{
                  ...badge,
                  color: 'var(--text-faintest)',
                  background: 'var(--elevated)',
                }}>locked</span>
              )}
              {prMap[wt.branchShort] && (
                <span
                  onClick={e => {
                    e.stopPropagation()
                    window.termAPI.openExternalUrl(prMap[wt.branchShort].url)
                  }}
                  style={{
                    ...badge,
                    color: 'var(--bg)',
                    background: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                  title={`Open PR #${prMap[wt.branchShort].number}`}
                >PR #{prMap[wt.branchShort].number}</span>
              )}
            </div>
            <div style={{
              fontSize: TYPE.xs,
              color: 'var(--text-faintest)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {abbreviatePath(wt.path)}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); handleOpen(wt) }}
            style={{
              ...btnGhost,
              fontSize: TYPE.body,
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--text-faintest)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
            title="Open terminal in this worktree"
          ><i className="fa-solid fa-terminal" style={{ fontSize: 10 }} /></button>
          {!wt.isMain && hoveredPath === wt.path && (
            <button
              onClick={e => { e.stopPropagation(); handleRemove(wt) }}
              style={{
                ...btnGhost,
                fontSize: TYPE.md,
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--destructive)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
              title="Remove worktree"
            >&times;</button>
          )}
        </div>
        {isCurrent && <WorktreeActions wt={wt} hasPr={!!prMap[wt.branchShort]} />}
      </React.Fragment>
    )
  }

  return (
    <div data-testid="plugin-panel-worktree" style={{
      flex: 1,
      minHeight: 0,
      fontFamily: FONT_MONO,
      fontSize: TYPE.body,
      color: 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={panelTitleStyle}>
        <span style={{ flex: 1 }}>Worktrees</span>
        <button
          onClick={handleCreate}
          style={panelHeaderAction}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
          title="Create worktree"
        >+</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && worktrees.length === 0 && !multiResult && (
          <div style={emptyState}>
            Loading\u2026
          </div>
        )}
        {!loading && worktrees.length === 0 && !multiResult && (
          <div style={emptyState}>
            {cwd ? 'Cant find a git repository' : 'No active terminal'}
          </div>
        )}
        {/* Single-repo mode */}
        {worktrees.map(wt => renderWorktreeRow(wt))}
        {/* Multi-repo mode */}
        {isMultiRepo && multiResult && multiResult.repos.map(repo => {
          const isCollapsed = !collapsedRepos || collapsedRepos.has(repo.gitRoot)
          return (
            <div key={repo.gitRoot}>
              <div
                onClick={() => setCollapsedRepos(prev => {
                  const base = prev ?? new Set(multiResult.repos.map(r => r.gitRoot))
                  const next = new Set(base)
                  if (next.has(repo.gitRoot)) next.delete(repo.gitRoot)
                  else next.add(repo.gitRoot)
                  return next
                })}
                style={{
                  padding: `${SPACE.xs}px ${SPACE.lg}px`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACE.sm,
                  cursor: 'pointer',
                  background: 'var(--elevated)',
                  borderBottom: '1px solid var(--border-subtle)',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: 9, color: 'var(--text-faintest)' }}>
                  {isCollapsed ? '\u25B6' : '\u25BC'}
                </span>
                <i className="fa-solid fa-folder" style={{ fontSize: 11, color: 'var(--text-faintest)' }} />
                <span style={{
                  flex: 1,
                  fontWeight: 600,
                  fontSize: TYPE.body,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{repo.repoName}</span>
                <span style={{
                  fontSize: TYPE.xs,
                  color: 'var(--text-faintest)',
                }}>{repo.worktrees.length}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleCreate(repo.gitRoot) }}
                  style={panelHeaderAction}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                  title={`Create worktree in ${repo.repoName}`}
                >+</button>
              </div>
              {!isCollapsed && repo.worktrees.map(wt => renderWorktreeRow(wt))}
            </div>
          )
        })}
      </div>
      {allowTasks && (worktrees.length > 0 || (multiResult && multiResult.repos.length > 0)) && (
        <>
          <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
          <TasksPanel worktreePath={currentWorktreePath} worktreeLabel={currentWorktreeLabel} />
        </>
      )}
      {ghWarning && (
        <div style={{
          flexShrink: 0,
          padding: `${SPACE.xs}px ${SPACE.lg}px`,
          fontSize: TYPE.xs,
          color: 'var(--destructive)',
          background: 'var(--elevated)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.sm,
        }}>
          <span style={{ flex: 1 }}>{ghWarning}</span>
          <button
            onClick={dismissGhWarning}
            style={{
              ...btnGhost,
              fontSize: TYPE.xs,
              color: 'var(--text-faintest)',
              flexShrink: 0,
              padding: '0 2px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
            title="Dismiss"
          >&times;</button>
        </div>
      )}
    </div>
  )
}
