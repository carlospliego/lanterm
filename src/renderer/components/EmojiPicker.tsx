import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { FONT_UI, TYPE, RADIUS } from '../designTokens'
import { EmojiPickerContent } from './EmojiPickerContent'

interface EmojiPickerProps {
  anchorRect: DOMRect
  onSelect: (icon: string | undefined) => void
  onClose: () => void
}

export function EmojiPicker({ anchorRect, onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const pickerWidth = 340
  const pickerHeight = 420
  let top = anchorRect.bottom + 4
  let left = anchorRect.left

  if (top + pickerHeight > window.innerHeight) top = anchorRect.top - pickerHeight - 4
  if (left + pickerWidth > window.innerWidth) left = window.innerWidth - pickerWidth - 8
  if (left < 4) left = 4

  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        width: pickerWidth,
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: RADIUS.lg,
        boxShadow: '0 8px 32px var(--shadow)',
        zIndex: 9999,
        fontFamily: FONT_UI,
        fontSize: TYPE.body,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: pickerHeight,
      }}
    >
      <EmojiPickerContent onSelect={onSelect} />
    </div>,
    document.body
  )
}
