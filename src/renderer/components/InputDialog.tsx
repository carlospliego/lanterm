import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FONT_MONO, TYPE, RADIUS } from '../designTokens'
import { useAppStore } from '../store/useAppStore'
import { focusRegistry } from '../terminalRegistry'

interface InputRequest {
  title: string
  placeholder: string
  resolve: (value: string | null) => void
}

let listener: ((req: InputRequest) => void) | null = null

/**
 * Show a modal input dialog. Returns the entered string, or null if cancelled.
 */
export function showInput(title: string, placeholder: string): Promise<string | null> {
  return new Promise(resolve => {
    listener?.({ title, placeholder, resolve })
  })
}

export function InputDialogContainer() {
  const [request, setRequest] = useState<InputRequest | null>(null)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listener = (req) => {
      setRequest(req)
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    return () => { listener = null }
  }, [])

  const dismiss = useCallback((result: string | null) => {
    if (!request) return
    request.resolve(result)
    setRequest(null)
    const activeId = useAppStore.getState().activeTerminalId
    if (activeId) setTimeout(() => focusRegistry.get(activeId)?.focus(), 0)
  }, [request])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      dismiss(null)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = value.trim()
      dismiss(trimmed || null)
    }
  }, [dismiss, value])

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
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={request.placeholder}
          style={{
            background: 'var(--surface)',
            border: 'none',
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: FONT_MONO,
            fontSize: TYPE.xl,
            outline: 'none',
            padding: '10px 14px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
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
            {'↵ confirm · esc cancel'}
          </span>
        </div>
      </div>
    </div>
  )
}
