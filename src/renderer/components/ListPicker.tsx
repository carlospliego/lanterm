import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FONT_MONO, TYPE, RADIUS } from '../designTokens'

interface ListPickerRequest {
  title: string
  items: string[]
  placeholder: string
  resolve: (value: string | null) => void
}

let listener: ((req: ListPickerRequest) => void) | null = null

/**
 * Show a searchable list picker dialog. Returns the selected item, or null if cancelled.
 */
export function showListPicker(title: string, items: string[], placeholder = 'Search…'): Promise<string | null> {
  return new Promise(resolve => {
    listener?.({ title, items, placeholder, resolve })
  })
}

export function ListPickerContainer() {
  const [request, setRequest] = useState<ListPickerRequest | null>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listener = (req) => {
      setRequest(req)
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    return () => { listener = null }
  }, [])

  const filtered = request
    ? request.items.filter(item => item.toLowerCase().includes(query.toLowerCase()))
    : []

  const dismiss = useCallback((result: string | null) => {
    if (!request) return
    request.resolve(result)
    setRequest(null)
  }, [request])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      dismiss(null)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        dismiss(filtered[selectedIndex] ?? filtered[0])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    }
  }, [dismiss, filtered, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0) }, [query])

  if (!request) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'var(--overlay)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) dismiss(null)
      }}
    >
      <div
        style={{
          width: 500,
          maxWidth: '90vw',
          background: 'var(--surface)',
          borderRadius: RADIUS.lg,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px var(--shadow)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '60vh',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{
          padding: '12px 14px 8px',
          fontSize: TYPE.sm,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-faintest)',
          fontFamily: FONT_MONO,
        }}>
          {request.title}
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={request.placeholder}
          style={{
            background: 'var(--surface)',
            border: 'none',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: FONT_MONO,
            fontSize: TYPE.xl,
            outline: 'none',
            padding: '10px 14px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}
        >
          {filtered.length === 0 && (
            <div style={{
              padding: '12px 14px',
              fontFamily: FONT_MONO,
              fontSize: TYPE.body,
              color: 'var(--text-faintest)',
            }}>
              No matches
            </div>
          )}
          {filtered.map((item, i) => (
            <div
              key={item}
              onMouseDown={() => dismiss(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                padding: '6px 14px',
                fontFamily: FONT_MONO,
                fontSize: TYPE.body,
                color: i === selectedIndex ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: i === selectedIndex ? 'var(--elevated)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {item}
            </div>
          ))}
        </div>
        <div style={{
          padding: '6px 14px',
          fontSize: TYPE.xs,
          fontFamily: FONT_MONO,
          color: 'var(--text-faintest)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          userSelect: 'none',
        }}>
          <span style={{ opacity: 0.7 }}>
            {'↑↓ navigate · ↵ select · esc cancel'}
          </span>
        </div>
      </div>
    </div>
  )
}
