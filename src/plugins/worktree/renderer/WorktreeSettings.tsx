import React from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { resolveKeybindings, formatBinding } from '../../../shared/keybindings'
import { FONT_MONO } from '../../../renderer/designTokens'
import type { WorktreePluginSettings } from '../../../shared/types'

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

export function WorktreeSettings() {
  const wt = useAppStore(s => s.settings.pluginSettings.worktree) as WorktreePluginSettings | undefined
  const update = useAppStore(s => s.updatePluginSettings)
  const keybindings = useAppStore(s => s.settings.keybindings)
  const openSettings = useAppStore(s => s.openSettings)
  const closePluginGallery = useAppStore(s => s.closePluginGallery)

  const panelMaxHeight = wt?.panelMaxHeight ?? 260
  const allowTasks = wt?.allowTasks ?? true

  const resolved = resolveKeybindings(keybindings)
  const promptBinding = resolved.togglePrompt

  return (
    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
      <div style={{ marginBottom: 8 }}>
        Lists git worktrees for the active terminal's repository. Click a worktree to open a terminal in that directory.
      </div>
      <div style={labelStyle}>
        <span>Panel height (px)</span>
        <input
          type="number"
          min={100} max={600} step={20}
          value={panelMaxHeight}
          onChange={e => update('worktree', { panelMaxHeight: Math.min(600, Math.max(100, Number(e.target.value) || 260)) })}
          style={inputStyle}
        />
      </div>
      <div style={labelStyle}>
        <span>Allow Tasks</span>
        <input
          type="checkbox"
          checked={allowTasks}
          onChange={e => update('worktree', { allowTasks: e.target.checked })}
          style={{ accentColor: 'var(--accent)' }}
        />
      </div>
      {allowTasks && (
        <>
          <div style={labelStyle}>
            <span>Task prompt shortcut</span>
            <button
              onClick={e => {
                e.stopPropagation()
                closePluginGallery()
                openSettings('commands', 'shortcuts')
              }}
              title="Change in Settings → Commands"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: FONT_MONO,
                fontSize: 12,
                padding: '2px 8px',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {formatBinding(promptBinding)}
            </button>
          </div>
          <div style={labelStyle}>
            <span>Sort completed to bottom</span>
            <input
              type="checkbox"
              checked={wt?.sortCompletedToBottom ?? false}
              onChange={e => update('worktree', { sortCompletedToBottom: e.target.checked })}
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
          <div style={labelStyle}>
            <span>Hide completed</span>
            <input
              type="checkbox"
              checked={wt?.hideCompleted ?? false}
              onChange={e => update('worktree', { hideCompleted: e.target.checked })}
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
        </>
      )}
    </div>
  )
}
