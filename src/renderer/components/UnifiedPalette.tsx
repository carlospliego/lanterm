import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { COMMANDS, resolveKeybindings, formatBinding } from '../../shared/keybindings'
import { focusRegistry, searchAllTerminals, type FindMatch, type RemoteFindMatch } from '../terminalRegistry'
import { useCombinedPlugins } from '../useExternalPlugins'
import { FONT_MONO, TYPE, RADIUS, SPACE } from '../designTokens'
import type { PaletteAction } from '../../shared/types'

type ResultItem =
  | { type: 'command'; action: PaletteAction }
  | { type: 'terminal'; match: FindMatch }
  | { type: 'history'; command: string }
  | { type: 'remoteTerminal'; match: RemoteFindMatch }

interface Props {
  executeCommand: (id: string) => void
}

export function UnifiedPalette({ executeCommand }: Props) {
  const {
    paletteOpen,
    paletteMode,
    closePalette,
    installedPlugins,
    settings,
    activeTerminalId,
    focusedPaneId,
    splitLayouts,
    openSettings,
    commandHistory,
    recordCommandUsage,
    terminals,
    setActiveTerminal,
  } = useAppStore()

  const combinedPlugins = useCombinedPlugins()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [terminalResults, setTerminalResults] = useState<FindMatch[]>([])
  const [remoteTerminalResults, setRemoteTerminalResults] = useState<RemoteFindMatch[]>([])
  const [shellHistory, setShellHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genRef = useRef(0)

  const bindings = useMemo(
    () => resolveKeybindings(settings.keybindings),
    [settings.keybindings]
  )

  // Build command actions (same logic as old CommandPalette)
  const actions = useMemo(() => {
    const result: PaletteAction[] = []

    for (const cmd of COMMANDS) {
      if (cmd.id === 'commandPalette') continue
      const binding = bindings[cmd.id]
      result.push({
        id: cmd.id,
        label: cmd.label,
        group: cmd.group,
        shortcut: binding ? formatBinding(binding) : undefined,
        execute: () => executeCommand(cmd.id),
      })
    }

    const pluginBindings = settings.pluginKeybindings ?? {}
    for (const plugin of combinedPlugins) {
      if (!installedPlugins.includes(plugin.id)) continue
      if (plugin.actions) {
        for (const action of plugin.actions()) {
          const binding = pluginBindings[action.id]
          result.push({
            ...action,
            shortcut: binding ? formatBinding(binding) : action.shortcut,
          })
        }
      }
    }

    const customCmds = settings.customCommands ?? []
    for (const cmd of customCmds) {
      result.push({
        id: `custom:${cmd.id}`,
        label: cmd.label,
        group: 'Custom Commands',
        execute: () => {
          const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
          const targetId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
          if (targetId) window.termAPI.ptyWrite(targetId, cmd.command + '\r')
        },
      })
    }

    result.push({
      id: 'custom:manage',
      label: 'Manage Custom Commands\u2026',
      group: 'Custom Commands',
      execute: () => openSettings('commands', 'customCommands'),
    })

    return result
  }, [bindings, installedPlugins, combinedPlugins, executeCommand, settings.customCommands, settings.pluginKeybindings, activeTerminalId, focusedPaneId, splitLayouts, openSettings])

  // Determine mode from query prefix
  const mode = useMemo(() => {
    if (query.startsWith('>')) return 'commands' as const
    if (query.startsWith('/')) return 'find' as const
    if (query.startsWith('!')) return 'history' as const
    return 'all' as const
  }, [query])

  const strippedQuery = useMemo(() => {
    if (mode === 'all') return query.trim()
    return query.slice(1).trim()
  }, [mode, query])

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (mode === 'find' || mode === 'history') return []

    const historyIndex = new Map(commandHistory.map((id, i) => [id, i]))

    if (!strippedQuery) {
      const recent = commandHistory
        .map(id => actions.find(a => a.id === id))
        .filter((a): a is PaletteAction => a != null)
      const recentIds = new Set(recent.map(a => a.id))
      const rest = actions.filter(a => !recentIds.has(a.id))
      return [...recent, ...rest]
    }

    const q = strippedQuery.toLowerCase()
    const matches = actions.filter(
      a => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    )
    matches.sort((a, b) => {
      const ai = historyIndex.get(a.id)
      const bi = historyIndex.get(b.id)
      if (ai != null && bi != null) return ai - bi
      if (ai != null) return -1
      if (bi != null) return 1
      return 0
    })
    return matches
  }, [actions, strippedQuery, commandHistory, mode])

  // Filter shell history
  const filteredShellHistory = useMemo(() => {
    if (mode === 'commands' || mode === 'find') return []
    if (!strippedQuery) return shellHistory.slice(0, 50)
    const q = strippedQuery.toLowerCase()
    return shellHistory.filter(h => h.toLowerCase().includes(q)).slice(0, 50)
  }, [shellHistory, strippedQuery, mode])

  // Terminal name lookup
  const terminalNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of terminals) map.set(t.id, t.title)
    return map
  }, [terminals])

  // Search terminals (debounced)
  const doTerminalSearch = useCallback((q: string) => {
    if (!q) {
      setTerminalResults([])
      setRemoteTerminalResults([])
      return
    }
    const gen = ++genRef.current
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (gen !== genRef.current) return
      const matches = searchAllTerminals(q, activeTerminalId)
      if (gen === genRef.current) setTerminalResults(matches)
      window.termAPI.searchOtherWindows(q).then(remote => {
        if (gen === genRef.current) setRemoteTerminalResults(remote)
      })
    }, 150)
  }, [activeTerminalId])

  // Trigger terminal search when query changes
  useEffect(() => {
    if (!paletteOpen) return
    if (mode === 'commands' || mode === 'history') {
      setTerminalResults([])
      setRemoteTerminalResults([])
      return
    }
    doTerminalSearch(strippedQuery)
  }, [paletteOpen, strippedQuery, mode, doTerminalSearch])

  // Filter terminal results for display (already searched, no extra filtering needed)
  const filteredTerminalResults = useMemo(() => {
    if (mode === 'commands' || mode === 'history') return []
    return terminalResults
  }, [terminalResults, mode])

  const filteredRemoteResults = useMemo(() => {
    if (mode === 'commands' || mode === 'history') return []
    return remoteTerminalResults
  }, [remoteTerminalResults, mode])

  // Build flat result list
  const flatResults = useMemo((): ResultItem[] => {
    const items: ResultItem[] = []
    for (const cmd of filteredCommands) items.push({ type: 'command', action: cmd })
    for (const m of filteredTerminalResults) items.push({ type: 'terminal', match: m })
    for (const m of filteredRemoteResults) items.push({ type: 'remoteTerminal', match: m })
    for (const h of filteredShellHistory) items.push({ type: 'history', command: h })
    return items
  }, [filteredCommands, filteredTerminalResults, filteredRemoteResults, filteredShellHistory])

  // Reset state when opened
  useEffect(() => {
    if (!paletteOpen) return
    genRef.current++
    setTerminalResults([])
    setRemoteTerminalResults([])
    setSelectedIndex(0)
    setShellHistory([])

    if (paletteMode === 'find') {
      setQuery('/')
    } else if (paletteMode === 'history') {
      setQuery('!')
    } else {
      setQuery('')
    }

    // Fetch shell history
    window.termAPI.historyRead().then(items => {
      setShellHistory(items)
    })

    setTimeout(() => inputRef.current?.focus(), 0)
  }, [paletteOpen, paletteMode])

  // Clamp selectedIndex when results change
  useEffect(() => {
    setSelectedIndex(i => Math.min(i, Math.max(0, flatResults.length - 1)))
  }, [flatResults.length])

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const runCommand = useCallback((action: PaletteAction) => {
    closePalette()
    recordCommandUsage(action.id)
    action.execute()
  }, [closePalette, recordCommandUsage])

  const goToTerminalResult = useCallback((match: FindMatch) => {
    closePalette()
    setActiveTerminal(match.terminalId)
    setTimeout(() => {
      const term = focusRegistry.get(match.terminalId)
      if (term) {
        term.scrollToLine(match.lineIndex)
        term.select(match.matchStart, match.lineIndex, match.matchLength)
        term.focus()
      }
    }, 50)
  }, [closePalette, setActiveTerminal])

  const goToRemoteTerminalResult = useCallback((match: RemoteFindMatch) => {
    closePalette()
    window.termAPI.focusTerminalResult(match.windowId, match.terminalId, match.lineIndex, match.matchStart, match.matchLength)
  }, [closePalette])

  const runShellHistory = useCallback((cmd: string) => {
    closePalette()
    const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
    const targetId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
    if (targetId) {
      window.termAPI.ptyWrite(targetId, cmd)
      focusRegistry.get(targetId)?.focus()
    }
  }, [closePalette, activeTerminalId, focusedPaneId, splitLayouts])

  const runResult = useCallback((item: ResultItem) => {
    switch (item.type) {
      case 'command': runCommand(item.action); break
      case 'terminal': goToTerminalResult(item.match); break
      case 'remoteTerminal': goToRemoteTerminalResult(item.match); break
      case 'history': runShellHistory(item.command); break
    }
  }, [runCommand, goToTerminalResult, goToRemoteTerminalResult, runShellHistory])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePalette()
      if (activeTerminalId) focusRegistry.get(activeTerminalId)?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % Math.max(1, flatResults.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + flatResults.length) % Math.max(1, flatResults.length))
    } else if (e.ctrlKey && e.key === 'r' && mode === 'history') {
      // Ctrl+R while in history mode cycles to next match
      e.preventDefault()
      if (flatResults.length > 0) {
        setSelectedIndex(i => (i + 1) % flatResults.length)
      }
    } else if (e.key === 'Enter' && flatResults.length > 0) {
      e.preventDefault()
      runResult(flatResults[selectedIndex])
    }
  }, [closePalette, activeTerminalId, flatResults, selectedIndex, runResult, mode])

  if (!paletteOpen) return null

  // Build grouped rows for rendering
  const rows: React.ReactNode[] = []
  let flatIdx = 0

  // Group commands
  if (filteredCommands.length > 0) {
    const groupMap = new Map<string, { action: PaletteAction; idx: number }[]>()
    const groupOrder: string[] = []
    const recentIds = new Set(commandHistory)
    const isEmptyQuery = !strippedQuery

    for (const action of filteredCommands) {
      const group = isEmptyQuery && recentIds.has(action.id) ? 'Recent' : action.group
      let arr = groupMap.get(group)
      if (!arr) {
        arr = []
        groupMap.set(group, arr)
        groupOrder.push(group)
      }
      arr.push({ action, idx: flatIdx })
      flatIdx++
    }

    for (const group of groupOrder) {
      rows.push(
        <div key={`cmd-header-${group}`} style={sectionHeaderStyle}>
          {group}
        </div>
      )
      for (const { action, idx } of groupMap.get(group)!) {
        const isSelected = idx === selectedIndex
        rows.push(
          <div
            key={`cmd-${action.id}`}
            data-idx={idx}
            onClick={() => runCommand(action)}
            onMouseEnter={() => setSelectedIndex(idx)}
            style={{
              ...rowBaseStyle,
              background: isSelected ? 'var(--elevated)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{action.label}</span>
            {action.shortcut && (
              <kbd style={kbdStyle}>
                {action.shortcut}
              </kbd>
            )}
          </div>
        )
      }
    }
  }

  // Group terminal results by terminal
  if (filteredTerminalResults.length > 0) {
    const termGroups = new Map<string, FindMatch[]>()
    const termOrder: string[] = []
    for (const m of filteredTerminalResults) {
      let arr = termGroups.get(m.terminalId)
      if (!arr) {
        arr = []
        termGroups.set(m.terminalId, arr)
        termOrder.push(m.terminalId)
      }
      arr.push(m)
    }

    for (const tid of termOrder) {
      const name = terminalNames.get(tid) ?? 'Terminal'
      const isCurrent = tid === activeTerminalId
      rows.push(
        <div
          key={`term-header-${tid}`}
          style={{
            ...sectionHeaderStyle,
            color: isCurrent ? 'var(--accent)' : 'var(--text-faintest)',
          }}
        >
          {name}{isCurrent ? ' (current)' : ''}
        </div>
      )
      for (const match of termGroups.get(tid)!) {
        const idx = flatIdx
        const isSelected = idx === selectedIndex
        const before = match.lineText.slice(0, match.matchStart)
        const matched = match.lineText.slice(match.matchStart, match.matchStart + match.matchLength)
        const after = match.lineText.slice(match.matchStart + match.matchLength)
        rows.push(
          <div
            key={`term-${match.terminalId}-${match.lineIndex}-${match.matchStart}`}
            data-idx={idx}
            onClick={() => goToTerminalResult(match)}
            onMouseEnter={() => setSelectedIndex(idx)}
            style={{
              ...rowBaseStyle,
              background: isSelected ? 'var(--elevated)' : 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {before}
            <span style={{
              color: 'var(--accent)',
              background: 'var(--accent-dim)',
              borderRadius: RADIUS.sm,
              padding: '0 1px',
            }}>
              {matched}
            </span>
            {after}
          </div>
        )
        flatIdx++
      }
    }
  }

  // Remote terminal results (other windows)
  if (filteredRemoteResults.length > 0) {
    const remoteGroups = new Map<string, RemoteFindMatch[]>()
    const remoteOrder: string[] = []
    for (const m of filteredRemoteResults) {
      const key = `${m.windowId}:${m.terminalId}`
      let arr = remoteGroups.get(key)
      if (!arr) {
        arr = []
        remoteGroups.set(key, arr)
        remoteOrder.push(key)
      }
      arr.push(m)
    }

    for (const key of remoteOrder) {
      const matches = remoteGroups.get(key)!
      const first = matches[0]
      rows.push(
        <div
          key={`remote-header-${key}`}
          style={{
            ...sectionHeaderStyle,
            color: 'var(--text-faintest)',
          }}
        >
          {first.terminalTitle} (other window)
        </div>
      )
      for (const match of matches) {
        const idx = flatIdx
        const isSelected = idx === selectedIndex
        const before = match.lineText.slice(0, match.matchStart)
        const matched = match.lineText.slice(match.matchStart, match.matchStart + match.matchLength)
        const after = match.lineText.slice(match.matchStart + match.matchLength)
        rows.push(
          <div
            key={`remote-${match.windowId}-${match.terminalId}-${match.lineIndex}-${match.matchStart}`}
            data-idx={idx}
            onClick={() => goToRemoteTerminalResult(match)}
            onMouseEnter={() => setSelectedIndex(idx)}
            style={{
              ...rowBaseStyle,
              background: isSelected ? 'var(--elevated)' : 'transparent',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {before}
            <span style={{
              color: 'var(--accent)',
              background: 'var(--accent-dim)',
              borderRadius: RADIUS.sm,
              padding: '0 1px',
            }}>
              {matched}
            </span>
            {after}
          </div>
        )
        flatIdx++
      }
    }
  }

  // Shell history results
  if (filteredShellHistory.length > 0) {
    rows.push(
      <div key="history-header" style={sectionHeaderStyle}>
        Shell History
      </div>
    )
    for (const cmd of filteredShellHistory) {
      const idx = flatIdx
      const isSelected = idx === selectedIndex
      rows.push(
        <div
          key={`hist-${idx}`}
          data-idx={idx}
          onClick={() => runShellHistory(cmd)}
          onMouseEnter={() => setSelectedIndex(idx)}
          style={{
            ...rowBaseStyle,
            background: isSelected ? 'var(--elevated)' : 'transparent',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ color: 'var(--text-faintest)', marginRight: 6 }}>$</span>
          {cmd}
        </div>
      )
      flatIdx++
    }
  }

  const placeholder = mode === 'commands'
    ? 'Type a command...'
    : mode === 'find'
      ? 'Find in terminals...'
      : mode === 'history'
        ? 'Search shell history...'
        : 'Search commands, terminals, history...'

  const hasResults = flatResults.length > 0
  const noResults = strippedQuery && flatResults.length === 0

  return (
    <div
      data-testid="command-palette"
      data-tour="command-palette"
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
      onMouseDown={e => {
        if (e.target === e.currentTarget) closePalette()
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
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '60vh',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            background: 'var(--elevated)',
            border: 'none',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: FONT_MONO,
            fontSize: TYPE.xl,
            outline: 'none',
            padding: '12px 14px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        {hasResults && (
          <div
            ref={listRef}
            style={{
              overflowY: 'auto',
              padding: `${SPACE.xs}px 0`,
              flex: 1,
              minHeight: 0,
            }}
          >
            {rows}
          </div>
        )}
        {noResults && (
          <div style={{
            padding: '16px 14px',
            fontSize: TYPE.body,
            fontFamily: FONT_MONO,
            color: 'var(--text-faintest)',
            textAlign: 'center',
          }}>
            No results found
          </div>
        )}
        <div style={{
          padding: '6px 12px',
          fontSize: TYPE.xs,
          fontFamily: FONT_MONO,
          color: 'var(--text-faintest)',
          borderTop: (hasResults || noResults) ? '1px solid var(--border-subtle)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: SPACE.md,
          userSelect: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <kbd style={prefixKbdStyle}>{'>'}</kbd> commands
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <kbd style={prefixKbdStyle}>/</kbd> terminals
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <kbd style={prefixKbdStyle}>!</kbd> history
            </span>
          </div>
          <span style={{ opacity: 0.7 }}>
            {'\u2191\u2193 navigate \u00b7 \u21b5 run \u00b7 esc close'}
          </span>
        </div>
      </div>
    </div>
  )
}

const sectionHeaderStyle: React.CSSProperties = {
  padding: '6px 12px 3px',
  fontSize: TYPE.xs,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faintest)',
  fontFamily: FONT_MONO,
  userSelect: 'none',
}

const rowBaseStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: TYPE.body,
  fontFamily: FONT_MONO,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  borderRadius: RADIUS.sm,
  margin: '0 4px',
  lineHeight: 1.6,
}

const kbdStyle: React.CSSProperties = {
  background: 'var(--elevated)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-faint)',
  fontSize: TYPE.xs,
  padding: '1px 6px',
  marginLeft: 8,
  flexShrink: 0,
}

const prefixKbdStyle: React.CSSProperties = {
  background: 'var(--elevated)',
  border: '1px solid var(--border)',
  borderRadius: RADIUS.sm,
  color: 'var(--accent)',
  fontSize: TYPE.xs,
  fontWeight: 600,
  padding: '0 5px',
  lineHeight: '16px',
  minWidth: 14,
  textAlign: 'center',
}
