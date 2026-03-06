import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { FONT_MONO, TYPE, btnGhost, emptyState, LIST_SEPARATOR, panelTitleStyle } from '../../../renderer/designTokens'
import type { ClaudeHistoryEntry } from '../shared/types'
import type { ClaudeHistoryPluginSettings } from '../../../shared/types'

export function ClaudeHistoryPanel() {
  const activeTerminalId = useAppStore(s => s.activeTerminalId)
  const focusedPaneId = useAppStore(s => s.focusedPaneId)
  const splitLayouts = useAppStore(s => s.splitLayouts)
  const terminals = useAppStore(s => s.terminals)
  // In split mode, use the focused pane's context
  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const effectiveId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const cwd = terminals.find(t => t.id === effectiveId)?.cwd ?? ''
  const [entries, setEntries] = useState<ClaudeHistoryEntry[]>([])
  const [claudeRunning, setClaudeRunning] = useState(false)
  const chSettings = useAppStore(s => s.settings.pluginSettings.claudeHistory) as ClaudeHistoryPluginSettings
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const negativeCountRef = useRef(0)
  const GRACE_POLLS = 3

  // Poll for claude running
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!effectiveId) {
        negativeCountRef.current = GRACE_POLLS
        setClaudeRunning(false)
        return
      }
      try {
        const name = await window.termAPI.ptyForegroundProcess(effectiveId)
        const detected = name != null && /claude/i.test(name)
        if (cancelled) return
        if (detected) {
          negativeCountRef.current = 0
          setClaudeRunning(true)
        } else {
          negativeCountRef.current++
          if (negativeCountRef.current >= GRACE_POLLS) {
            setClaudeRunning(false)
          }
        }
      } catch {
        if (cancelled) return
        negativeCountRef.current++
        if (negativeCountRef.current >= GRACE_POLLS) {
          setClaudeRunning(false)
        }
      }
    }
    check()
    pollRef.current = setInterval(check, chSettings.pollIntervalMs)
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [effectiveId, chSettings.pollIntervalMs])

  // Load history
  const load = useCallback(async () => {
    const all = await window.termAPI.claudeHistory()
    const forCwd = all.filter(e => e.project === cwd)
    if (forCwd.length === 0) { setEntries([]); return }

    const latestTimestamp = Math.max(...forCwd.map(e => e.timestamp))
    const latestEntry = forCwd.find(e => e.timestamp === latestTimestamp)!
    const currentSessionId = latestEntry.sessionId

    const sessionEntries = forCwd
      .filter(e => e.sessionId === currentSessionId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, chSettings.maxEntries)

    setEntries(sessionEntries)
  }, [cwd, chSettings.maxEntries])

  const isActive = useAppStore(s => s.activeRightPlugin === 'claudeHistory')

  useEffect(() => { load() }, [load])

  // Refetch when panel becomes the active plugin
  useEffect(() => {
    if (isActive) load()
  }, [isActive])

  useEffect(() => {
    return window.termAPI.onClaudeHistoryUpdate(load)
  }, [load])

  const showHistory = claudeRunning && entries.length > 0

  return (
    <div
      data-testid="plugin-panel-claudeHistory"
      style={{
        flex: 1,
        minHeight: 0,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: FONT_MONO,
        fontSize: TYPE.body,
        color: 'var(--text-secondary)',
      }}
    >
      <div style={panelTitleStyle}>Claude History</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* History section — only when Claude is running */}
        {showHistory && (
          <div>
            {entries.map((e, i) => {
              const isActive = claudeRunning && i === 0
              return (
                <div
                  key={i}
                  style={{
                    padding: '6px 12px',
                    borderBottom: LIST_SEPARATOR,
                    color: isActive ? 'var(--text-muted)' : 'var(--text-faintest)',
                    wordBreak: 'break-word',
                    textDecoration: isActive ? 'none' : 'line-through',
                  }}
                >
                  {e.display}
                </div>
              )
            })}
          </div>
        )}

        {!showHistory && (
          <div style={emptyState}>
            History appears when Claude Code is running.
          </div>
        )}
      </div>

      {showHistory && entries.length > 0 && (
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border-subtle)',
          padding: '4px 12px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => { if (cwd) window.termAPI.claudeHistoryClear(cwd) }}
            title="Clear prompt history"
            style={{
              ...btnGhost,
              fontFamily: FONT_MONO,
              padding: '2px 4px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faintest)' }}
          >Clear</button>
        </div>
      )}
    </div>
  )
}
