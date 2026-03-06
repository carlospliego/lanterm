import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { FONT_MONO, RADIUS } from '../designTokens'
import { IconDisplay } from './IconDisplay'

type KebabMenuItem = { label: string; onClick: () => void; icon?: string; shortcut?: string } | { separator: true }

interface KebabMenuProps {
  items: KebabMenuItem[]
}

export function KebabMenu({ items }: KebabMenuProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 2, left: rect.left })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          background: 'none',
          border: 'none',
          color: open ? 'var(--text-secondary)' : 'var(--text-faintest)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: '0 2px',
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = 'var(--text-muted)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--text-faintest)' }}
        title="More actions"
      >⋮</button>
      {open && ReactDOM.createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: 'var(--elevated)',
            border: '1px solid var(--border)',
            borderRadius: RADIUS.md,
            boxShadow: '0 4px 12px var(--shadow)',
            zIndex: 9999,
            minWidth: 120,
            overflow: 'hidden',
          }}
        >
          {items.map((item, i) =>
            'separator' in item ? (
              <div key={`sep-${i}`} style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
            ) : (
              <button
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: FONT_MONO,
                  padding: '7px 12px',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                onClick={e => { e.stopPropagation(); item.onClick(); setOpen(false) }}
              >{item.icon && <IconDisplay icon={item.icon} style={{ fontSize: 12, width: 14, textAlign: 'center', flexShrink: 0, opacity: 0.7 }} />}{item.label}{item.shortcut && <span style={{ marginLeft: 'auto', color: 'var(--text-faintest)', fontSize: 11, paddingLeft: 12 }}>{item.shortcut}</span>}</button>
            )
          )}
        </div>,
        document.body
      )}
    </>
  )
}
