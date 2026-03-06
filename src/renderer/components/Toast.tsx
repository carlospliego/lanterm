import React, { useEffect, useState, useCallback } from 'react'
import { FONT_MONO, TYPE, RADIUS } from '../designTokens'

interface Toast {
  id: number
  text: string
  variant: 'success' | 'error'
}

let nextId = 0
let listener: ((toast: Toast) => void) | null = null

export function showToast(text: string, variant: 'success' | 'error' = 'success') {
  listener?.({ id: nextId++, text, variant })
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    listener = (toast) => setToasts(prev => [...prev, toast])
    return () => { listener = null }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const ms = toast.variant === 'error' ? 5000 : 3000
    const timer = setTimeout(() => onDismiss(toast.id), ms)
    return () => clearTimeout(timer)
  }, [toast.id, toast.variant, onDismiss])

  return (
    <div style={{
      fontFamily: FONT_MONO,
      fontSize: TYPE.body,
      padding: '8px 14px',
      borderRadius: RADIUS.md,
      background: toast.variant === 'error' ? 'var(--destructive, #e55)' : 'var(--accent)',
      color: '#fff',
      pointerEvents: 'auto',
      cursor: 'pointer',
      boxShadow: '0 4px 12px var(--shadow)',
      maxWidth: 360,
      wordBreak: 'break-word',
    }}
      onClick={() => onDismiss(toast.id)}
    >
      {toast.text}
    </div>
  )
}
