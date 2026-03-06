import React, { useEffect, useState, useRef } from 'react'
import { FONT_MONO, TYPE, RADIUS } from '../designTokens'

let listener: ((text: string) => void) | null = null

export function showZoomIndicator(text: string) {
  listener?.(text)
}

export function ZoomIndicator() {
  const [text, setText] = useState<string | null>(null)
  const [opacity, setOpacity] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    listener = (t) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeRef.current) clearTimeout(fadeRef.current)
      setText(t)
      setOpacity(1)
      timerRef.current = setTimeout(() => {
        setOpacity(0)
        fadeRef.current = setTimeout(() => setText(null), 300)
      }, 800)
    }
    return () => {
      listener = null
      if (timerRef.current) clearTimeout(timerRef.current)
      if (fadeRef.current) clearTimeout(fadeRef.current)
    }
  }, [])

  if (!text) return null

  return (
    <div data-testid="zoom-indicator" style={{
      position: 'fixed',
      top: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      pointerEvents: 'none',
      fontFamily: FONT_MONO,
      fontSize: TYPE.md,
      padding: '6px 16px',
      borderRadius: RADIUS.lg,
      background: 'var(--elevated)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 4px 12px var(--shadow)',
      opacity,
      transition: 'opacity 0.3s ease',
      whiteSpace: 'nowrap',
    }}>
      {text}
    </div>
  )
}
