import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { useButtonsStore } from './useButtonsStore'
import {
  FONT_MONO,
  TYPE,
  RADIUS,
  SPACE,
  panelTitleStyle,
  panelHeaderAction,
  btnReset,
  btnOutline,
  btnPrimary,
  inputBase,
  emptyState,
} from '../../../renderer/designTokens'
import type { ButtonConfig, ButtonRunState, ButtonFolder } from '../shared/types'
import { IconDisplay } from '../../../renderer/components/IconDisplay'
import { showInput } from '../../../renderer/components/InputDialog'
import type { Keybinding } from '../../../shared/keybindings'
import { formatBinding } from '../../../shared/keybindings'

const MAX_OUTPUT = 50_000

const defaultRunState = (): ButtonRunState => ({
  running: false,
  output: '',
  exitCode: null,
  durationMs: null,
  pid: null,
})

type FormMode = 'button' | 'folder'
type DragItem = { type: 'button'; id: string } | { type: 'folder'; id: string }

export function ButtonsPanel() {
  const buttons = useButtonsStore((s) => s.buttons)
  const folders = useButtonsStore((s) => s.folders)
  const addButton = useButtonsStore((s) => s.addButton)
  const updateButton = useButtonsStore((s) => s.updateButton)
  const removeButton = useButtonsStore((s) => s.removeButton)
  const moveButton = useButtonsStore((s) => s.moveButton)
  const addFolder = useButtonsStore((s) => s.addFolder)
  const updateFolder = useButtonsStore((s) => s.updateFolder)
  const removeFolder = useButtonsStore((s) => s.removeFolder)
  const toggleFolderCollapsed = useButtonsStore((s) => s.toggleFolderCollapsed)
  const reorderFolders = useButtonsStore((s) => s.reorderFolders)
  const reorderButtons = useButtonsStore((s) => s.reorderButtons)

  const pluginKeybindings = useAppStore((s) => s.settings.pluginKeybindings)
  const updatePluginKeybinding = useAppStore((s) => s.updatePluginKeybinding)

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('button')
  const [editId, setEditId] = useState<string | null>(null)
  const [editFolderId, setEditFolderId] = useState<string | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formCwd, setFormCwd] = useState('')
  const [formColor, setFormColor] = useState('')
  const [formPromptEnabled, setFormPromptEnabled] = useState(false)
  const [formPromptTitle, setFormPromptTitle] = useState('')
  const [formPromptPlaceholder, setFormPromptPlaceholder] = useState('')
  const [formPromptVariable, setFormPromptVariable] = useState('')
  const [formRunInTerminal, setFormRunInTerminal] = useState(false)
  const [formRunInActiveTerminal, setFormRunInActiveTerminal] = useState(false)
  const [formRunOnStartup, setFormRunOnStartup] = useState(false)
  const [formKeybinding, setFormKeybinding] = useState<Keybinding | null>(null)
  const [recordingKeybinding, setRecordingKeybinding] = useState(false)
  const [formFolderId, setFormFolderId] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)
  const [, forceUpdate] = useState(0)
  const runStates = useRef<Map<string, ButtonRunState>>(new Map())

  // Drag state
  const dragItem = useRef<DragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<{ type: 'button'; id: string } | { type: 'folder'; id: string } | { type: 'folder-zone'; id: string } | null>(null)

  // Get active terminal cwd
  const getActiveCwd = useCallback(() => {
    const { terminals, activeTerminalId, focusedPaneId, splitLayouts } = useAppStore.getState()
    const split = splitLayouts.find(
      (sl) => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId,
    )
    const targetId = split && focusedPaneId ? focusedPaneId : activeTerminalId
    const session = terminals.find((t) => t.id === targetId)
    return session?.cwd || ''
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const unsub1 = window.termAPI.onButtonsOutput((buttonId: string, data: string) => {
      const state = runStates.current.get(buttonId) ?? defaultRunState()
      let output = state.output + data
      if (output.length > MAX_OUTPUT) {
        output = output.slice(output.length - MAX_OUTPUT)
      }
      runStates.current.set(buttonId, { ...state, output })
      forceUpdate((n) => n + 1)
    })

    const unsub2 = window.termAPI.onButtonsExit(
      (buttonId: string, exitCode: number, durationMs: number) => {
        const state = runStates.current.get(buttonId) ?? defaultRunState()
        runStates.current.set(buttonId, {
          ...state,
          running: false,
          exitCode,
          durationMs,
          pid: null,
        })
        forceUpdate((n) => n + 1)
      },
    )

    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  // Run startup buttons once on mount
  const startupRan = useRef(false)
  useEffect(() => {
    if (startupRan.current) return
    startupRan.current = true
    const startupButtons = useButtonsStore.getState().buttons.filter(b => b.runOnStartup && !b.runInActiveTerminal)
    for (const btn of startupButtons) {
      if (btn.prompt) continue // skip buttons that require input
      const cwd = btn.cwd || ''
      if (btn.runInTerminal) {
        const id = crypto.randomUUID()
        const store = useAppStore.getState()
        const order = store.terminals.filter(t => !t.folderId).length
        store.addTerminal({
          id,
          title: btn.label,
          cwd,
          order,
          scrollback: '',
          icon: 'fa:fa-solid fa-terminal',
          initialCommand: btn.command,
        })
      } else {
        runStates.current.set(btn.id, {
          running: true,
          output: '',
          exitCode: null,
          durationMs: null,
          pid: null,
        })
        window.termAPI.buttonsRun({ buttonId: btn.id, command: btn.command, cwd }).then(({ pid }) => {
          const s = runStates.current.get(btn.id)
          if (s) runStates.current.set(btn.id, { ...s, pid })
          forceUpdate(n => n + 1)
        }).catch(() => {
          runStates.current.set(btn.id, { running: false, output: 'Failed to start process\n', exitCode: 1, durationMs: null, pid: null })
          forceUpdate(n => n + 1)
        })
      }
    }
    if (startupButtons.some(b => !b.runInTerminal)) forceUpdate(n => n + 1)
  }, [])

  // Close kebab menu on outside click
  useEffect(() => {
    if (!menuId && !folderMenuId) return
    const handler = () => { setMenuId(null); setFolderMenuId(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuId, folderMenuId])

  // Capture keybinding when recording
  useEffect(() => {
    if (!recordingKeybinding) return
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRecordingKeybinding(false); return }
      if (['Meta', 'Shift', 'Alt', 'Control'].includes(e.key)) return
      setFormKeybinding({
        key: e.key,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      })
      setRecordingKeybinding(false)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recordingKeybinding])

  const handleRun = async (btn: ButtonConfig) => {
    const state = runStates.current.get(btn.id)
    if (state?.running) return

    let command = btn.command
    if (btn.prompt) {
      const value = await showInput(btn.prompt.title, btn.prompt.placeholder)
      if (value === null) return
      command = command.replaceAll(`{{${btn.prompt.variable}}}`, value)
    }

    const cwd = btn.cwd || getActiveCwd()

    if (btn.runInActiveTerminal) {
      const { activeTerminalId, focusedPaneId, splitLayouts } = useAppStore.getState()
      const split = splitLayouts.find(
        (sl) => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId,
      )
      const targetId = split && focusedPaneId ? focusedPaneId : activeTerminalId
      if (targetId) {
        window.termAPI.ptyWrite(targetId, command + '\r')
      }
      return
    }

    if (btn.runInTerminal) {
      const id = crypto.randomUUID()
      const store = useAppStore.getState()
      const order = store.terminals.filter(t => !t.folderId).length
      store.addTerminal({
        id,
        title: btn.label,
        cwd,
        order,
        scrollback: '',
        icon: 'fa:fa-solid fa-terminal',
        initialCommand: command,
      })
      store.setActiveTerminal(id)
      return
    }

    runStates.current.set(btn.id, {
      running: true,
      output: '',
      exitCode: null,
      durationMs: null,
      pid: null,
    })
    setExpandedId(btn.id)
    forceUpdate((n) => n + 1)

    try {
      const { pid } = await window.termAPI.buttonsRun({
        buttonId: btn.id,
        command,
        cwd,
      })
      const s = runStates.current.get(btn.id)
      if (s) {
        runStates.current.set(btn.id, { ...s, pid })
        forceUpdate((n) => n + 1)
      }
    } catch {
      runStates.current.set(btn.id, {
        running: false,
        output: 'Failed to start process\n',
        exitCode: 1,
        durationMs: null,
        pid: null,
      })
      forceUpdate((n) => n + 1)
    }
  }

  const handleKill = async (buttonId: string) => {
    await window.termAPI.buttonsKill(buttonId)
  }

  const handleSubmitForm = () => {
    if (formMode === 'folder') {
      if (!formLabel.trim()) return
      if (editFolderId) {
        updateFolder(editFolderId, {
          label: formLabel.trim(),
          color: formColor.trim() || undefined,
        })
      } else {
        addFolder(formLabel.trim(), formColor.trim() || undefined)
      }
      resetForm()
      return
    }

    if (!formLabel.trim() || !formCommand.trim()) return
    const prompt = formPromptEnabled && formPromptVariable.trim()
      ? { title: formPromptTitle.trim() || formLabel.trim(), placeholder: formPromptPlaceholder.trim(), variable: formPromptVariable.trim() }
      : undefined
    if (editId) {
      updateButton(editId, {
        label: formLabel.trim(),
        command: formCommand.trim(),
        cwd: formCwd.trim() || undefined,
        color: formColor.trim() || undefined,
        prompt,
        runInTerminal: formRunInTerminal || undefined,
        runInActiveTerminal: formRunInActiveTerminal || undefined,
        runOnStartup: formRunOnStartup || undefined,
        folderId: formFolderId || undefined,
      })
      updatePluginKeybinding(`buttons:run:${editId}`, formKeybinding)
    } else {
      const prevIds = new Set(useButtonsStore.getState().buttons.map(b => b.id))
      addButton(
        formLabel.trim(),
        formCommand.trim(),
        formCwd.trim() || undefined,
        formColor.trim() || undefined,
        prompt,
        formRunInTerminal || undefined,
        formRunInActiveTerminal || undefined,
        formFolderId || undefined,
        formRunOnStartup || undefined,
      )
      if (formKeybinding) {
        const newBtn = useButtonsStore.getState().buttons.find(b => !prevIds.has(b.id))
        if (newBtn) updatePluginKeybinding(`buttons:run:${newBtn.id}`, formKeybinding)
      }
    }
    resetForm()
  }

  const resetForm = () => {
    setShowForm(false)
    setFormMode('button')
    setEditId(null)
    setEditFolderId(null)
    setFormLabel('')
    setFormCommand('')
    setFormCwd('')
    setFormColor('')
    setFormPromptEnabled(false)
    setFormPromptTitle('')
    setFormPromptPlaceholder('')
    setFormPromptVariable('')
    setFormRunInTerminal(false)
    setFormRunInActiveTerminal(false)
    setFormRunOnStartup(false)
    setFormKeybinding(null)
    setRecordingKeybinding(false)
    setFormFolderId('')
  }

  const startEdit = (btn: ButtonConfig) => {
    setEditId(btn.id)
    setEditFolderId(null)
    setFormMode('button')
    setFormLabel(btn.label)
    setFormCommand(btn.command)
    setFormCwd(btn.cwd ?? '')
    setFormColor(btn.color ?? '')
    setFormPromptEnabled(!!btn.prompt)
    setFormPromptTitle(btn.prompt?.title ?? '')
    setFormPromptPlaceholder(btn.prompt?.placeholder ?? '')
    setFormPromptVariable(btn.prompt?.variable ?? '')
    setFormRunInTerminal(!!btn.runInTerminal)
    setFormRunInActiveTerminal(!!btn.runInActiveTerminal)
    setFormRunOnStartup(!!btn.runOnStartup)
    setFormKeybinding(pluginKeybindings?.[`buttons:run:${btn.id}`] ?? null)
    setRecordingKeybinding(false)
    setFormFolderId(btn.folderId ?? '')
    setShowForm(true)
  }

  const startEditFolder = (folder: { id: string; label: string; color?: string }) => {
    setEditFolderId(folder.id)
    setEditId(null)
    setFormMode('folder')
    setFormLabel(folder.label)
    setFormColor(folder.color ?? '')
    setFormCommand('')
    setFormCwd('')
    setFormFolderId('')
    setShowForm(true)
  }

  const openButtonForm = () => {
    resetForm()
    setFormMode('button')
    setShowForm(true)
  }

  const openFolderForm = () => {
    resetForm()
    setFormMode('folder')
    setShowForm(true)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
  }

  // --- Drag handlers ---
  const handleButtonDragStart = (e: React.DragEvent, btnId: string) => {
    dragItem.current = { type: 'button', id: btnId }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', btnId)
  }

  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    dragItem.current = { type: 'folder', id: folderId }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', folderId)
  }

  const handleDragEnd = () => {
    dragItem.current = null
    setDropTarget(null)
  }

  const handleButtonDragOver = (e: React.DragEvent, btnId: string) => {
    if (!dragItem.current || dragItem.current.type !== 'button') return
    if (dragItem.current.id === btnId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget({ type: 'button', id: btnId })
  }

  const handleButtonDrop = (e: React.DragEvent, targetBtnId: string, targetFolderId: string | undefined) => {
    e.preventDefault()
    const drag = dragItem.current
    if (!drag || drag.type !== 'button' || drag.id === targetBtnId) return
    moveButton(drag.id, targetFolderId, targetBtnId)
    handleDragEnd()
  }

  const handleFolderZoneDragOver = (e: React.DragEvent, folderId: string) => {
    const drag = dragItem.current
    if (!drag) return
    if (drag.type === 'button') {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropTarget({ type: 'folder-zone', id: folderId })
    } else if (drag.type === 'folder' && drag.id !== folderId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropTarget({ type: 'folder', id: folderId })
    }
  }

  const handleFolderZoneDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    const drag = dragItem.current
    if (!drag) return
    if (drag.type === 'button') {
      moveButton(drag.id, folderId)
    } else if (drag.type === 'folder' && drag.id !== folderId) {
      // Reorder: move dragged folder before target folder
      const ids = folders.map(f => f.id)
      const fromIdx = ids.indexOf(drag.id)
      const toIdx = ids.indexOf(folderId)
      if (fromIdx >= 0 && toIdx >= 0) {
        ids.splice(fromIdx, 1)
        ids.splice(toIdx, 0, drag.id)
        reorderFolders(ids)
      }
    }
    handleDragEnd()
  }

  const handleUngroupedZoneDragOver = (e: React.DragEvent) => {
    const drag = dragItem.current
    if (!drag || drag.type !== 'button') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget({ type: 'folder-zone', id: '__ungrouped__' })
  }

  const handleUngroupedZoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const drag = dragItem.current
    if (!drag || drag.type !== 'button') return
    moveButton(drag.id, undefined)
    handleDragEnd()
  }

  const ungroupedButtons = buttons.filter((b) => !b.folderId)

  const renderButton = (btn: ButtonConfig, targetFolderId: string | undefined) => {
    const rs = runStates.current.get(btn.id) ?? defaultRunState()
    const statusColor = rs.running
      ? 'var(--accent)'
      : rs.exitCode === 0
        ? '#4caf50'
        : rs.exitCode !== null
          ? '#f44336'
          : 'var(--border-subtle)'
    const isDropBefore = dropTarget?.type === 'button' && dropTarget.id === btn.id

    return (
      <button
        key={btn.id}
        draggable
        onDragStart={(e) => handleButtonDragStart(e, btn.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleButtonDragOver(e, btn.id)}
        onDrop={(e) => handleButtonDrop(e, btn.id, targetFolderId)}
        onClick={() => handleRun(btn)}
        disabled={rs.running}
        style={{
          ...btnReset,
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACE.sm,
          padding: `${SPACE.md}px ${SPACE.lg}px`,
          background: 'var(--elevated)',
          border: '1px solid var(--border-subtle)',
          borderLeft: isDropBefore ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
          borderRadius: RADIUS.md,
          fontSize: TYPE.md,
          fontFamily: FONT_MONO,
          fontWeight: 500,
          color: rs.running ? 'var(--text-faintest)' : 'var(--text-secondary)',
          cursor: rs.running ? 'default' : 'grab',
          opacity: rs.running ? 0.7 : 1,
          transition: 'border-color 0.1s',
        }}
      >
        {btn.color && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: btn.color,
            }}
          />
        )}
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (rs.running) {
              handleKill(btn.id)
            } else {
              setExpandedId(expandedId === btn.id ? null : btn.id)
            }
          }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            cursor: 'pointer',
            animation: rs.running ? 'pulse 1.5s infinite' : 'none',
            flexShrink: 0,
          }}
          title={rs.running ? 'Click to kill' : rs.exitCode !== null ? 'Click to toggle output' : ''}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {btn.label}
        </span>
        {pluginKeybindings?.[`buttons:run:${btn.id}`] && (
          <span
            style={{
              fontSize: TYPE.xs,
              fontFamily: FONT_MONO,
              color: 'var(--text-faintest)',
              background: 'var(--bg)',
              borderRadius: RADIUS.sm,
              padding: '1px 4px',
              flexShrink: 0,
            }}
          >
            {formatBinding(pluginKeybindings[`buttons:run:${btn.id}`])}
          </span>
        )}
        <div
          onClick={(e) => {
            e.stopPropagation()
            setMenuId(menuId === btn.id ? null : btn.id)
          }}
          style={{
            flexShrink: 0,
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: TYPE.lg,
            color: 'var(--text-faint)',
            lineHeight: 1,
            borderRadius: RADIUS.sm,
          }}
          title="Options"
        >
          ⋮
        </div>
        {menuId === btn.id && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              zIndex: 10,
              marginTop: 2,
              background: 'var(--elevated)',
              border: '1px solid var(--border)',
              borderRadius: RADIUS.md,
              boxShadow: '0 4px 12px var(--shadow)',
              overflow: 'hidden',
              minWidth: 120,
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation()
                setMenuId(null)
                startEdit(btn)
              }}
              style={{
                padding: '7px 12px',
                fontSize: TYPE.md,
                fontFamily: FONT_MONO,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Edit
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
            <div
              onClick={(e) => {
                e.stopPropagation()
                setMenuId(null)
                updatePluginKeybinding(`buttons:run:${btn.id}`, null)
                removeButton(btn.id)
              }}
              style={{
                padding: '7px 12px',
                fontSize: TYPE.md,
                fontFamily: FONT_MONO,
                color: '#f44336',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Delete
            </div>
          </div>
        )}
      </button>
    )
  }

  const renderButtonGrid = (btns: ButtonConfig[], targetFolderId: string | undefined) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: SPACE.sm,
      }}
    >
      {btns.map((btn) => renderButton(btn, targetFolderId))}
    </div>
  )

  const renderFolder = (folder: ButtonFolder) => {
    const folderButtons = buttons.filter((b) => b.folderId === folder.id)
    const isDropTarget = (dropTarget?.type === 'folder-zone' || dropTarget?.type === 'folder') && dropTarget.id === folder.id

    return (
      <div
        key={folder.id}
        style={{ marginTop: SPACE.md }}
        onDragOver={(e) => handleFolderZoneDragOver(e, folder.id)}
        onDragLeave={() => { if (dropTarget?.id === folder.id) setDropTarget(null) }}
        onDrop={(e) => handleFolderZoneDrop(e, folder.id)}
      >
        {/* Folder header */}
        <div
          draggable
          onDragStart={(e) => handleFolderDragStart(e, folder.id)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACE.sm,
            padding: `${SPACE.xs}px 0`,
            cursor: 'grab',
            userSelect: 'none',
            position: 'relative',
            borderRadius: RADIUS.sm,
            background: isDropTarget ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
            transition: 'background 0.1s',
          }}
          onClick={() => toggleFolderCollapsed(folder.id)}
        >
          {folder.color && (
            <div style={{ width: 3, height: 14, borderRadius: 2, background: folder.color, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 9, color: 'var(--text-faintest)' }}>
            {folder.collapsed ? '\u25B6' : '\u25BC'}
          </span>
          <span style={{ fontSize: TYPE.sm, fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>
            {folder.label}
          </span>
          <span style={{ fontSize: TYPE.xs, color: 'var(--text-faintest)' }}>
            {folderButtons.length}
          </span>
          {/* Folder kebab menu */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setFolderMenuId(folderMenuId === folder.id ? null : folder.id)
            }}
            style={{
              flexShrink: 0,
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: TYPE.md,
              color: 'var(--text-faint)',
              lineHeight: 1,
              borderRadius: RADIUS.sm,
            }}
            title="Folder options"
          >
            ⋮
          </div>
          {folderMenuId === folder.id && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                zIndex: 10,
                marginTop: 2,
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                borderRadius: RADIUS.md,
                boxShadow: '0 4px 12px var(--shadow)',
                overflow: 'hidden',
                minWidth: 120,
              }}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setFolderMenuId(null)
                  startEditFolder(folder)
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: TYPE.md,
                  fontFamily: FONT_MONO,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Edit
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setFolderMenuId(null)
                  removeFolder(folder.id)
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: TYPE.md,
                  fontFamily: FONT_MONO,
                  color: '#f44336',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--border-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Delete
              </div>
            </div>
          )}
        </div>
        {/* Folder buttons */}
        {!folder.collapsed && (
          <div style={{
            paddingLeft: SPACE.md,
            minHeight: 24,
            borderRadius: RADIUS.sm,
          }}>
            {folderButtons.length > 0
              ? renderButtonGrid(folderButtons, folder.id)
              : (
                <div style={{ fontSize: TYPE.xs, color: 'var(--text-faintest)', padding: `${SPACE.xs}px 0` }}>
                  Drop buttons here
                </div>
              )
            }
          </div>
        )}
      </div>
    )
  }

  const formInput: React.CSSProperties = {
    ...inputBase,
    fontSize: TYPE.sm,
    padding: '4px 6px',
    borderRadius: RADIUS.md,
  }
  const compactLabelStyle: React.CSSProperties = {
    fontSize: TYPE.xs,
    color: 'var(--text-faintest)',
    fontWeight: 600,
    flexShrink: 0,
  }
  const segmentBase: React.CSSProperties = {
    ...btnReset,
    flex: 1,
    fontSize: TYPE.xs,
    fontFamily: FONT_MONO,
    padding: '3px 4px',
    textAlign: 'center' as const,
    transition: 'all 0.15s',
    cursor: 'pointer',
  }

  const runMode = formRunInTerminal ? 'newTab' : formRunInActiveTerminal ? 'activeTab' : 'background'
  const setRunMode = (mode: 'background' | 'newTab' | 'activeTab') => {
    setFormRunInTerminal(mode === 'newTab')
    setFormRunInActiveTerminal(mode === 'activeTab')
    if (mode === 'activeTab') setFormRunOnStartup(false)
  }

  return (
    <div
      data-testid="plugin-panel-buttons"
      style={{
        flex: 1,
        minHeight: 0,
        fontFamily: FONT_MONO,
        fontSize: TYPE.body,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={panelTitleStyle}>
        <span style={{ flex: 1 }}>Buttons</span>
        <button
          onClick={openFolderForm}
          style={{ ...panelHeaderAction, width: 24, height: 24, fontSize: 16 }}
          title="New folder"
        >
          <IconDisplay icon="fa:fa-solid fa-folder-plus" style={{ fontSize: 13 }} />
        </button>
        <button
          onClick={openButtonForm}
          style={{ ...panelHeaderAction, width: 24, height: 24, fontSize: 16 }}
          title="New button"
        >
          <IconDisplay icon="fa:fa-solid fa-square-plus" style={{ fontSize: 13 }} />
        </button>
      </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: `${SPACE.sm}px ${SPACE.lg}px ${SPACE.lg}px` }}>
          {/* Add/Edit Form */}
          {showForm && (
            <div
              style={{
                marginBottom: SPACE.md,
                background: 'var(--elevated)',
                borderRadius: RADIUS.lg,
                display: 'flex',
                flexDirection: 'column',
                gap: SPACE.sm,
                padding: `${SPACE.md}px ${SPACE.lg}px`,
              }}
            >
              {/* Label + Color on one row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder={formMode === 'folder' ? 'Folder label' : 'Button label'}
                  style={{ ...formInput, flex: 1 }}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitForm()}
                />
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: RADIUS.sm,
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="color"
                    value={formColor || '#4a9eff'}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{ width: 32, height: 32, padding: 0, border: 'none', cursor: 'pointer', background: 'none', margin: -4 }}
                  />
                </div>
              </div>

              {formMode === 'button' && (
                <>
                  {/* Command */}
                  <input
                    value={formCommand}
                    onChange={(e) => setFormCommand(e.target.value)}
                    placeholder="Command, e.g. npm run build"
                    style={formInput}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitForm()}
                  />

                  {/* Working dir + Folder on one row */}
                  <div style={{ display: 'flex', gap: SPACE.sm }}>
                    <input
                      value={formCwd}
                      onChange={(e) => setFormCwd(e.target.value)}
                      placeholder="Working directory"
                      style={{ ...formInput, flex: 1 }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitForm()}
                    />
                    {folders.length > 0 && (
                      <select
                        value={formFolderId}
                        onChange={(e) => setFormFolderId(e.target.value)}
                        style={{ ...formInput, width: 90, cursor: 'pointer', flexShrink: 0 }}
                      >
                        <option value="">No folder</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Run Mode — segmented control */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                    <span style={compactLabelStyle}>Run</span>
                    <div style={{
                      display: 'flex',
                      flex: 1,
                      border: '1px solid var(--border-subtle)',
                      borderRadius: RADIUS.md,
                      overflow: 'hidden',
                    }}>
                      {(['background', 'newTab', 'activeTab'] as const).map((mode) => {
                        const disabled = mode === 'activeTab' && formRunOnStartup
                        return (
                          <button
                            key={mode}
                            onClick={() => !disabled && setRunMode(mode)}
                            style={{
                              ...segmentBase,
                              background: runMode === mode ? 'var(--accent)' : 'var(--bg)',
                              color: runMode === mode ? '#fff' : 'var(--text-faintest)',
                              opacity: disabled ? 0.35 : 1,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {mode === 'background' ? 'Background' : mode === 'newTab' ? 'New Tab' : 'Active Tab'}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Run on startup */}
                  <div
                    onClick={() => {
                      const next = !formRunOnStartup
                      setFormRunOnStartup(next)
                      if (next && formRunInActiveTerminal) setRunMode('background')
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACE.xs,
                      fontSize: TYPE.sm,
                      color: formRunOnStartup ? 'var(--accent)' : 'var(--text-faintest)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      border: `1px solid ${formRunOnStartup ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      background: formRunOnStartup ? 'var(--accent)' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {formRunOnStartup && '\u2713'}
                    </span>
                    Run on startup
                  </div>

                  {/* Prompt toggle */}
                  <div
                    onClick={() => setFormPromptEnabled(!formPromptEnabled)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACE.xs,
                      fontSize: TYPE.sm,
                      color: formPromptEnabled ? 'var(--accent)' : 'var(--text-faintest)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      border: `1px solid ${formPromptEnabled ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      background: formPromptEnabled ? 'var(--accent)' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {formPromptEnabled && '\u2713'}
                    </span>
                    Prompt for input
                  </div>
                  {formPromptEnabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.xs, paddingLeft: SPACE.md }}>
                      <input
                        value={formPromptVariable}
                        onChange={(e) => setFormPromptVariable(e.target.value)}
                        placeholder="Variable"
                        style={formInput}
                      />
                      <input
                        value={formPromptTitle}
                        onChange={(e) => setFormPromptTitle(e.target.value)}
                        placeholder="Dialog title"
                        style={formInput}
                      />
                      <input
                        value={formPromptPlaceholder}
                        onChange={(e) => setFormPromptPlaceholder(e.target.value)}
                        placeholder="Placeholder text"
                        style={{ ...formInput, gridColumn: '1 / -1' }}
                      />
                      <span style={{ fontSize: TYPE.xs, color: 'var(--text-faintest)', gridColumn: '1 / -1' }}>
                        {'Use {{' + (formPromptVariable.trim() || 'VAR') + '}} in the command'}
                      </span>
                    </div>
                  )}

                  {/* Shortcut */}
                  <div style={{ display: 'flex', gap: SPACE.sm, alignItems: 'center' }}>
                    <span style={compactLabelStyle}>Shortcut</span>
                    <button
                      onClick={() => setRecordingKeybinding(true)}
                      style={{
                        ...btnReset,
                        fontSize: TYPE.xs,
                        fontFamily: FONT_MONO,
                        color: recordingKeybinding ? 'var(--accent)' : formKeybinding ? 'var(--text-secondary)' : 'var(--text-faintest)',
                        background: 'var(--bg)',
                        border: `1px solid ${recordingKeybinding ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        borderRadius: RADIUS.md,
                        padding: '2px 8px',
                        minWidth: 60,
                        textAlign: 'center',
                      }}
                    >
                      {recordingKeybinding ? 'Press key\u2026' : formKeybinding ? formatBinding(formKeybinding) : 'None'}
                    </button>
                    {formKeybinding && (
                      <button
                        onClick={() => { setFormKeybinding(null); setRecordingKeybinding(false) }}
                        style={{ ...btnReset, fontSize: TYPE.xs, color: 'var(--text-faintest)', padding: '0 4px' }}
                        title="Clear shortcut"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'flex-end', paddingTop: SPACE.xs, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={resetForm}
                  style={{ ...btnOutline, fontSize: TYPE.sm, padding: '4px 10px', color: 'var(--text-faint)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitForm}
                  style={{
                    ...btnPrimary,
                    fontSize: TYPE.sm,
                    padding: '4px 12px',
                    opacity: formMode === 'folder'
                      ? (!formLabel.trim() ? 0.4 : 1)
                      : (!formLabel.trim() || !formCommand.trim()) ? 0.4 : 1,
                    cursor: formMode === 'folder'
                      ? (!formLabel.trim() ? 'not-allowed' : 'pointer')
                      : (!formLabel.trim() || !formCommand.trim()) ? 'not-allowed' : 'pointer',
                  }}
                  disabled={formMode === 'folder' ? !formLabel.trim() : (!formLabel.trim() || !formCommand.trim())}
                >
                  {editId || editFolderId ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {buttons.length === 0 && folders.length === 0 && !showForm && (
            <div style={emptyState}>No buttons yet. Use the header icons to add buttons or folders.</div>
          )}

          {/* Ungrouped buttons */}
          {ungroupedButtons.length > 0 && (
            <div
              onDragOver={handleUngroupedZoneDragOver}
              onDragLeave={() => { if (dropTarget?.id === '__ungrouped__') setDropTarget(null) }}
              onDrop={handleUngroupedZoneDrop}
              style={{
                borderRadius: RADIUS.sm,
                background: dropTarget?.type === 'folder-zone' && dropTarget.id === '__ungrouped__'
                  ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                transition: 'background 0.1s',
              }}
            >
              {renderButtonGrid(ungroupedButtons, undefined)}
            </div>
          )}

          {/* Folders */}
          {folders.map((folder) => renderFolder(folder))}

          {/* Expanded Output */}
          {expandedId && (() => {
            const rs = runStates.current.get(expandedId) ?? defaultRunState()
            const btn = buttons.find((b) => b.id === expandedId)
            if (!btn) return null
            return (
              <div
                style={{
                  marginTop: SPACE.sm,
                  borderRadius: RADIUS.md,
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACE.xs,
                    padding: `${SPACE.xs}px ${SPACE.md}px`,
                    background: 'var(--elevated)',
                    fontSize: TYPE.xs,
                    color: 'var(--text-faint)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{btn.label}</span>
                  <span style={{ flex: 1 }} />
                  {rs.exitCode !== null && (
                    <span style={{ color: rs.exitCode === 0 ? '#4caf50' : '#f44336' }}>
                      exit {rs.exitCode}
                    </span>
                  )}
                  {rs.durationMs !== null && (
                    <span>{formatDuration(rs.durationMs)}</span>
                  )}
                  {rs.running && (
                    <button
                      onClick={() => handleKill(expandedId)}
                      style={{
                        ...btnReset,
                        fontSize: TYPE.xs,
                        color: '#f44336',
                        fontWeight: 600,
                      }}
                    >
                      Kill
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(null)}
                    style={{
                      ...btnReset,
                      fontSize: TYPE.xs,
                      color: 'var(--text-faintest)',
                    }}
                    title="Close output"
                  >
                    ✕
                  </button>
                </div>
                {rs.output ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: SPACE.md,
                      fontSize: TYPE.xs,
                      fontFamily: FONT_MONO,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: 200,
                      overflow: 'auto',
                      background: 'var(--bg)',
                    }}
                  >
                    {rs.output}
                  </pre>
                ) : (
                  <div style={{ ...emptyState, padding: SPACE.md }}>No output</div>
                )}
              </div>
            )
          })()}
        </div>

      {/* Pulse animation for running indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
