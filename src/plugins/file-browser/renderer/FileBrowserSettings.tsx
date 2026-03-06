import React from 'react'

export function FileBrowserSettings() {
  return (
    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
      Browse files and directories from the active terminal's working directory.
      Click a directory to expand it, or use the "cd" button to navigate the terminal there.
      Click a file to preview its contents.
    </div>
  )
}
