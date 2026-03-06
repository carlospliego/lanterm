import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { focusRegistry } from '../terminalRegistry'
import { scanVisibleLinks, generateHintLabels, type HintTarget } from '../hintsScanner'
import { FONT_MONO, TYPE, RADIUS } from '../designTokens'

interface LabeledTarget extends HintTarget {
  label: string
}

export function HintsOverlay() {
  const hintsActive = useAppStore(s => s.hintsActive)
  const closeHints = useAppStore(s => s.closeHints)
  const activeTerminalId = useAppStore(s => s.activeTerminalId)
  const focusedPaneId = useAppStore(s => s.focusedPaneId)
  const splitLayouts = useAppStore(s => s.splitLayouts)

  const [targets, setTargets] = useState<LabeledTarget[]>([])
  const [typed, setTyped] = useState('')
  const [cellDims, setCellDims] = useState<{ width: number; height: number; offsetX: number; offsetY: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Determine which terminal to scan (split-aware)
  const getTargetTerminalId = useCallback(() => {
    if (!activeTerminalId) return null
    const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
    if (split && focusedPaneId) return focusedPaneId
    return activeTerminalId
  }, [activeTerminalId, focusedPaneId, splitLayouts])

  useEffect(() => {
    if (!hintsActive) {
      setTargets([])
      setTyped('')
      setCellDims(null)
      return
    }

    const termId = getTargetTerminalId()
    if (!termId) { closeHints(); return }

    const term = focusRegistry.get(termId)
    if (!term) { closeHints(); return }

    // Compute cell dimensions from the xterm screen element
    const screenEl = (term as any).element?.querySelector('.xterm-screen') as HTMLElement | null
    if (!screenEl) { closeHints(); return }

    const rect = screenEl.getBoundingClientRect()
    const cw = rect.width / term.cols
    const ch = rect.height / term.rows

    setCellDims({
      width: cw,
      height: ch,
      offsetX: rect.left,
      offsetY: rect.top,
    })

    // Scan for links
    const found = scanVisibleLinks(term)
    if (found.length === 0) { closeHints(); return }

    const labels = generateHintLabels(found.length)
    setTargets(found.map((t, i) => ({ ...t, label: labels[i] })))
    setTyped('')
  }, [hintsActive, getTargetTerminalId, closeHints])

  // Intercept keystrokes in capture phase so xterm doesn't get them
  useEffect(() => {
    if (!hintsActive || targets.length === 0) return

    const handler = (e: KeyboardEvent) => {
      // Escape closes hints
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeHints()
        return
      }

      // Backspace removes last typed char
      if (e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        setTyped(prev => prev.slice(0, -1))
        return
      }

      // Only accept lowercase letters
      if (e.key.length === 1 && /[a-z]/.test(e.key)) {
        e.preventDefault()
        e.stopPropagation()

        const next = typed + e.key
        setTyped(next)

        // Check for exact match
        const match = targets.find(t => t.label === next)
        if (match) {
          closeHints()
          activateTarget(match)
          return
        }

        // Check if any labels still match the prefix
        const hasPrefix = targets.some(t => t.label.startsWith(next))
        if (!hasPrefix) {
          // No matches — close hints
          closeHints()
        }
      }
    }

    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [hintsActive, targets, typed, closeHints])

  // Close on click outside
  useEffect(() => {
    if (!hintsActive) return
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        closeHints()
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [hintsActive, closeHints])

  const activateTarget = useCallback((target: HintTarget) => {
    const termId = getTargetTerminalId()
    if (!termId) return

    switch (target.type) {
      case 'url':
        window.termAPI.openExternalUrl(target.text)
        break
      case 'file': {
        const session = useAppStore.getState().terminals.find(t => t.id === termId)
        if (session) {
          const filePath = target.text.replace(/:(\d+)(?::(\d+))?$/, '')
          const lineMatch = target.text.match(/:(\d+)(?::(\d+))?$/)
          const line = lineMatch?.[1] ? parseInt(lineMatch[1], 10) : undefined
          const col = lineMatch?.[2] ? parseInt(lineMatch[2], 10) : undefined
          window.termAPI.openFileInEditor(filePath, session.cwd, line, col)
        }
        break
      }
      case 'hash':
        window.termAPI.ptyWrite(termId, `git show ${target.text}\r`)
        break
    }
  }, [getTargetTerminalId])

  if (!hintsActive || targets.length === 0 || !cellDims) return null

  const filtered = typed ? targets.filter(t => t.label.startsWith(typed)) : targets

  return (
    <div
      ref={overlayRef}
      data-testid="hints-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--overlay)',
        pointerEvents: 'none',
      }}
    >
      {filtered.map((target, i) => {
        const x = cellDims.offsetX + target.col * cellDims.width
        const y = cellDims.offsetY + target.row * cellDims.height

        // Show the remaining portion of the label not yet typed
        const remaining = target.label.slice(typed.length)

        return (
          <div
            key={i}
            style={{
              position: 'fixed',
              left: x,
              top: y,
              fontFamily: FONT_MONO,
              fontSize: TYPE.body,
              fontWeight: 700,
              lineHeight: '16px',
              padding: '0 3px',
              borderRadius: RADIUS.sm,
              background: 'var(--accent)',
              color: 'var(--text-primary)',
              zIndex: 10000,
              pointerEvents: 'auto',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => {
              e.stopPropagation()
              closeHints()
              activateTarget(target)
            }}
          >
            {typed && (
              <span style={{ opacity: 0.5 }}>{typed.toUpperCase()}</span>
            )}
            {remaining.toUpperCase()}
          </div>
        )
      })}
    </div>
  )
}
