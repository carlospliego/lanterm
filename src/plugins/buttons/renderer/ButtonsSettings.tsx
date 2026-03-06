import React from 'react'

export function ButtonsSettings() {
  return (
    <div
      style={{
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--text-dim)',
        lineHeight: 1.5,
      }}
    >
      Custom buttons that run commands as hidden background processes. Output, exit codes, and
      duration are captured and displayed inline. Right-click a button to edit or delete it.
    </div>
  )
}
