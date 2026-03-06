import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { useTasksStore } from './useTasksStore'
import { FONT_MONO, TYPE, SPACE, RADIUS, btnGhost, LIST_SEPARATOR, inputBase } from '../../../renderer/designTokens'
import type { WorktreePluginSettings } from '../../../shared/types'

const EMPTY_TASKS: never[] = []

/* ── Checkbox ────────────────────────────────────────────────── */

function Checkbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const [popping, setPopping] = useState(false)

  const handleClick = useCallback(() => {
    setPopping(true)
    onToggle()
    setTimeout(() => setPopping(false), 200)
  }, [onToggle])

  return (
    <span
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        flexShrink: 0,
        borderRadius: RADIUS.sm,
        border: checked ? 'none' : '1.5px solid var(--text-faintest)',
        background: checked ? 'var(--accent)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 150ms, border-color 150ms',
        transform: popping ? 'scale(1.2)' : 'scale(1)',
        position: 'relative',
        top: 1,
      }}
      title={checked ? 'Mark incomplete' : 'Mark complete'}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

/* ── TaskRow ─────────────────────────────────────────────────── */

interface TaskRowProps {
  taskId: string
  text: string
  done: boolean
  selected: boolean
  isNew: boolean
  isRemoving: boolean
  editingId: string | null
  copiedId: string | null
  confirmDeleteId: string | null
  dragEnabled: boolean
  onSelect: () => void
  onToggle: () => void
  onCopy: (id: string, text: string) => void
  onDelete: (id: string) => void
  onConfirmDelete: (id: string | null) => void
  onStartEdit: (id: string) => void
  onCommitEdit: (id: string, newText: string) => void
  onCancelEdit: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function TaskRow({
  taskId, text, done, selected, isNew, isRemoving,
  editingId, copiedId, confirmDeleteId, dragEnabled,
  onSelect, onToggle, onCopy, onDelete, onConfirmDelete,
  onStartEdit, onCommitEdit, onCancelEdit,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: TaskRowProps) {
  const isEditing = editingId === taskId
  const editRef = useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = useState(text)
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null)
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(text)
  }, [text])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    setDropPosition(e.clientY < midY ? 'above' : 'below')
    onDragOver(e)
  }, [onDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    setDropPosition(null)
    onDragLeave(e)
  }, [onDragLeave])

  const handleDrop = useCallback((e: React.DragEvent) => {
    setDropPosition(null)
    onDrop(e)
  }, [onDrop])

  // Animation styles
  let animStyle: React.CSSProperties = {}
  if (isNew) {
    animStyle = {
      animation: 'taskSlideIn 200ms ease-out forwards',
    }
  } else if (isRemoving) {
    animStyle = {
      animation: 'taskSlideOut 250ms ease-in forwards',
      pointerEvents: 'none',
    }
  }

  return (
    <div
      draggable={dragEnabled && !isEditing}
      onDragStart={(e) => { setDragging(true); onDragStart(e) }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={() => { setDragging(false); onDragEnd() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      data-task-id={taskId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px 4px 10px',
        borderBottom: LIST_SEPARATOR,
        opacity: dragging ? 0.4 : 1,
        background: selected ? 'var(--selection-bg)' : 'transparent',
        borderLeft: selected ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: dragEnabled && !isEditing ? 'grab' : 'default',
        position: 'relative',
        transition: 'background 100ms, opacity 100ms',
        ...animStyle,
      }}
    >
      {/* Drop indicator lines */}
      {dropPosition === 'above' && (
        <div style={{
          position: 'absolute', top: -1, left: 0, right: 0,
          height: 2, background: 'var(--accent)', zIndex: 1,
        }} />
      )}
      {dropPosition === 'below' && (
        <div style={{
          position: 'absolute', bottom: -1, left: 0, right: 0,
          height: 2, background: 'var(--accent)', zIndex: 1,
        }} />
      )}

      <Checkbox checked={done} onToggle={onToggle} />

      {isEditing ? (
        <input
          ref={editRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCommitEdit(taskId, editValue)
            } else if (e.key === 'Escape') {
              onCancelEdit()
            }
            e.stopPropagation()
          }}
          onBlur={() => onCommitEdit(taskId, editValue)}
          onClick={(e) => e.stopPropagation()}
          style={{
            ...inputBase,
            flex: 1,
            margin: '-2px 0',
            padding: '1px 4px',
          }}
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(taskId) }}
          style={{
            flex: 1,
            color: done ? 'var(--text-faintest)' : 'var(--text-muted)',
            textDecoration: done ? 'line-through' : 'none',
            wordBreak: 'break-word',
            lineHeight: 1.4,
            cursor: 'text',
            transition: 'color 200ms, text-decoration-color 200ms',
          }}
        >
          {text}
        </span>
      )}

      <button
        className="copy"
        onClick={(e) => { e.stopPropagation(); onCopy(taskId, text) }}
        style={{
          ...btnGhost,
          color: copiedId === taskId ? 'var(--accent)' : 'var(--text-faintest)',
          fontSize: 14,
          flexShrink: 0,
          opacity: copiedId === taskId ? 1 : (hovered ? 1 : 0),
          transition: 'opacity 0.1s, color 0.1s',
        }}
        title="Copy to clipboard"
      >
        {copiedId === taskId ? '\u2713' : '\u29C9'}
      </button>
      <button
        className="del"
        onClick={(e) => {
          e.stopPropagation()
          if (confirmDeleteId === taskId) {
            onDelete(taskId)
            onConfirmDelete(null)
          } else {
            onConfirmDelete(taskId)
          }
        }}
        onBlur={() => { if (confirmDeleteId === taskId) onConfirmDelete(null) }}
        style={{
          ...btnGhost,
          color: confirmDeleteId === taskId ? 'var(--destructive)' : 'var(--text-faintest)',
          fontSize: 16,
          flexShrink: 0,
          opacity: confirmDeleteId === taskId ? 1 : (hovered ? 1 : 0),
          transition: 'opacity 0.1s, color 0.1s',
        }}
        title={confirmDeleteId === taskId ? 'Click again to delete' : 'Delete task'}
      >
        {'\u00D7'}
      </button>
    </div>
  )
}

/* ── TasksPanel ──────────────────────────────────────────────── */

export function TasksPanel({ worktreePath }: { worktreePath: string; worktreeLabel: string | null }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [quickAddValue, setQuickAddValue] = useState('')
  const [quickAddFocused, setQuickAddFocused] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [dragFromIndex, setDragFromIndex] = useState<number>(-1)

  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const quickAddRef = useRef<HTMLInputElement>(null)
  const prevTaskIdsRef = useRef<Set<string>>(new Set())

  const copyTask = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(prev => prev === id ? null : prev), 1500)
  }, [])

  const allTasks = useTasksStore(s => s.tasksByWorktree[worktreePath] ?? EMPTY_TASKS)
  const toggleTask = useTasksStore(s => s.toggleTask)
  const removeTask = useTasksStore(s => s.removeTask)
  const addTask = useTasksStore(s => s.addTask)
  const editTask = useTasksStore(s => s.editTask)
  const clearCompleted = useTasksStore(s => s.clearCompleted)
  const reorderTasks = useTasksStore(s => s.reorderTasks)
  const wtSettings = useAppStore(s => s.settings.pluginSettings.worktree) as WorktreePluginSettings

  const tasks = useMemo(() => {
    let list = allTasks.filter(t => !removingIds.has(t.id))
    if (wtSettings.hideCompleted) list = list.filter(t => !t.done)
    if (wtSettings.sortCompletedToBottom) list = [...list].sort((a, b) => Number(a.done) - Number(b.done))
    return list
  }, [allTasks, wtSettings.hideCompleted, wtSettings.sortCompletedToBottom, removingIds])

  // Track new task IDs for entrance animation
  useEffect(() => {
    const currentIds = new Set(allTasks.map(t => t.id))
    const prev = prevTaskIdsRef.current
    if (prev.size > 0) {
      const added = new Set<string>()
      for (const id of currentIds) {
        if (!prev.has(id)) added.add(id)
      }
      if (added.size > 0) {
        setNewIds(added)
        setTimeout(() => setNewIds(new Set()), 250)
      }
    }
    prevTaskIdsRef.current = currentIds
  }, [allTasks])

  // Progress calculations
  const doneCount = allTasks.filter(t => t.done).length
  const totalCount = allTasks.length
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  // Animated delete
  const handleDelete = useCallback((id: string) => {
    setRemovingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      removeTask(id)
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 250)
  }, [removeTask])

  // Inline editing
  const handleStartEdit = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const handleCommitEdit = useCallback((id: string, newText: string) => {
    editTask(id, newText)
    setEditingId(null)
  }, [editTask])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  // Quick add
  const handleQuickAdd = useCallback(() => {
    const trimmed = quickAddValue.trim()
    if (trimmed) {
      addTask(trimmed)
      setQuickAddValue('')
    }
  }, [quickAddValue, addTask])

  // Drag and drop — convert display index to raw array index
  const rawIndexOf = useCallback((displayIndex: number) => {
    if (displayIndex < 0 || displayIndex >= tasks.length) return -1
    const task = tasks[displayIndex]
    return allTasks.findIndex(t => t.id === task.id)
  }, [tasks, allTasks])

  const handleDragStart = useCallback((displayIndex: number) => (e: React.DragEvent) => {
    setDragFromIndex(displayIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(displayIndex))
  }, [])

  const handleDrop = useCallback((displayToIndex: number) => (e: React.DragEvent) => {
    e.preventDefault()
    const fromDisplay = dragFromIndex
    if (fromDisplay === -1 || fromDisplay === displayToIndex) return

    // Determine drop position (above or below the target)
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    let toDisplay = e.clientY < midY ? displayToIndex : displayToIndex + 1
    if (fromDisplay < toDisplay) toDisplay--

    const rawFrom = rawIndexOf(fromDisplay)
    const rawTo = rawIndexOf(toDisplay >= tasks.length ? tasks.length - 1 : toDisplay)
    if (rawFrom !== -1 && rawTo !== -1) {
      reorderTasks(rawFrom, rawTo)
    }
    setDragFromIndex(-1)
  }, [dragFromIndex, rawIndexOf, reorderTasks, tasks.length])

  const handleDragEnd = useCallback(() => {
    setDragFromIndex(-1)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't handle if editing or quick-add focused
    if (editingId || quickAddFocused) return
    if (tasks.length === 0) return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = selectedIndex < tasks.length - 1 ? selectedIndex + 1 : 0
        setSelectedIndex(next)
        // Scroll into view
        const el = listRef.current?.querySelector(`[data-task-id="${tasks[next]?.id}"]`)
        el?.scrollIntoView({ block: 'nearest' })
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = selectedIndex > 0 ? selectedIndex - 1 : tasks.length - 1
        setSelectedIndex(prev)
        const el = listRef.current?.querySelector(`[data-task-id="${tasks[prev]?.id}"]`)
        el?.scrollIntoView({ block: 'nearest' })
        break
      }
      case ' ': {
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < tasks.length) {
          toggleTask(tasks[selectedIndex].id)
        }
        break
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < tasks.length) {
          handleDelete(tasks[selectedIndex].id)
          if (selectedIndex >= tasks.length - 1) {
            setSelectedIndex(Math.max(0, tasks.length - 2))
          }
        }
        break
      }
      case 'e':
      case 'E': {
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < tasks.length) {
          handleStartEdit(tasks[selectedIndex].id)
        }
        break
      }
      case 'Escape': {
        setSelectedIndex(-1)
        panelRef.current?.blur()
        break
      }
    }
  }, [editingId, quickAddFocused, tasks, selectedIndex, toggleTask, handleDelete, handleStartEdit])

  const dragEnabled = !wtSettings.sortCompletedToBottom

  return (
    <div
      ref={panelRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        flex: 1,
        minHeight: 0,
        fontFamily: FONT_MONO,
        fontSize: TYPE.body,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      {/* CSS keyframes for animations */}
      <style>{`
        @keyframes taskSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes taskSlideOut {
          from { opacity: 1; transform: translateX(0); max-height: 40px; }
          to { opacity: 0; transform: translateX(-10px); max-height: 0; padding-top: 0; padding-bottom: 0; }
        }
      `}</style>

      {/* Header with progress */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ padding: `${SPACE.xs}px ${SPACE.lg}px`, display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
          <span style={{ flex: 1, fontSize: TYPE.md, color: 'var(--text-faint)', fontWeight: 600 }}>
            Tasks
            {totalCount > 0 && (
              <span style={{ fontWeight: 400, color: 'var(--text-faintest)', marginLeft: 4 }}>
                {doneCount}/{totalCount}
              </span>
            )}
          </span>
          {doneCount > 0 && (
            <button
              onClick={() => clearCompleted()}
              style={{
                ...btnGhost,
                fontSize: TYPE.xs,
                color: 'var(--text-faintest)',
                padding: '1px 4px',
                borderRadius: RADIUS.sm,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
              title="Clear completed tasks"
            >
              Clear done
            </button>
          )}
        </div>
        {/* Progress bar */}
        <div style={{
          height: 2,
          background: 'var(--border-subtle)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'var(--accent)',
            transition: 'width 300ms ease',
          }} />
        </div>
      </div>

      {/* Task list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
        {tasks.map((task, i) => (
          <TaskRow
            key={task.id}
            taskId={task.id}
            text={task.text}
            done={task.done}
            selected={selectedIndex === i}
            isNew={newIds.has(task.id)}
            isRemoving={removingIds.has(task.id)}
            editingId={editingId}
            copiedId={copiedId}
            confirmDeleteId={confirmDeleteId}
            dragEnabled={dragEnabled}
            onSelect={() => setSelectedIndex(i)}
            onToggle={() => toggleTask(task.id)}
            onCopy={copyTask}
            onDelete={handleDelete}
            onConfirmDelete={setConfirmDeleteId}
            onStartEdit={handleStartEdit}
            onCommitEdit={handleCommitEdit}
            onCancelEdit={handleCancelEdit}
            onDragStart={handleDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => {}}
            onDrop={handleDrop(i)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Quick add input */}
      <div style={{
        flexShrink: 0,
        padding: '4px 10px 6px',
        borderTop: LIST_SEPARATOR,
      }}>
        <input
          ref={quickAddRef}
          value={quickAddValue}
          onChange={(e) => setQuickAddValue(e.target.value)}
          onFocus={() => setQuickAddFocused(true)}
          onBlur={() => setQuickAddFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleQuickAdd()
            }
            e.stopPropagation()
          }}
          placeholder="Add a task... ⌘-k"
          style={{
            width: '100%',
            boxSizing: 'border-box' as const,
            background: quickAddFocused ? 'var(--elevated)' : 'transparent',
            border: quickAddFocused ? '1px solid var(--border-subtle)' : '1px solid transparent',
            borderRadius: RADIUS.sm,
            color: 'var(--text-secondary)',
            fontSize: TYPE.body,
            fontFamily: FONT_MONO,
            padding: '3px 6px',
            outline: 'none',
            transition: 'background 150ms, border-color 150ms',
          }}
        />
      </div>
    </div>
  )
}
