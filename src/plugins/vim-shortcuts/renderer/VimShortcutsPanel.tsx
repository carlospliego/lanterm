import React, { useState, useMemo } from 'react'
import { FONT_MONO, TYPE, SPACE, RADIUS, inputBase, emptyState, panelTitleStyle } from '../../../renderer/designTokens'

interface Shortcut {
  keys: string
  desc: string
}

interface Category {
  name: string
  shortcuts: Shortcut[]
}

const VIM_CATEGORIES: Category[] = [
  {
    name: 'Modes',
    shortcuts: [
      { keys: 'i', desc: 'Insert before cursor' },
      { keys: 'I', desc: 'Insert at line start' },
      { keys: 'a', desc: 'Insert after cursor' },
      { keys: 'A', desc: 'Insert at line end' },
      { keys: 'o', desc: 'Open line below' },
      { keys: 'O', desc: 'Open line above' },
      { keys: 'v', desc: 'Visual mode' },
      { keys: 'V', desc: 'Visual line mode' },
      { keys: 'Ctrl+v', desc: 'Visual block mode' },
      { keys: 'R', desc: 'Replace mode' },
      { keys: 'Esc', desc: 'Return to normal mode' },
    ],
  },
  {
    name: 'Movement',
    shortcuts: [
      { keys: 'h j k l', desc: 'Left / Down / Up / Right' },
      { keys: 'w', desc: 'Next word start' },
      { keys: 'W', desc: 'Next WORD start' },
      { keys: 'b', desc: 'Previous word start' },
      { keys: 'B', desc: 'Previous WORD start' },
      { keys: 'e', desc: 'Next word end' },
      { keys: 'E', desc: 'Next WORD end' },
      { keys: '0', desc: 'Line start' },
      { keys: '^', desc: 'First non-blank' },
      { keys: '$', desc: 'Line end' },
      { keys: 'gg', desc: 'File start' },
      { keys: 'G', desc: 'File end' },
      { keys: '{', desc: 'Previous paragraph' },
      { keys: '}', desc: 'Next paragraph' },
      { keys: 'Ctrl+u', desc: 'Half page up' },
      { keys: 'Ctrl+d', desc: 'Half page down' },
      { keys: 'Ctrl+b', desc: 'Page up' },
      { keys: 'Ctrl+f', desc: 'Page down' },
      { keys: 'H', desc: 'Screen top' },
      { keys: 'M', desc: 'Screen middle' },
      { keys: 'L', desc: 'Screen bottom' },
      { keys: '%', desc: 'Matching bracket' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: 'x', desc: 'Delete character' },
      { keys: 'dd', desc: 'Delete line' },
      { keys: 'D', desc: 'Delete to end of line' },
      { keys: 'cc', desc: 'Change line' },
      { keys: 'C', desc: 'Change to end of line' },
      { keys: 'yy', desc: 'Yank (copy) line' },
      { keys: 'Y', desc: 'Yank to end of line' },
      { keys: 'p', desc: 'Paste after' },
      { keys: 'P', desc: 'Paste before' },
      { keys: 'u', desc: 'Undo' },
      { keys: 'Ctrl+r', desc: 'Redo' },
      { keys: '.', desc: 'Repeat last change' },
      { keys: 'J', desc: 'Join lines' },
      { keys: '~', desc: 'Toggle case' },
      { keys: '>', desc: 'Indent' },
      { keys: '<', desc: 'Unindent' },
      { keys: '=', desc: 'Auto-indent' },
    ],
  },
  {
    name: 'Search & Replace',
    shortcuts: [
      { keys: '/', desc: 'Search forward' },
      { keys: '?', desc: 'Search backward' },
      { keys: 'n', desc: 'Next match' },
      { keys: 'N', desc: 'Previous match' },
      { keys: '*', desc: 'Search word under cursor' },
      { keys: '#', desc: 'Search word backward' },
      { keys: ':s/old/new/', desc: 'Replace first on line' },
      { keys: ':s/old/new/g', desc: 'Replace all on line' },
      { keys: ':%s/old/new/g', desc: 'Replace all in file' },
      { keys: ':%s/old/new/gc', desc: 'Replace all with confirm' },
    ],
  },
  {
    name: 'File Operations',
    shortcuts: [
      { keys: ':w', desc: 'Save' },
      { keys: ':q', desc: 'Quit' },
      { keys: ':wq', desc: 'Save and quit' },
      { keys: ':q!', desc: 'Quit without saving' },
      { keys: ':e file', desc: 'Open file' },
      { keys: ':r file', desc: 'Insert file contents' },
      { keys: ':bn', desc: 'Next buffer' },
      { keys: ':bp', desc: 'Previous buffer' },
      { keys: ':bd', desc: 'Close buffer' },
      { keys: ':ls', desc: 'List buffers' },
    ],
  },
  {
    name: 'Windows & Tabs',
    shortcuts: [
      { keys: ':sp', desc: 'Horizontal split' },
      { keys: ':vsp', desc: 'Vertical split' },
      { keys: 'Ctrl+w h', desc: 'Move to left window' },
      { keys: 'Ctrl+w j', desc: 'Move to window below' },
      { keys: 'Ctrl+w k', desc: 'Move to window above' },
      { keys: 'Ctrl+w l', desc: 'Move to right window' },
      { keys: 'Ctrl+w =', desc: 'Equal window size' },
      { keys: 'Ctrl+w _', desc: 'Maximize height' },
      { keys: 'Ctrl+w |', desc: 'Maximize width' },
      { keys: ':tabnew', desc: 'New tab' },
      { keys: 'gt', desc: 'Next tab' },
      { keys: 'gT', desc: 'Previous tab' },
    ],
  },
  {
    name: 'Text Objects',
    shortcuts: [
      { keys: 'iw', desc: 'Inner word' },
      { keys: 'aw', desc: 'A word (with space)' },
      { keys: 'is', desc: 'Inner sentence' },
      { keys: 'as', desc: 'A sentence' },
      { keys: 'ip', desc: 'Inner paragraph' },
      { keys: 'ap', desc: 'A paragraph' },
      { keys: 'i"', desc: 'Inner double quotes' },
      { keys: 'a"', desc: 'A double quotes' },
      { keys: "i'", desc: 'Inner single quotes' },
      { keys: 'i(', desc: 'Inner parentheses' },
      { keys: 'i{', desc: 'Inner braces' },
      { keys: 'i[', desc: 'Inner brackets' },
      { keys: 'it', desc: 'Inner tag' },
    ],
  },
  {
    name: 'Marks & Jumps',
    shortcuts: [
      { keys: 'ma', desc: 'Set mark a' },
      { keys: "'a", desc: 'Jump to mark a (line)' },
      { keys: '`a', desc: 'Jump to mark a (exact)' },
      { keys: "''", desc: 'Jump to last position' },
      { keys: 'Ctrl+o', desc: 'Jump back' },
      { keys: 'Ctrl+i', desc: 'Jump forward' },
      { keys: ':marks', desc: 'List marks' },
      { keys: 'gd', desc: 'Go to local definition' },
      { keys: 'gD', desc: 'Go to global definition' },
      { keys: 'gf', desc: 'Go to file under cursor' },
    ],
  },
]

const keyCapStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  fontSize: TYPE.xs,
  fontFamily: FONT_MONO,
  lineHeight: '16px',
  color: 'var(--text-primary)',
  background: 'var(--elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: RADIUS.sm,
  boxShadow: '0 1px 0 var(--border-subtle)',
  whiteSpace: 'nowrap' as const,
}

function renderKeys(keys: string): React.ReactNode {
  // Split compound keys like "Ctrl+w h" into parts separated by spaces
  const parts = keys.split(' ')
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {i > 0 && <span style={{ color: 'var(--text-faintest)', margin: '0 2px' }}>{' '}</span>}
      <span style={keyCapStyle}>{part}</span>
    </React.Fragment>
  ))
}

export function VimShortcutsPanel() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return VIM_CATEGORIES
    const q = search.toLowerCase()
    return VIM_CATEGORIES.map(cat => ({
      ...cat,
      shortcuts: cat.shortcuts.filter(
        s => s.keys.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.shortcuts.length > 0)
  }, [search])

  return (
    <div data-testid="plugin-panel-vimShortcuts" style={{
      flex: 1,
      minHeight: 0,
      fontFamily: FONT_MONO,
      fontSize: TYPE.body,
      color: 'var(--text-secondary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={panelTitleStyle}>Vim Shortcuts</div>
      <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.xs}px`, flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Filter shortcuts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            ...inputBase,
            fontSize: TYPE.sm,
          }}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={emptyState}>
            No matches
          </div>
        )}
        {filtered.map(cat => (
          <div key={cat.name}>
            <div
              style={{
                padding: `${SPACE.xs}px ${SPACE.lg}px`,
                fontSize: TYPE.sm,
                fontWeight: 600,
                color: 'var(--text-muted)',
                userSelect: 'none',
              }}
            >
              {cat.name}
            </div>
            <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.xs}px` }}>
              {cat.shortcuts.map(s => (
                <div
                  key={s.keys}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: SPACE.md,
                    padding: `2px 0`,
                    fontSize: TYPE.sm,
                  }}
                >
                  <span style={{ flexShrink: 0, minWidth: 70, textAlign: 'right' }}>
                    {renderKeys(s.keys)}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
