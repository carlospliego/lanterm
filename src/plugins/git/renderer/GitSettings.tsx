import React from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import type { GitPluginSettings } from '../../../shared/types'

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

export function GitSettings() {
  const git = useAppStore(s => s.settings.pluginSettings.git) as GitPluginSettings
  const update = useAppStore(s => s.updatePluginSettings)

  return (
    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
      <div style={{ marginBottom: 8 }}>
        Displays a commit graph for the repository detected in the active terminal's working directory.
      </div>
      <div style={labelStyle}>
        <span>Max commits</span>
        <input
          type="number"
          min={50}
          max={500}
          value={git.maxCommits}
          onChange={e => update('git', { maxCommits: Math.min(500, Math.max(50, Number(e.target.value) || 50)) })}
          style={inputStyle}
        />
      </div>
      <div style={labelStyle}>
        <span>Max lanes</span>
        <input
          type="number"
          min={2}
          max={8}
          value={git.maxLanes}
          onChange={e => update('git', { maxLanes: Math.min(8, Math.max(2, Number(e.target.value) || 2)) })}
          style={inputStyle}
        />
      </div>
      <div style={labelStyle}>
        <span>Panel height (px)</span>
        <input
          type="number"
          min={200}
          max={800}
          step={20}
          value={git.panelMaxHeight}
          onChange={e => update('git', { panelMaxHeight: Math.min(800, Math.max(200, Number(e.target.value) || 200)) })}
          style={inputStyle}
        />
      </div>
    </div>
  )
}
