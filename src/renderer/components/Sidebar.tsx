import React, { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '../store/useAppStore'
import { FONT_UI, FONT_MONO, TYPE, RADIUS, SPACE } from '../designTokens'
import { FolderSettingsPopup } from './FolderSettingsPopup'
import { TerminalSettingsPopup } from './TerminalSettingsPopup'
import { IconDisplay } from './IconDisplay'
import { KebabMenu } from './KebabMenu'
import { formatBinding, resolveKeybindings } from '../../shared/keybindings'
import type { Folder, TerminalSession, SplitLayout } from '../../shared/types'
import { useWorktreeTerminals, type WorktreeInfo } from '../worktreeTracker'

function StatusDot() {
  return (
    <span style={{
      color: 'var(--status-running)',
      fontSize: 7,
      opacity: 0.8,
      flexShrink: 0,
    }}>●</span>
  )
}

function WorktreeBadge() {
  return (
    <span title="Git worktree" style={{ flexShrink: 0 }}>
      <i className="fa-solid fa-code-branch" style={{ fontSize: 9, color: 'var(--text-faintest)', lineHeight: 1 }} />
    </span>
  )
}

function InlineRenameInput({ value, onCommit, onCancel }: { value: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={e => {
        if (e.key === 'Enter') onCommit(text)
        if (e.key === 'Escape') onCancel()
      }}
      onClick={e => e.stopPropagation()}
      style={{
        flex: 1,
        background: 'var(--input-bg)',
        border: '1px solid var(--text-faintest)',
        borderRadius: 2,
        color: 'var(--text-primary)',
        fontSize: 13,
        fontFamily: FONT_MONO,
        padding: '0 4px',
        outline: 'none',
        minWidth: 0,
      }}
    />
  )
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 220,
    minWidth: 220,
    height: '100%',
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    userSelect: 'none' as const,
    fontFamily: FONT_UI,
  },
  header: {
    padding: '32px 12px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    WebkitAppRegion: 'drag',
  },
  appTitle: {
    color: 'var(--text-dim)',
    fontSize: 13,
    fontFamily: FONT_MONO,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  addFolderBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-faint)',
    cursor: 'pointer',
    fontSize: 24,
    lineHeight: 1,
    padding: '0 2px',
    WebkitAppRegion: 'no-drag',
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-faintest)',
    cursor: 'pointer',
    fontSize: 16,
    lineHeight: 1,
    padding: '0 4px',
    WebkitAppRegion: 'no-drag',
  },
  folders: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  folderSection: {
    marginBottom: 2,
  },
  folderHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '11px 14px 11px',
    cursor: 'grab',
    color: 'var(--text-dim)',
    fontSize: 13,
    fontFamily: 'inherit',
    gap: 6,
    borderRadius: 3,
    margin: '8px 0 2px',
  },
  folderName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  folderAddBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-faintest)',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    padding: '0 2px',
    opacity: 0,
    transition: 'opacity 0.1s',
  },
  termItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '11px 8px 11px 16px',
    color: 'var(--text-dim)',
    fontSize: 13,
    fontFamily: 'inherit',
    cursor: 'grab',
    borderRadius: 0,
    margin: '0',
    transition: 'background 0.1s ease, color 0.1s ease',
    userSelect: 'none' as const,
    overflow: 'hidden',
  },
  termItemActive: {
    background: 'var(--selection-bg)',
    color: 'var(--text-primary)',
  },
  termTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-faintest)',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    padding: '0 2px',
    opacity: 0,
    transition: 'opacity 0.1s',
    flexShrink: 0,
  },
  folderNameInput: {
    flex: 1,
    background: 'var(--input-bg)',
    border: '1px solid var(--text-faintest)',
    borderRadius: 2,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: FONT_MONO,
    padding: '0 4px',
    outline: 'none',
    minWidth: 0,
  },
  dropLine: {
    height: 2,
    background: 'var(--accent)',
    borderRadius: 1,
    margin: '0 8px',
  },
  sidebarNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: FONT_UI,
    padding: '10px 14px',
    textAlign: 'left' as const,
  },
}

type DragPayload = { type: 'terminal'; id: string } | { type: 'folder'; id: string } | { type: 'split'; leftId: string; rightId: string }

interface FolderRowProps {
  folder: Folder
  terminals: TerminalSession[]
  childFolders: React.ReactNode
  depth: number
  activeTerminalId: string | null
  activeFolderId: string | null
  onSelectFolder: (folderId: string) => void
  // Visual drag state
  isDropIntoTarget: boolean
  insertBefore: boolean
  insertAfter: boolean
  // Folder drag callbacks
  onFolderDragStart: (e: React.DragEvent) => void
  onFolderDragEnd: (e: React.DragEvent) => void
  onFolderSectionDragOver: (e: React.DragEvent) => void
  onFolderSectionDragLeave: (e: React.DragEvent) => void
  onFolderSectionDrop: (e: React.DragEvent) => void
  // Terminal drag callbacks
  onTerminalDragStart: (e: React.DragEvent, terminalId: string) => void
  onTerminalDragEnd: (e: React.DragEvent) => void
  onTerminalItemDragOver: (e: React.DragEvent, terminalId: string) => void
  onTerminalItemDrop: (e: React.DragEvent, terminalId: string) => void
  termDropTarget: { kind: 'before' | 'after'; terminalId: string } | null
  // Split-aware
  splitLayouts: SplitLayout[]
  focusedPaneId: string | null
  onFocusPane: (id: string) => void
  onSplitDragStart: (e: React.DragEvent, leftId: string, rightId: string) => void
  // Existing
  onAddTerminal: (folderId: string) => void
  onSelectTerminal: (id: string) => void
  onCloseTerminal: (id: string) => void
  onDeleteFolder: (folderId: string) => void
  onOpenIconPicker: (target: { type: 'folder' | 'terminal'; id: string }) => void
  runningChildIds: Set<string>
  folderHasRunning: boolean
  favoriteIds: string[]
  toggleFavorite: (id: string) => void
  lastActiveTerminalByFolder: Record<string, string>
  editingId: string | null
  onStartRename: (id: string) => void
  onCommitRename: (id: string, newName: string) => void
  onCancelRename: () => void
  onDuplicateTerminal: (id: string) => void
  onDuplicateFolder: (folderId: string) => void
  onSplitTerminal: (id: string) => void
  shortcuts: Record<string, string>
  worktreeTerminalIds: Map<string, WorktreeInfo>
}

function FolderRow({
  folder, terminals, childFolders, depth, activeTerminalId, activeFolderId, onSelectFolder,
  isDropIntoTarget, insertBefore, insertAfter,
  onFolderDragStart, onFolderDragEnd,
  onFolderSectionDragOver, onFolderSectionDragLeave, onFolderSectionDrop,
  onTerminalDragStart, onTerminalDragEnd,
  onTerminalItemDragOver, onTerminalItemDrop, termDropTarget,
  splitLayouts, focusedPaneId, onFocusPane, onSplitDragStart,
  onAddTerminal, onSelectTerminal, onCloseTerminal,
  onDeleteFolder, onOpenIconPicker,
  runningChildIds,
  folderHasRunning,
  favoriteIds, toggleFavorite,
  lastActiveTerminalByFolder,
  editingId, onStartRename, onCommitRename, onCancelRename,
  onDuplicateTerminal, onDuplicateFolder,
  onSplitTerminal,
  shortcuts,
  worktreeTerminalIds,
}: FolderRowProps) {
  const collapsed = useAppStore(s => s.collapsedFolderIds.includes(folder.id))
  const toggleFolderCollapsed = useAppStore(s => s.toggleFolderCollapsed)
  const [hovered, setHovered] = useState(false)
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null)
  const isFolderActive = activeFolderId === folder.id || terminals.some(t => t.id === activeTerminalId)

  return (
    <div
      style={styles.folderSection}
      onDragOver={onFolderSectionDragOver}
      onDragLeave={onFolderSectionDragLeave}
      onDrop={onFolderSectionDrop}
    >
      {insertBefore && <div style={styles.dropLine} />}

      <div
        style={{
          ...styles.folderHeader,
          paddingLeft: 12 + depth * 24,
          paddingRight: 8,
          background: isDropIntoTarget ? 'var(--elevated)' : activeFolderId === folder.id ? 'var(--selection-bg)' : hovered ? 'var(--hover-bg)' : 'transparent',
          borderLeft: folder.worktreePath ? '2px solid var(--accent)' : undefined,
        }}
        draggable
        onDragStart={onFolderDragStart}
        onDragEnd={onFolderDragEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          toggleFolderCollapsed(folder.id)
          onSelectFolder(folder.id)
        }}
        onContextMenu={e => { e.preventDefault(); onOpenIconPicker({ type: 'folder', id: folder.id }) }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-faintest)' }}>{collapsed ? '▶' : '▼'}</span>
        {folderHasRunning ? <StatusDot /> : null}
        {folder.icon && (
          <span
            style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); onOpenIconPicker({ type: 'folder', id: folder.id }) }}
          ><IconDisplay icon={folder.icon} /></span>
        )}
        {editingId === folder.id
          ? <InlineRenameInput value={folder.name} onCommit={v => onCommitRename(folder.id, v)} onCancel={onCancelRename} />
          : <span style={styles.folderName}>{folder.name}</span>}
        {folder.worktreePath && <WorktreeBadge />}
        <KebabMenu items={[
          { label: 'Create Terminal', icon: 'fa:fa-solid fa-plus', onClick: () => onAddTerminal(folder.id) },
          { separator: true },
          { label: favoriteIds.includes(folder.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(folder.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(folder.id) },
          { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => onDuplicateFolder(folder.id) },
          { separator: true },
          { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => onStartRename(folder.id), shortcut: shortcuts.renameTerminal },
          { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => onDeleteFolder(folder.id), shortcut: shortcuts.closeTerminal },
          { separator: true },
          { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => onOpenIconPicker({ type: 'folder', id: folder.id }) },
        ]} />
      </div>

      {!collapsed && terminals.map(term => {
        const splitForTerm = splitLayouts.find(sl => sl.leftId === term.id || sl.rightId === term.id)
        // Right pane is rendered inside the left pane's combined row
        if (splitForTerm && term.id === splitForTerm.rightId) return null
        const rightTerm = splitForTerm?.leftId === term.id
          ? terminals.find(t => t.id === splitForTerm!.rightId) : null

        if (rightTerm) {
          const isRowActive = term.id === activeTerminalId || rightTerm.id === activeTerminalId
          return (
            <React.Fragment key={term.id}>
              {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'before' && <div style={styles.dropLine} />}
              <div
                data-testid="terminal-entry"
                draggable
                style={{
                  display: 'flex',
                  margin: 0,
                  paddingLeft: 22 + (depth + 1) * 24,
                  borderRadius: 0,
                  background: isRowActive ? 'var(--selection-bg)' : 'var(--subtle-bg)',
                  overflow: 'hidden',
                  alignItems: 'stretch',
                  border: 'none',
                  cursor: 'grab',
                }}
                onDragStart={e => onSplitDragStart(e, term.id, rightTerm.id)}
                onDragEnd={onTerminalDragEnd}
                onDragOver={e => onTerminalItemDragOver(e, term.id)}
                onDrop={e => onTerminalItemDrop(e, term.id)}
              >
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '9px 6px 9px 10px',
                    cursor: 'pointer',
                    color: focusedPaneId === term.id ? 'var(--text-primary)' : 'var(--text-dim)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    minWidth: 0,
                  }}
                  onClick={() => { onFocusPane(term.id); onSelectTerminal(term.id) }}
                  onContextMenu={e => { e.preventDefault(); onOpenIconPicker({ type: 'terminal', id: term.id }) }}
                >
                  {term.icon
                    ? <span style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onOpenIconPicker({ type: 'terminal', id: term.id }) }}><IconDisplay icon={term.icon} /></span>
                    : runningChildIds.has(term.id)
                        ? <StatusDot />
                        : <span style={{ color: 'var(--text-faintest)', fontSize: 9, flexShrink: 0 }}>⊟</span>}
                  {term.icon && runningChildIds.has(term.id) && <StatusDot />}
                  {editingId === term.id
                    ? <InlineRenameInput value={term.title} onCommit={v => onCommitRename(term.id, v)} onCancel={onCancelRename} />
                    : <span style={styles.termTitle}>{term.title}</span>}
                  {worktreeTerminalIds.has(term.id) && <WorktreeBadge />}
                  <KebabMenu items={[
                    { label: favoriteIds.includes(term.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(term.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(term.id) },
                    { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => onDuplicateTerminal(term.id), shortcut: shortcuts.duplicateTerminal },
                    { separator: true },
                    { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => onStartRename(term.id), shortcut: shortcuts.renameTerminal },
                    { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => onCloseTerminal(term.id), shortcut: shortcuts.closeTerminal },
                    { separator: true },
                    { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => onOpenIconPicker({ type: 'terminal', id: term.id }) },
                  ]} />
                </div>
                <div style={{ width: 1, background: 'var(--border-subtle)', flexShrink: 0 }} />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '9px 6px 9px 8px',
                    cursor: 'pointer',
                    color: focusedPaneId === rightTerm.id ? 'var(--text-primary)' : 'var(--text-dim)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    minWidth: 0,
                  }}
                  onClick={() => { onFocusPane(rightTerm.id); onSelectTerminal(rightTerm.id) }}
                  onContextMenu={e => { e.preventDefault(); onOpenIconPicker({ type: 'terminal', id: rightTerm.id }) }}
                >
                  {rightTerm.icon
                    ? <span style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onOpenIconPicker({ type: 'terminal', id: rightTerm.id }) }}><IconDisplay icon={rightTerm.icon} /></span>
                    : runningChildIds.has(rightTerm.id)
                        ? <StatusDot />
                        : null}
                  {rightTerm.icon && runningChildIds.has(rightTerm.id) && <StatusDot />}
                  {editingId === rightTerm.id
                    ? <InlineRenameInput value={rightTerm.title} onCommit={v => onCommitRename(rightTerm.id, v)} onCancel={onCancelRename} />
                    : <span style={styles.termTitle}>{rightTerm.title}</span>}
                  {worktreeTerminalIds.has(rightTerm.id) && <WorktreeBadge />}
                  <KebabMenu items={[
                    { label: favoriteIds.includes(rightTerm.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(rightTerm.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(rightTerm.id) },
                    { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => onDuplicateTerminal(rightTerm.id), shortcut: shortcuts.duplicateTerminal },
                    { separator: true },
                    { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => onStartRename(rightTerm.id), shortcut: shortcuts.renameTerminal },
                    { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => onCloseTerminal(rightTerm.id), shortcut: shortcuts.closeTerminal },
                    { separator: true },
                    { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => onOpenIconPicker({ type: 'terminal', id: rightTerm.id }) },
                  ]} />
                </div>
              </div>
              {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'after' && <div style={styles.dropLine} />}
            </React.Fragment>
          )
        }

        const isActive = term.id === activeTerminalId
        return (
          <React.Fragment key={term.id}>
            {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'before' && <div style={styles.dropLine} />}
            <div
              data-testid="terminal-entry"
              draggable
              style={{
                ...styles.termItem,
                paddingLeft: 22 + (depth + 1) * 24,
                ...(isActive ? styles.termItemActive : {}),
                ...(!isActive && hoveredTerm === term.id ? { background: 'var(--hover-bg)' } : {}),
              }}
              onDragStart={e => onTerminalDragStart(e, term.id)}
              onDragEnd={onTerminalDragEnd}
              onDragOver={e => onTerminalItemDragOver(e, term.id)}
              onDrop={e => onTerminalItemDrop(e, term.id)}
              onClick={() => onSelectTerminal(term.id)}
              onContextMenu={e => { e.preventDefault(); onOpenIconPicker({ type: 'terminal', id: term.id }) }}
              onMouseEnter={() => setHoveredTerm(term.id)}
              onMouseLeave={() => setHoveredTerm(null)}
            >
              {term.icon
                ? <span style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onOpenIconPicker({ type: 'terminal', id: term.id }) }}><IconDisplay icon={term.icon} /></span>
                : runningChildIds.has(term.id)
                    ? <StatusDot />
                    : <span style={{ color: 'var(--text-faintest)', fontSize: 10, flexShrink: 0 }}>›</span>}
              {term.icon && runningChildIds.has(term.id) && <StatusDot />}
              {editingId === term.id
                ? <InlineRenameInput value={term.title} onCommit={v => onCommitRename(term.id, v)} onCancel={onCancelRename} />
                : <span style={styles.termTitle}>{term.title}</span>}
              {worktreeTerminalIds.has(term.id) && <WorktreeBadge />}
              <KebabMenu items={[
                { label: favoriteIds.includes(term.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(term.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(term.id) },
                { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => onDuplicateTerminal(term.id), shortcut: shortcuts.duplicateTerminal },
                ...(!splitLayouts.some(sl => sl.leftId === term.id || sl.rightId === term.id)
                  ? [{ label: 'Split', icon: 'fa:fa-solid fa-columns', onClick: () => onSplitTerminal(term.id), shortcut: shortcuts.splitPane }]
                  : []) as { label: string; onClick: () => void; icon?: string; shortcut?: string }[],
                { separator: true },
                { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => onStartRename(term.id), shortcut: shortcuts.renameTerminal },
                { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => onCloseTerminal(term.id), shortcut: shortcuts.closeTerminal },
                { separator: true },
                { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => onOpenIconPicker({ type: 'terminal', id: term.id }) },
              ]} />
            </div>
            {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'after' && <div style={styles.dropLine} />}
          </React.Fragment>
        )
      })}

      {!collapsed && childFolders}

      {insertAfter && <div style={styles.dropLine} />}
    </div>
  )
}

export function Sidebar({ side = 'left', width }: { side?: 'left' | 'right'; width?: number }) {
  const {
    folders,
    terminals,
    activeTerminalId,
    splitLayouts,
    splitTerminal,
    focusedPaneId,
    setFocusedPane,
    addFolder,
    removeFolder,
    addTerminal,
    removeTerminal,
    setActiveTerminal,
    reorderFolder,
    nestFolder,
    moveTerminalToFolder,
    moveTerminalPairToFolder,
    reorderTerminal,
    reorderTerminalPair,
    openSettings,
    favoriteIds,
    toggleFavorite,
    renameFolder,
    updateTitle,
    moveToTrash,
    openTrash,
    openPalette,
    lastActiveTerminalByFolder,
    createTerminal,
    toggleSidebar,
    activeFolderId,
    setActiveFolder,
  } = useAppStore()

  const worktreeTerminalIds = useWorktreeTerminals()

  const openNewMenu = useAppStore(s => s.openNewMenu)

  const [hoveredStandaloneTerm, setHoveredStandaloneTerm] = useState<string | null>(null)
  const [standaloneDropHover, setStandaloneDropHover] = useState(false)
  const [termDropTarget, setTermDropTarget] = useState<{ kind: 'before' | 'after'; terminalId: string } | null>(null)
  const [iconPickerTarget, setIconPickerTarget] = useState<{ type: 'folder' | 'terminal'; id: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [favCollapsed, setFavCollapsed] = useState(false)

  // Listen for rename command from keyboard shortcut
  useEffect(() => {
    const handler = () => {
      const { activeFolderId: fid, activeTerminalId: tid } = useAppStore.getState()
      const id = fid ?? tid
      if (id) setEditingId(id)
    }
    window.addEventListener('rename-active-terminal', handler)
    return () => window.removeEventListener('rename-active-terminal', handler)
  }, [])

  // Listen for duplicate-folder command from keyboard shortcut
  useEffect(() => {
    const handler = (e: Event) => {
      const folderId = (e as CustomEvent).detail as string
      if (folderId) handleDuplicateFolder(folderId)
    }
    window.addEventListener('duplicate-active-folder', handler)
    return () => window.removeEventListener('duplicate-active-folder', handler)
  }, [folders, terminals])

  const [runningChildren, setRunningChildren] = useState<Set<string>>(new Set())
  const activeTerminalIdRef = useRef(activeTerminalId)
  useEffect(() => { activeTerminalIdRef.current = activeTerminalId }, [activeTerminalId])
  const splitLayoutsRef = useRef(splitLayouts)
  useEffect(() => { splitLayoutsRef.current = splitLayouts }, [splitLayouts])
  const terminalsRef = useRef(terminals)
  useEffect(() => { terminalsRef.current = terminals }, [terminals])

  // Poll for green dot (running child process)
  useEffect(() => {
    async function checkAll() {
      const results = await Promise.all(
        terminalsRef.current.map(t =>
          window.termAPI.ptyHasRunningChild(t.id)
            .then(running => ({ id: t.id, running }))
            .catch(() => ({ id: t.id, running: false }))
        )
      )
      setRunningChildren(new Set(results.filter(r => r.running).map(r => r.id)))
    }
    checkAll()
    const interval = setInterval(checkAll, 2000)
    return () => clearInterval(interval)
  }, [])

  // --- Drag state ---
  const dragPayload = useRef<DragPayload | null>(null)
  type DropTarget = { kind: 'before' | 'after' | 'into'; folderId: string } | null
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)

  function clearDragState() {
    dragPayload.current = null
    setDropTarget(null)
    setTermDropTarget(null)
    setStandaloneDropHover(false)
  }

  // --- Folder drag handlers (called per-folder row) ---
  function getFolderDepth(folderId: string): number {
    let depth = 0
    let current = folders.find(f => f.id === folderId)
    while (current?.parentId) {
      depth++
      current = folders.find(f => f.id === current!.parentId)
    }
    return depth
  }

  function makeFolderDragStart(folderId: string) {
    return (e: React.DragEvent) => {
      dragPayload.current = { type: 'folder', id: folderId }
      e.dataTransfer.effectAllowed = 'move'
      // Prevent the drag image from being the entire folder section
      e.stopPropagation()
    }
  }

  function makeFolderSectionDragOver(folderId: string) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const payload = dragPayload.current
      if (!payload) return

      setTermDropTarget(null)
      if (payload.type === 'folder') {
        if (payload.id === folderId) { setDropTarget(null); return }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const y = e.clientY - rect.top
        const canNest = getFolderDepth(folderId) < 1
        const kind = y < 8 ? 'before' : y > rect.height - 8 ? 'after' : canNest ? 'into' : 'before'
        setDropTarget({ kind, folderId })
      } else if (payload.type === 'terminal' || payload.type === 'split') {
        setDropTarget({ kind: 'into', folderId })
      }
    }
  }

  function makeFolderSectionDragLeave(folderId: string) {
    return (e: React.DragEvent) => {
      const related = e.relatedTarget as Node | null
      if (related && (e.currentTarget as HTMLElement).contains(related)) return
      if (dropTarget?.folderId === folderId) setDropTarget(null)
    }
  }

  function makeFolderSectionDrop(folderId: string) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const payload = dragPayload.current
      if (!payload || dropTarget?.folderId !== folderId) { clearDragState(); return }

      if (payload.type === 'folder') {
        if (dropTarget.kind === 'before' || dropTarget.kind === 'after') {
          reorderFolder(payload.id, folderId, dropTarget.kind === 'before')
        } else if (getFolderDepth(folderId) < 1) {
          nestFolder(payload.id, folderId)
        }
      } else if (payload.type === 'terminal') {
        moveTerminalToFolder(payload.id, folderId)
      } else if (payload.type === 'split') {
        if (dropTarget.kind === 'into') {
          moveTerminalPairToFolder(payload.leftId, payload.rightId, folderId)
        }
      }
      clearDragState()
    }
  }

  // --- Terminal drag handlers ---
  function makeTerminalDragStart(terminalId: string) {
    return (e: React.DragEvent) => {
      dragPayload.current = { type: 'terminal', id: terminalId }
      e.dataTransfer.effectAllowed = 'move'
      e.stopPropagation()
    }
  }

  function handleTerminalDragEnd() { clearDragState() }
  function handleFolderDragEnd() { clearDragState() }

  function handleTerminalItemDragOver(e: React.DragEvent, terminalId: string) {
    const payload = dragPayload.current
    if (!payload || payload.type === 'folder') return
    const dragId = payload.type === 'split' ? payload.leftId : payload.id
    const dragAltId = payload.type === 'split' ? payload.rightId : null
    if (dragId === terminalId || dragAltId === terminalId) return
    e.preventDefault()
    e.stopPropagation()
    setStandaloneDropHover(false)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const kind = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after'
    setTermDropTarget({ kind, terminalId })
  }

  function handleTerminalItemDrop(e: React.DragEvent, terminalId: string) {
    e.preventDefault()
    e.stopPropagation()
    const payload = dragPayload.current
    if (termDropTarget?.terminalId === terminalId) {
      if (payload?.type === 'terminal') {
        reorderTerminal(payload.id, terminalId, termDropTarget.kind === 'before')
      } else if (payload?.type === 'split') {
        reorderTerminalPair(payload.leftId, payload.rightId, terminalId, termDropTarget.kind === 'before')
      }
    }
    clearDragState()
  }

  // --- Folder CRUD ---
  const settings = useAppStore(s => s.settings)
  const kb = resolveKeybindings(settings.keybindings)
  const shortcuts = {
    newTerminal: formatBinding(kb.newTerminal),
    closeTerminal: formatBinding(kb.closeTerminal),
    newFolder: formatBinding(kb.newFolder),
    duplicateTerminal: formatBinding(kb.duplicateTerminal),
    openSettings: formatBinding(kb.openSettings),
    findInTerminal: formatBinding(kb.findInTerminal),
    splitPane: formatBinding(kb.splitPane),
    newWindow: formatBinding(kb.newWindow),
    renameTerminal: formatBinding(kb.renameTerminal),
  }

  // When a folder page is active, no terminal should appear selected
  const effectiveActiveTerminalId = activeFolderId ? null : activeTerminalId

  function handleAddTerminal(folderId: string) {
    const folder = folders.find(f => f.id === folderId)
    const folderTerminals = terminals.filter(t => t.folderId === folderId)
    const cwd = folder?.defaultCwd || settings.defaultDirectory || (folderTerminals.length > 0
      ? folderTerminals[folderTerminals.length - 1].cwd
      : window.termAPI.homedir)

    const id = uuidv4()
    addTerminal({
      id, folderId,
      title: `Terminal ${folderTerminals.length + 1}`,
      cwd,
      order: folderTerminals.length,
      scrollback: '',
      icon: folder?.defaultTerminalIcon ?? 'fa:fa-solid fa-terminal',
      terminalTheme: folder?.defaultTerminalTheme,
      fontSize: folder?.defaultFontSize,
    })
    setActiveTerminal(id)
  }

  function handleCloseTerminal(id: string) {
    removeTerminal(id)
    window.termAPI.ptyKill(id)
  }

  function handleAddTerminalTopLevel() {
    createTerminal()
  }

  function collectDescendantTerminals(folderId: string): TerminalSession[] {
    const result: TerminalSession[] = []
    const queue = [folderId]
    while (queue.length) {
      const cur = queue.pop()!
      result.push(...terminals.filter(t => t.folderId === cur))
      folders.filter(f => f.parentId === cur).forEach(f => queue.push(f.id))
    }
    return result
  }

  function handleDeleteFolder(folderId: string) {
    const affected = collectDescendantTerminals(folderId)
    if (affected.length > 0) {
      const confirmed = window.confirm(
        `Delete folder "${folders.find(f => f.id === folderId)?.name}"?\n\nThis will close ${affected.length} terminal${affected.length === 1 ? '' : 's'}.`
      )
      if (!confirmed) return
      affected.forEach(t => window.termAPI.ptyKill(t.id))
    }
    removeFolder(folderId)
  }

  async function handleMoveTerminalToTrash(id: string) {
    window.termAPI.ptyKill(id)
    moveToTrash('terminal', id)
  }

  function handleMoveFolderToTrash(folderId: string) {
    const affected = collectDescendantTerminals(folderId)
    affected.forEach(t => window.termAPI.ptyKill(t.id))
    moveToTrash('folder', folderId)
  }

  function handleAddFolder() {
    const id = uuidv4()
    addFolder({ id, name: `Folder ${folders.length + 1}`, order: folders.length, icon: 'fa:fa-solid fa-folder' })
    setActiveFolder(id)
  }

  function handleSelectTerminal(id: string) {
    setActiveTerminal(id)
  }

  function handleOpenSettings(target: { type: 'folder' | 'terminal'; id: string }) {
    setIconPickerTarget(target)
  }

  function handleCloseSettings() {
    setIconPickerTarget(null)
  }

  function handleCommitRename(id: string, newName: string) {
    const isFolder = folders.some(f => f.id === id)
    if (isFolder) renameFolder(id, newName)
    else updateTitle(id, newName)
    setEditingId(null)
  }

  function handleCancelRename() {
    setEditingId(null)
  }

  function handleDuplicateTerminal(id: string) {
    const term = terminals.find(t => t.id === id)
    if (!term) return
    const siblings = terminals.filter(t => t.folderId === term.folderId)
    const newId = uuidv4()
    addTerminal({
      id: newId,
      title: term.title + ' (copy)',
      cwd: term.cwd,
      order: siblings.length,
      scrollback: '',
      folderId: term.folderId,
      icon: term.icon,
      terminalTheme: term.terminalTheme,
      fontSize: term.fontSize,
    })
    setActiveTerminal(newId)
  }

  function handleDuplicateFolder(folderId: string) {
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return

    const idMap = new Map<string, string>()
    const queue = [folderId]
    const newFolders: Folder[] = []
    const newTerminals: { original: TerminalSession; newFolderId: string }[] = []

    while (queue.length) {
      const curId = queue.shift()!
      const cur = folders.find(f => f.id === curId)!
      const newId = uuidv4()
      idMap.set(curId, newId)

      const isRoot = curId === folderId
      newFolders.push({
        ...cur,
        id: newId,
        name: isRoot ? cur.name + ' (copy)' : cur.name,
        parentId: isRoot ? cur.parentId : idMap.get(cur.parentId!)!,
        order: isRoot ? folders.filter(f => f.parentId === cur.parentId).length : cur.order,
      })

      folders.filter(f => f.parentId === curId).forEach(f => queue.push(f.id))
      terminals.filter(t => t.folderId === curId).forEach(t => {
        newTerminals.push({ original: t, newFolderId: newId })
      })
    }

    newFolders.forEach(f => addFolder(f))
    newTerminals.forEach(({ original, newFolderId }) => {
      const newId = uuidv4()
      addTerminal({
        id: newId,
        title: original.title,
        cwd: original.cwd,
        order: original.order,
        scrollback: '',
        folderId: newFolderId,
        icon: original.icon,
        terminalTheme: original.terminalTheme,
        fontSize: original.fontSize,
      })
    })
  }

  function renderFolder(folder: Folder, depth: number): React.ReactNode {
    const folderTerminals = side === 'right' ? [] : terminals
      .filter(t => t.folderId === folder.id)
      .sort((a, b) => a.order - b.order)
    const childFolders = folders
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => a.order - b.order)
      .map(child => renderFolder(child, depth + 1))
    const descendantIds = collectDescendantTerminals(folder.id).map(t => t.id)
    const folderHasRunning = descendantIds.some(id => runningChildren.has(id))
    return (
      <FolderRow
        key={folder.id}
        folder={folder}
        terminals={folderTerminals}
        childFolders={childFolders}
        depth={depth}
        activeTerminalId={effectiveActiveTerminalId}
        activeFolderId={activeFolderId}
        onSelectFolder={setActiveFolder}
        isDropIntoTarget={dropTarget?.kind === 'into' && dropTarget.folderId === folder.id}
        insertBefore={dropTarget?.kind === 'before' && dropTarget.folderId === folder.id}
        insertAfter={dropTarget?.kind === 'after' && dropTarget.folderId === folder.id}
        onFolderDragStart={makeFolderDragStart(folder.id)}
        onFolderDragEnd={handleFolderDragEnd}
        onFolderSectionDragOver={makeFolderSectionDragOver(folder.id)}
        onFolderSectionDragLeave={makeFolderSectionDragLeave(folder.id)}
        onFolderSectionDrop={makeFolderSectionDrop(folder.id)}
        onTerminalDragStart={(e, terminalId) => makeTerminalDragStart(terminalId)(e)}
        onTerminalDragEnd={handleTerminalDragEnd}
        onTerminalItemDragOver={handleTerminalItemDragOver}
        onTerminalItemDrop={handleTerminalItemDrop}
        termDropTarget={termDropTarget}
        splitLayouts={splitLayouts}
        focusedPaneId={focusedPaneId}
        onFocusPane={setFocusedPane}
        onSplitDragStart={(e, leftId, rightId) => {
          dragPayload.current = { type: 'split', leftId, rightId }
          e.dataTransfer.effectAllowed = 'move'
          e.stopPropagation()
        }}
        onAddTerminal={handleAddTerminal}
        onSelectTerminal={handleSelectTerminal}
        onCloseTerminal={handleMoveTerminalToTrash}
        onDeleteFolder={handleMoveFolderToTrash}
        onOpenIconPicker={handleOpenSettings}
        runningChildIds={runningChildren}
        folderHasRunning={folderHasRunning}
        favoriteIds={favoriteIds}
        toggleFavorite={toggleFavorite}
        lastActiveTerminalByFolder={lastActiveTerminalByFolder}
        editingId={editingId}
        onStartRename={setEditingId}
        onCommitRename={handleCommitRename}
        onCancelRename={handleCancelRename}
        onDuplicateTerminal={handleDuplicateTerminal}
        onDuplicateFolder={handleDuplicateFolder}
        onSplitTerminal={splitTerminal}
        shortcuts={shortcuts}
        worktreeTerminalIds={worktreeTerminalIds}
      />
    )
  }

  const topLevelFolders = folders
    .filter(f => !f.parentId)
    .sort((a, b) => a.order - b.order)

  return (
    <div data-testid="sidebar" data-tour="sidebar" style={{
      ...styles.sidebar,
      ...(width != null ? { width, minWidth: width } : {}),
      borderRight: side === 'right' ? 'none' : undefined,
      borderLeft: side === 'right' ? '1px solid var(--border-subtle)' : undefined,
    }}>
      <div style={{ ...styles.header, padding: '0', height: 32, flexShrink: 0, position: 'relative' }}>
      </div>
      {side === 'left' && (
        <div
          style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => openPalette('find')}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <div style={{ ...styles.sidebarNavItem, flex: 1 }}>
            <IconDisplay icon="fa:fa-solid fa-magnifying-glass" />
            Search
          </div>
          <div style={{ flexShrink: 0, paddingRight: 8 }}>
            <button
              style={styles.addFolderBtn}
              onClick={e => { e.stopPropagation(); openNewMenu() }}
              title="Create new…"
            >+</button>
          </div>
        </div>
      )}
      <div style={styles.folders}>
        {side === 'left' && favoriteIds.length > 0 && (() => {
          const favTerminals = favoriteIds
            .map(id => terminals.find(t => t.id === id))
            .filter((t): t is TerminalSession => t != null)
          const favFolders = favoriteIds
            .map(id => folders.find(f => f.id === id))
            .filter((f): f is Folder => f != null)

          if (favTerminals.length === 0 && favFolders.length === 0) return null

          return (
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4, marginBottom: 4 }}>
              <div style={{ ...styles.folderHeader, cursor: 'pointer' }} onClick={() => setFavCollapsed(c => !c)}>
                <span style={{ fontSize: 10, color: 'var(--text-faintest)' }}>{favCollapsed ? '▶' : '▼'}</span>
                <span style={styles.folderName}>Favorites</span>
              </div>
              {!favCollapsed && favFolders.map(folder => (
                <div key={folder.id} style={{ ...styles.termItem, paddingLeft: 22 }}
                     onClick={() => {
                       // Activate first terminal in folder if any exist
                       const firstTerm = terminals.find(t => t.folderId === folder.id)
                       if (firstTerm) handleSelectTerminal(firstTerm.id)
                     }}>
                  <IconDisplay icon={folder.icon ?? 'fa:fa-solid fa-folder'} style={{ fontSize: 13 }} />
                  <span style={styles.termTitle}>{folder.name}</span>
                </div>
              ))}
              {!favCollapsed && favTerminals.map(term => (
                <div key={term.id}
                     style={{ ...styles.termItem, paddingLeft: 22,
                              ...(term.id === effectiveActiveTerminalId ? styles.termItemActive : {}) }}
                     onClick={() => handleSelectTerminal(term.id)}>
                  {runningChildren.has(term.id)
                    ? <StatusDot />
                    : term.icon
                        ? <IconDisplay icon={term.icon} style={{ fontSize: 13 }} />
                        : <span style={{ color: 'var(--text-faintest)', fontSize: 10 }}>›</span>}
                  <span style={styles.termTitle}>{term.title}</span>
                  {worktreeTerminalIds.has(term.id) && <WorktreeBadge />}
                </div>
              ))}
            </div>
          )
        })()}
        {side === 'left' && (
          <div
            style={{ minHeight: 8, borderRadius: 3, background: standaloneDropHover ? 'var(--accent-dim)' : 'transparent' }}
            onDragOver={e => {
              const type = dragPayload.current?.type
              if (type !== 'terminal' && type !== 'split') return
              e.preventDefault()
              e.stopPropagation()
              setStandaloneDropHover(true)
              setTermDropTarget(null)
            }}
            onDragLeave={e => {
              const related = e.relatedTarget as Node | null
              if (related && (e.currentTarget as HTMLElement).contains(related)) return
              setStandaloneDropHover(false)
              setTermDropTarget(null)
            }}
            onDrop={e => {
              e.preventDefault()
              e.stopPropagation()
              const payload = dragPayload.current
              if (payload?.type === 'terminal') moveTerminalToFolder(payload.id, undefined)
              else if (payload?.type === 'split') moveTerminalPairToFolder(payload.leftId, payload.rightId, undefined)
              clearDragState()
            }}
          >
          {terminals
            .filter(t => !t.folderId)
            .sort((a, b) => a.order - b.order)
            .map(term => {
              // Find this terminal's split pair (if any)
              const splitForTerm = splitLayouts.find(sl => sl.leftId === term.id || sl.rightId === term.id)

              // Right pane is rendered inside the left pane's split row
              if (splitForTerm && term.id === splitForTerm.rightId) return null

              const isSplitLeft = splitForTerm != null && term.id === splitForTerm.leftId
              const rightTerm = isSplitLeft ? terminals.find(t => t.id === splitForTerm!.rightId) : null

              if (isSplitLeft && rightTerm) {
                const isRowActive = term.id === effectiveActiveTerminalId || rightTerm.id === effectiveActiveTerminalId
                return (
                  <React.Fragment key={`split-${term.id}`}>
                  {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'before' && <div style={styles.dropLine} />}
                  <div
                    data-testid="terminal-entry"
                    draggable
                    style={{
                      display: 'flex',
                      margin: 0,
                      borderRadius: 0,
                      background: isRowActive ? 'var(--selection-bg)' : 'var(--subtle-bg)',
                      overflow: 'hidden',
                      alignItems: 'stretch',
                      border: 'none',
                      cursor: 'grab',
                    }}
                    onDragStart={e => {
                      dragPayload.current = { type: 'split', leftId: term.id, rightId: rightTerm.id }
                      e.dataTransfer.effectAllowed = 'move'
                      e.stopPropagation()
                    }}
                    onDragEnd={clearDragState}
                    onDragOver={e => handleTerminalItemDragOver(e, term.id)}
                    onDrop={e => handleTerminalItemDrop(e, term.id)}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '9px 6px 9px 10px',
                        cursor: 'pointer',
                        color: focusedPaneId === term.id ? 'var(--text-primary)' : 'var(--text-dim)',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        minWidth: 0,
                      }}
                      onClick={() => { setFocusedPane(term.id); handleSelectTerminal(term.id) }}
                      onContextMenu={e => { e.preventDefault(); handleOpenSettings({ type: 'terminal', id: term.id }) }}
                    >
                      {runningChildren.has(term.id)
                        ? <StatusDot />
                        : term.icon
                            ? <span style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleOpenSettings({ type: 'terminal', id: term.id }) }}><IconDisplay icon={term.icon} /></span>
                            : <span style={{ color: 'var(--text-faintest)', fontSize: 9, flexShrink: 0 }}>⊟</span>}
                      {editingId === term.id
                        ? <InlineRenameInput value={term.title} onCommit={v => handleCommitRename(term.id, v)} onCancel={handleCancelRename} />
                        : <span style={styles.termTitle}>{term.title}</span>}
                      {worktreeTerminalIds.has(term.id) && <WorktreeBadge />}
                      <KebabMenu items={[
                        { label: favoriteIds.includes(term.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(term.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(term.id) },
                        { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => handleDuplicateTerminal(term.id), shortcut: shortcuts.duplicateTerminal },
                        { separator: true },
                        { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => setEditingId(term.id), shortcut: shortcuts.renameTerminal },
                        { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => handleMoveTerminalToTrash(term.id), shortcut: shortcuts.closeTerminal },
                        { separator: true },
                        { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => handleOpenSettings({ type: 'terminal', id: term.id }) },
                      ]} />
                    </div>
                    <div style={{ width: 1, background: 'var(--border-subtle)', flexShrink: 0 }} />
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '9px 6px 9px 8px',
                        cursor: 'pointer',
                        color: focusedPaneId === rightTerm.id ? 'var(--text-primary)' : 'var(--text-dim)',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        minWidth: 0,
                      }}
                      onClick={() => { setFocusedPane(rightTerm.id); handleSelectTerminal(rightTerm.id) }}
                      onContextMenu={e => { e.preventDefault(); handleOpenSettings({ type: 'terminal', id: rightTerm.id }) }}
                    >
                      {runningChildren.has(rightTerm.id)
                        ? <StatusDot />
                        : rightTerm.icon
                            ? <span style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleOpenSettings({ type: 'terminal', id: rightTerm.id }) }}><IconDisplay icon={rightTerm.icon} /></span>
                            : null}
                      {editingId === rightTerm.id
                        ? <InlineRenameInput value={rightTerm.title} onCommit={v => handleCommitRename(rightTerm.id, v)} onCancel={handleCancelRename} />
                        : <span style={styles.termTitle}>{rightTerm.title}</span>}
                      {worktreeTerminalIds.has(rightTerm.id) && <WorktreeBadge />}
                      <KebabMenu items={[
                        { label: favoriteIds.includes(rightTerm.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(rightTerm.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(rightTerm.id) },
                        { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => handleDuplicateTerminal(rightTerm.id), shortcut: shortcuts.duplicateTerminal },
                        { separator: true },
                        { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => setEditingId(rightTerm.id), shortcut: shortcuts.renameTerminal },
                        { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => handleMoveTerminalToTrash(rightTerm.id), shortcut: shortcuts.closeTerminal },
                        { separator: true },
                        { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => handleOpenSettings({ type: 'terminal', id: rightTerm.id }) },
                      ]} />
                    </div>
                  </div>
                  {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'after' && <div style={styles.dropLine} />}
                  </React.Fragment>
                )
              }

              const isActive = term.id === effectiveActiveTerminalId
              return (
                <React.Fragment key={term.id}>
                  {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'before' && <div style={styles.dropLine} />}
                  <div
                    data-testid="terminal-entry"
                    draggable
                    style={{
                      ...styles.termItem,
                      paddingLeft: 12,
                      ...(isActive ? styles.termItemActive : {}),
                      ...(!isActive && hoveredStandaloneTerm === term.id ? { background: 'var(--hover-bg)' } : {}),
                    }}
                    onDragStart={e => {
                      dragPayload.current = { type: 'terminal', id: term.id }
                      e.dataTransfer.effectAllowed = 'move'
                      e.stopPropagation()
                    }}
                    onDragEnd={clearDragState}
                    onDragOver={e => handleTerminalItemDragOver(e, term.id)}
                    onDrop={e => handleTerminalItemDrop(e, term.id)}
                    onClick={() => handleSelectTerminal(term.id)}
                    onContextMenu={e => { e.preventDefault(); handleOpenSettings({ type: 'terminal', id: term.id }) }}
                    onMouseEnter={() => setHoveredStandaloneTerm(term.id)}
                    onMouseLeave={() => setHoveredStandaloneTerm(null)}
                  >
                    {runningChildren.has(term.id)
                      ? <StatusDot />
                      : term.icon
                          ? <span style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); handleOpenSettings({ type: 'terminal', id: term.id }) }}><IconDisplay icon={term.icon} /></span>
                          : <span style={{ color: 'var(--text-faintest)', fontSize: 10, flexShrink: 0 }}>›</span>}
                    {editingId === term.id
                      ? <InlineRenameInput value={term.title} onCommit={v => handleCommitRename(term.id, v)} onCancel={handleCancelRename} />
                      : <span style={styles.termTitle}>{term.title}</span>}
                    {worktreeTerminalIds.has(term.id) && <WorktreeBadge />}
                    <KebabMenu items={[
                      { label: favoriteIds.includes(term.id) ? 'Remove from Favorites' : 'Add to Favorites', icon: favoriteIds.includes(term.id) ? 'fa:fa-solid fa-star' : 'fa:fa-regular fa-star', onClick: () => toggleFavorite(term.id) },
                      { label: 'Duplicate', icon: 'fa:fa-solid fa-clone', onClick: () => handleDuplicateTerminal(term.id), shortcut: shortcuts.duplicateTerminal },
                      ...(!splitLayouts.some(sl => sl.leftId === term.id || sl.rightId === term.id)
                        ? [{ label: 'Split', icon: 'fa:fa-solid fa-columns', onClick: () => splitTerminal(term.id), shortcut: shortcuts.splitPane }]
                        : []) as { label: string; onClick: () => void; icon?: string; shortcut?: string }[],
                      { separator: true },
                      { label: 'Rename', icon: 'fa:fa-solid fa-pen', onClick: () => setEditingId(term.id), shortcut: shortcuts.renameTerminal },
                      { label: 'Move to Trash', icon: 'fa:fa-solid fa-trash', onClick: () => handleMoveTerminalToTrash(term.id), shortcut: shortcuts.closeTerminal },
                      { separator: true },
                      { label: 'Settings', icon: 'fa:fa-solid fa-gear', onClick: () => handleOpenSettings({ type: 'terminal', id: term.id }) },
                    ]} />
                  </div>
                  {termDropTarget?.terminalId === term.id && termDropTarget.kind === 'after' && <div style={styles.dropLine} />}
                </React.Fragment>
              )
            })
          }
          </div>
        )}
        {side === 'left' && topLevelFolders.map(folder => renderFolder(folder, 0))}
      </div>
      {side === 'left' && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0, marginTop: 'auto' }}>
          <button
            onClick={openTrash}
            style={styles.sidebarNavItem}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <IconDisplay icon="fa:fa-solid fa-trash" />
            Trash
          </button>
          <button
            onClick={openSettings}
            style={styles.sidebarNavItem}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <IconDisplay icon="fa:fa-solid fa-gear" />
            Settings
            <span style={{ marginLeft: 'auto', color: 'var(--text-faintest)', fontSize: 13 }}>{shortcuts.openSettings}</span>
          </button>
        </div>
      )}
      {iconPickerTarget && (
        iconPickerTarget.type === 'folder' ? (
          <FolderSettingsPopup
            folderId={iconPickerTarget.id}
            onClose={handleCloseSettings}
          />
        ) : (
          <TerminalSettingsPopup
            terminalId={iconPickerTarget.id}
            onClose={handleCloseSettings}
          />
        )
      )}
    </div>
  )
}
