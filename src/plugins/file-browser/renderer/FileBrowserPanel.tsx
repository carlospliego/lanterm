import React, { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { FONT_MONO, TYPE, RADIUS, SPACE, btnGhost, btnOutline, emptyState, panelTitleStyle, panelHeaderAction } from '../../../renderer/designTokens'
import type { FileEntry } from '../shared/types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DirNodeProps {
  entry: FileEntry
  depth: number
  onFileClick: (entry: FileEntry) => void
  onCdClick: (path: string) => void
}

function DirNode({ entry, depth, onFileClick, onCdClick }: DirNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)

  const toggle = useCallback(async () => {
    if (!entry.isDirectory) {
      onFileClick(entry)
      return
    }
    if (!expanded && children.length === 0) {
      setLoading(true)
      try {
        const result = await window.termAPI.fileList(entry.path)
        setChildren(result)
      } catch {
        setChildren([])
      }
      setLoading(false)
    }
    setExpanded(prev => !prev)
  }, [entry, expanded, children.length, onFileClick])

  const handleCd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCdClick(entry.path)
  }, [entry.path, onCdClick])

  return (
    <div>
      <div
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.xs,
          padding: `${SPACE.xxs}px ${SPACE.md}px`,
          paddingLeft: SPACE.md + depth * 14,
          cursor: 'pointer',
          fontSize: TYPE.body,
          fontFamily: FONT_MONO,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderRadius: RADIUS.sm,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {entry.isDirectory && (
          <span style={{ fontSize: 8, color: 'var(--text-faintest)', width: 8, flexShrink: 0, textAlign: 'center' }}>
            {loading ? '\u2026' : expanded ? '\u25BC' : '\u25B6'}
          </span>
        )}
        {!entry.isDirectory && (
          <span style={{ width: 8, flexShrink: 0 }} />
        )}
        <span style={{ flexShrink: 0 }}>
          {entry.isDirectory ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}
        </span>
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: entry.isDirectory ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}>
          {entry.name}
        </span>
        {!entry.isDirectory && (
          <span style={{ fontSize: TYPE.xs, color: 'var(--text-faintest)', flexShrink: 0 }}>
            {formatSize(entry.size)}
          </span>
        )}
        {entry.isDirectory && (
          <button
            onClick={handleCd}
            style={{
              ...btnGhost,
              fontSize: TYPE.xs,
              color: 'var(--accent)',
              flexShrink: 0,
              opacity: 0.7,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
            title={`cd ${entry.path}`}
          >
            cd
          </button>
        )}
      </div>
      {entry.isDirectory && expanded && children.map(child => (
        <DirNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          onCdClick={onCdClick}
        />
      ))}
    </div>
  )
}

export function FileBrowserPanel() {
  const activeTerminalId = useAppStore(s => s.activeTerminalId)
  const focusedPaneId = useAppStore(s => s.focusedPaneId)
  const splitLayouts = useAppStore(s => s.splitLayouts)
  const terminals = useAppStore(s => s.terminals)

  // In split mode, use the focused pane's context
  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const effectiveId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const activeTerminal = terminals.find(t => t.id === effectiveId)
  const cwd = activeTerminal?.cwd ?? ''

  const [entries, setEntries] = useState<FileEntry[]>([])
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const isActive = useAppStore(s => s.activeRightPlugin === 'fileBrowser')

  // Load file listing when cwd changes
  useEffect(() => {
    if (!cwd) return
    let cancelled = false
    window.termAPI.fileList(cwd).then(result => {
      if (!cancelled) setEntries(result)
    })
    // Clear preview when directory changes
    setPreviewPath(null)
    setPreviewContent(null)
    return () => { cancelled = true }
  }, [cwd])

  // Refetch when panel becomes the active plugin
  useEffect(() => {
    if (isActive && cwd) {
      window.termAPI.fileList(cwd).then(setEntries)
    }
  }, [isActive])

  const handleFileClick = useCallback(async (entry: FileEntry) => {
    if (entry.isDirectory) return
    setPreviewPath(entry.path)
    setLoadingPreview(true)
    try {
      const content = await window.termAPI.fileRead(entry.path)
      setPreviewContent(content)
    } catch {
      setPreviewContent(null)
    }
    setLoadingPreview(false)
  }, [])

  const handleCdClick = useCallback((path: string) => {
    if (!effectiveId) return
    window.termAPI.ptyWrite(effectiveId, `cd ${path}\n`)
  }, [effectiveId])

  const handleOpenInEditor = useCallback(() => {
    if (!previewPath || !cwd) return
    window.termAPI.openFileInEditor(previewPath, cwd)
  }, [previewPath, cwd])

  const handleClosePreview = useCallback(() => {
    setPreviewPath(null)
    setPreviewContent(null)
  }, [])

  const handleGoUp = useCallback(() => {
    if (!effectiveId || !cwd) return
    window.termAPI.ptyWrite(effectiveId, `cd ..\n`)
  }, [effectiveId, cwd])

  return (
    <div data-testid="plugin-panel-fileBrowser" style={{
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
        <span style={{ flex: 1 }}>Files</span>
        {cwd && (
          <button
            onClick={handleGoUp}
            style={panelHeaderAction}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)' }}
            title="Go up a directory"
          >
            ↑
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {!cwd && (
            <div style={emptyState}>
              No active terminal
            </div>
          )}
          {cwd && entries.length === 0 && (
            <div style={emptyState}>
              Empty directory
            </div>
          )}
          {cwd && entries.map(entry => (
            <DirNode
              key={entry.path}
              entry={entry}
              depth={0}
              onFileClick={handleFileClick}
              onCdClick={handleCdClick}
            />
          ))}
          {previewPath && (
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              marginTop: SPACE.xs,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${SPACE.sm}px ${SPACE.md}px`,
                gap: SPACE.xs,
              }}>
                <span style={{
                  fontSize: TYPE.sm,
                  color: 'var(--text-faint)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {previewPath.split('/').pop()}
                </span>
                <div style={{ display: 'flex', gap: SPACE.xs, flexShrink: 0 }}>
                  <button
                    onClick={handleOpenInEditor}
                    style={{
                      ...btnOutline,
                      color: 'var(--accent)',
                    }}
                    title="Open in editor"
                  >
                    Open in Editor
                  </button>
                  <button
                    onClick={handleClosePreview}
                    style={{
                      ...btnGhost,
                      fontSize: TYPE.sm,
                      padding: `2px ${SPACE.xs}px`,
                    }}
                    title="Close preview"
                  >
                    \u2715
                  </button>
                </div>
              </div>
              <div style={{
                padding: `${SPACE.xs}px ${SPACE.md}px ${SPACE.md}px`,
                maxHeight: 200,
                overflow: 'auto',
                fontSize: TYPE.xs,
                fontFamily: FONT_MONO,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                background: 'var(--elevated)',
                borderRadius: RADIUS.md,
                margin: `0 ${SPACE.md}px ${SPACE.md}px`,
              }}>
                {loadingPreview && 'Loading...'}
                {!loadingPreview && previewContent === null && 'Unable to read file'}
                {!loadingPreview && previewContent !== null && previewContent}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
