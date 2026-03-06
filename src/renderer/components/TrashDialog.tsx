import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { FONT_MONO, TYPE, RADIUS, SPACE, btnReset } from '../designTokens'
import { IconDisplay } from './IconDisplay'
import type { TrashedItem } from '../../shared/types'

function formatTimeAgo(timestamp: number): string {
  const ms = Date.now() - timestamp
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function itemLabel(item: TrashedItem): string {
  if (item.type === 'folder' && item.folder) return item.folder.name
  if (item.terminals.length > 0) return item.terminals[0].title
  return 'Unknown'
}

function itemIcon(item: TrashedItem): string {
  if (item.type === 'folder' && item.folder?.icon) return item.folder.icon
  if (item.type === 'folder') return 'fa:fa-solid fa-folder'
  if (item.terminals.length > 0 && item.terminals[0].icon) return item.terminals[0].icon
  return 'fa:fa-solid fa-terminal'
}

function itemDetail(item: TrashedItem): string {
  if (item.type === 'folder') {
    const termCount = item.terminals.length
    const folderCount = item.childFolders.length
    const parts: string[] = []
    if (termCount > 0) parts.push(`${termCount} terminal${termCount !== 1 ? 's' : ''}`)
    if (folderCount > 0) parts.push(`${folderCount} subfolder${folderCount !== 1 ? 's' : ''}`)
    return parts.length > 0 ? parts.join(', ') : 'empty folder'
  }
  if (item.terminals.length > 0) return item.terminals[0].cwd
  return ''
}

export function TrashDialog() {
  const { trashOpen, closeTrash, trashedItems, restoreFromTrash, permanentlyDelete, emptyTrash } = useAppStore()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!trashOpen) return
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [trashOpen])

  const filtered = trashedItems
    .filter(item => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      const label = itemLabel(item).toLowerCase()
      const detail = itemDetail(item).toLowerCase()
      return label.includes(q) || detail.includes(q)
    })
    .sort((a, b) => b.trashedAt - a.trashedAt)

  const handleRestore = useCallback((item: TrashedItem) => {
    restoreFromTrash(item.id)
  }, [restoreFromTrash])

  const handlePermanentDelete = useCallback((item: TrashedItem) => {
    const confirmed = window.confirm(`Permanently delete "${itemLabel(item)}"? This cannot be undone.`)
    if (confirmed) permanentlyDelete(item.id)
  }, [permanentlyDelete])

  const handleEmptyTrash = useCallback(() => {
    if (trashedItems.length === 0) return
    const confirmed = window.confirm(`Permanently delete all ${trashedItems.length} item${trashedItems.length !== 1 ? 's' : ''} in trash? This cannot be undone.`)
    if (confirmed) emptyTrash()
  }, [trashedItems.length, emptyTrash])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeTrash()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      handleRestore(filtered[selectedIndex])
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && filtered.length > 0 && !query) {
      e.preventDefault()
      handlePermanentDelete(filtered[selectedIndex])
    }
  }, [closeTrash, filtered, selectedIndex, handleRestore, handlePermanentDelete, query])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Clamp selectedIndex when filter changes
  useEffect(() => {
    setSelectedIndex(i => Math.min(i, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  if (!trashOpen) return null

  return (
    <div
      data-testid="trash-dialog"
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
        if (e.target === e.currentTarget) closeTrash()
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
          maxHeight: '70vh',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.sm,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{
            fontFamily: FONT_MONO,
            fontSize: TYPE.lg,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>Trash</span>
          {trashedItems.length > 0 && (
            <span style={{
              fontFamily: FONT_MONO,
              fontSize: TYPE.xs,
              color: 'var(--text-faintest)',
              background: 'var(--border-subtle)',
              borderRadius: 10,
              padding: '1px 7px',
            }}>{trashedItems.length}</span>
          )}
          <span style={{ flex: 1 }} />
          {trashedItems.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              style={{
                ...btnReset,
                fontFamily: FONT_MONO,
                fontSize: TYPE.sm,
                color: 'var(--text-faint)',
                padding: '3px 8px',
                borderRadius: RADIUS.md,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger, #e55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
            >Empty Trash</button>
          )}
        </div>

        {/* Search */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
          onKeyDown={handleKeyDown}
          placeholder="Search trash..."
          style={{
            background: 'var(--elevated)',
            border: 'none',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: FONT_MONO,
            fontSize: TYPE.xl,
            outline: 'none',
            padding: '10px 14px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />

        {/* List */}
        {filtered.length > 0 ? (
          <div
            ref={listRef}
            style={{
              overflowY: 'auto',
              padding: `${SPACE.xs}px 0`,
            }}
          >
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: SPACE.sm,
                  padding: '8px 14px',
                  fontFamily: FONT_MONO,
                  fontSize: TYPE.body,
                  color: 'var(--text-secondary)',
                  background: idx === selectedIndex ? 'var(--elevated)' : 'transparent',
                  cursor: 'default',
                  borderRadius: RADIUS.sm,
                  margin: '0 4px',
                }}
              >
                <IconDisplay icon={itemIcon(item)} style={{ fontSize: 13, flexShrink: 0, color: 'var(--text-faint)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                  }}>{itemLabel(item)}</div>
                  <div style={{
                    fontSize: TYPE.xs,
                    color: 'var(--text-faintest)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>{itemDetail(item)}</div>
                </div>
                <span style={{
                  fontSize: TYPE.xs,
                  color: 'var(--text-faintest)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}>{formatTimeAgo(item.trashedAt)}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleRestore(item) }}
                  title="Restore"
                  style={{
                    ...btnReset,
                    fontSize: TYPE.sm,
                    color: 'var(--text-faint)',
                    padding: '2px 6px',
                    borderRadius: RADIUS.sm,
                    transition: 'color 0.1s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                >
                  <IconDisplay icon="fa:fa-solid fa-rotate-left" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handlePermanentDelete(item) }}
                  title="Delete permanently"
                  style={{
                    ...btnReset,
                    fontSize: TYPE.sm,
                    color: 'var(--text-faint)',
                    padding: '2px 6px',
                    borderRadius: RADIUS.sm,
                    transition: 'color 0.1s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger, #e55)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                >
                  <IconDisplay icon="fa:fa-solid fa-xmark" />
                </button>
              </div>
            ))}
          </div>
        ) : trashedItems.length === 0 ? (
          <div style={{
            padding: '24px 14px',
            fontSize: TYPE.body,
            fontFamily: FONT_MONO,
            color: 'var(--text-faintest)',
            textAlign: 'center',
          }}>
            Trash is empty
          </div>
        ) : (
          <div style={{
            padding: '16px 14px',
            fontSize: TYPE.body,
            fontFamily: FONT_MONO,
            color: 'var(--text-faintest)',
            textAlign: 'center',
          }}>
            No matches found
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '6px 12px',
          fontSize: TYPE.xs,
          fontFamily: FONT_MONO,
          color: 'var(--text-faintest)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}>
          <span>Items auto-deleted after 30 days</span>
          <span style={{ opacity: 0.7 }}>
            {'↑↓ navigate · ↵ restore · ⌫ delete · esc close'}
          </span>
        </div>
      </div>
    </div>
  )
}
