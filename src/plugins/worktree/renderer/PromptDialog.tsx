import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { useTasksStore } from './useTasksStore'
import { focusRegistry } from '../../../renderer/terminalRegistry'
import { FONT_MONO, TYPE, RADIUS, SPACE } from '../../../renderer/designTokens'

export function PromptDialog() {
  const { promptOpen, closePrompt, activeTerminalId } = useAppStore()
  const addTask = useTasksStore(s => s.addTask)
  const [task, setTask] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!promptOpen) return
    setTask('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [promptOpen])

  const submit = useCallback(() => {
    const trimmed = task.trim()
    if (trimmed) addTask(trimmed)
    closePrompt()
    if (activeTerminalId) focusRegistry.get(activeTerminalId)?.focus()
  }, [task, addTask, activeTerminalId, closePrompt])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePrompt()
      if (activeTerminalId) focusRegistry.get(activeTerminalId)?.focus()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }, [closePrompt, submit, activeTerminalId])

  if (!promptOpen) return null

  return (
    <div
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closePrompt()
      }}
    >
      <div
        style={{
          width: 600,
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
          padding: '12px 16px 8px',
          fontSize: TYPE.sm,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-faintest)',
          fontFamily: FONT_MONO,
        }}>
          New Task
        </div>
        <textarea
          ref={inputRef}
          value={task}
          onChange={e => setTask(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the task…"
          rows={4}
          style={{
            background: 'var(--surface)',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: FONT_MONO,
            fontSize: TYPE.xl,
            outline: 'none',
            padding: '8px 14px 14px',
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  )
}
