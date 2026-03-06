import React from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import type { ClaudeHistoryPluginSettings } from '../../../shared/types'

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 0',
}

const inputStyle: React.CSSProperties = {
  width: 60,
  background: 'var(--elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  fontSize: 12,
  padding: '2px 6px',
  textAlign: 'right',
}

export function ClaudeHistorySettings() {
  const ch = useAppStore(s => s.settings.pluginSettings.claudeHistory) as ClaudeHistoryPluginSettings
  const update = useAppStore(s => s.updatePluginSettings)

  return (
    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
      <div style={{ marginBottom: 8 }}>
        Shows recent Claude Code conversations from <code style={{ color: 'var(--text-muted)' }}>~/.claude/projects</code>. Click an entry to resume it in the active terminal.
      </div>
      <div style={labelStyle}>
        <span>Max entries</span>
        <input
          type="number"
          min={5}
          max={50}
          value={ch.maxEntries}
          onChange={e => update('claudeHistory', { maxEntries: Math.min(50, Math.max(5, Number(e.target.value) || 5)) })}
          style={inputStyle}
        />
      </div>
      <div style={labelStyle}>
        <span>Poll interval (ms)</span>
        <input
          type="number"
          min={250}
          max={5000}
          step={250}
          value={ch.pollIntervalMs}
          onChange={e => update('claudeHistory', { pollIntervalMs: Math.min(5000, Math.max(250, Number(e.target.value) || 250)) })}
          style={inputStyle}
        />
      </div>
    </div>
  )
}
