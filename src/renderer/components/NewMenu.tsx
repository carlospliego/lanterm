import React, { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { FONT_MONO, TYPE, RADIUS, SPACE } from '../designTokens'

interface Props {
  executeCommand: (id: string) => void
}

const ITEMS = [
  { id: 'newTerminal', label: 'Terminal', hint: '⌘T' },
  { id: 'newFolder',   label: 'Folder',   hint: '' },
  { id: 'newWindow',   label: 'New Window', hint: '⌘N' },
] as const

export function NewMenu({ executeCommand }: Props) {
  const { newMenuOpen, closeNewMenu } = useAppStore()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (newMenuOpen) setSelectedIndex(0)
  }, [newMenuOpen])

  const run = useCallback((id: string) => {
    closeNewMenu()
    executeCommand(id)
  }, [closeNewMenu, executeCommand])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeNewMenu()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % ITEMS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + ITEMS.length) % ITEMS.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(ITEMS[selectedIndex].id)
    }
  }, [closeNewMenu, selectedIndex, run])

  if (!newMenuOpen) return null

  return (
    <div
      data-testid="new-menu"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) closeNewMenu()
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={el => el?.focus()}
    >
      <div
        style={{
          width: 260,
          maxWidth: '90vw',
          background: 'var(--surface)',
          borderRadius: RADIUS.lg,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{
          padding: '8px 12px 4px',
          fontSize: TYPE.xs,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-faintest)',
          fontFamily: FONT_MONO,
          userSelect: 'none',
        }}>
          New…
        </div>
        <div style={{ padding: `${SPACE.xs}px 0` }}>
          {ITEMS.map((item, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <div
                key={item.id}
                onClick={() => run(item.id)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: '6px 12px',
                  fontSize: TYPE.body,
                  fontFamily: FONT_MONO,
                  color: 'var(--text-secondary)',
                  background: isSelected ? 'var(--elevated)' : 'transparent',
                  cursor: 'pointer',
                  borderRadius: RADIUS.sm,
                  margin: '0 4px',
                  lineHeight: 1.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{item.label}</span>
                {item.hint && (
                  <kbd style={{
                    background: 'var(--elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text-faint)',
                    fontSize: TYPE.xs,
                    padding: '1px 6px',
                    marginLeft: 8,
                    flexShrink: 0,
                  }}>
                    {item.hint}
                  </kbd>
                )}
              </div>
            )
          })}
        </div>
        <div style={{
          padding: '4px 12px 6px',
          fontSize: TYPE.xs,
          fontFamily: FONT_MONO,
          color: 'var(--text-faintest)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          userSelect: 'none',
        }}>
          <span style={{ opacity: 0.7 }}>
            {'↑↓ navigate · ↵ select · esc close'}
          </span>
        </div>
      </div>
    </div>
  )
}
