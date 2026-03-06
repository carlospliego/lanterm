import React, { useEffect, useCallback } from 'react'
import { FONT_MONO, TYPE, RADIUS } from '../designTokens'

interface ConfirmRequest {
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  detail?: string
  disableConfirm?: boolean
  resolve: (confirmed: boolean) => void
}

let listener: ((req: ConfirmRequest) => void) | null = null

/**
 * Show a modal confirm dialog. Returns true if confirmed, false if cancelled.
 */
export function showConfirm(
  title: string,
  message: string,
  opts?: { confirmLabel?: string; destructive?: boolean; detail?: string; disableConfirm?: boolean },
): Promise<boolean> {
  return new Promise(resolve => {
    listener?.({ title, message, confirmLabel: opts?.confirmLabel, destructive: opts?.destructive, detail: opts?.detail, disableConfirm: opts?.disableConfirm, resolve })
  })
}

export function ConfirmDialogContainer() {
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null)

  useEffect(() => {
    listener = (req) => setRequest(req)
    return () => { listener = null }
  }, [])

  const dismiss = useCallback((result: boolean) => {
    if (!request) return
    request.resolve(result)
    setRequest(null)
  }, [request])

  useEffect(() => {
    if (!request) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(false) }
      else if (e.key === 'Enter' && !request.disableConfirm) { e.preventDefault(); dismiss(true) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [request, dismiss])

  if (!request) return null

  const confirmColor = request.destructive ? 'var(--destructive)' : 'var(--accent)'

  return (
    <div
      data-testid="confirm-dialog"
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
        if (e.target === e.currentTarget) dismiss(false)
      }}
    >
      <div
        style={{
          width: 420,
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
        <div style={{
          padding: '8px 14px 14px',
          fontSize: TYPE.body,
          fontFamily: FONT_MONO,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {request.message}
          {request.detail && (
            <div style={{
              marginTop: 8,
              fontSize: TYPE.xs,
              color: 'var(--destructive)',
              lineHeight: 1.4,
            }}>
              {request.detail}
            </div>
          )}
        </div>
        <div style={{
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => dismiss(false)}
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: RADIUS.md,
              color: 'var(--text-secondary)',
              fontFamily: FONT_MONO,
              fontSize: TYPE.xs,
              padding: '4px 12px',
              cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={() => dismiss(true)}
            disabled={request.disableConfirm}
            style={{
              background: confirmColor,
              border: 'none',
              borderRadius: RADIUS.md,
              color: '#fff',
              fontFamily: FONT_MONO,
              fontSize: TYPE.xs,
              padding: '4px 12px',
              cursor: request.disableConfirm ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: request.disableConfirm ? 0.4 : 1,
            }}
          >{request.confirmLabel ?? 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}
