import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAppStore } from '../store/useAppStore'
import { FONT_MONO, TYPE, RADIUS, SPACE } from '../designTokens'
import { IconDisplay } from './IconDisplay'

export function FolderPage() {
  const activeFolderId = useAppStore(s => s.activeFolderId)
  const folders = useAppStore(s => s.folders)
  const terminals = useAppStore(s => s.terminals)
  const setActiveTerminal = useAppStore(s => s.setActiveTerminal)
  const setActiveFolder = useAppStore(s => s.setActiveFolder)
  const addTerminal = useAppStore(s => s.addTerminal)
  const expandFolder = useAppStore(s => s.expandFolder)
  const settings = useAppStore(s => s.settings)

  const folder = folders.find(f => f.id === activeFolderId)
  if (!folder) return null

  const folderTerminals = terminals
    .filter(t => t.folderId === folder.id)
    .sort((a, b) => a.order - b.order)

  const childFolders = folders
    .filter(f => f.parentId === folder.id)
    .sort((a, b) => a.order - b.order)

  function handleNewTerminal() {
    const cwd = folder!.defaultCwd || settings.defaultDirectory || (folderTerminals.length > 0
      ? folderTerminals[folderTerminals.length - 1].cwd
      : window.termAPI.homedir)
    const id = uuidv4()
    addTerminal({
      id,
      folderId: folder!.id,
      title: `Terminal ${folderTerminals.length + 1}`,
      cwd,
      order: folderTerminals.length,
      scrollback: '',
      icon: folder!.defaultTerminalIcon ?? 'fa:fa-solid fa-terminal',
      terminalTheme: folder!.defaultTerminalTheme,
      fontSize: folder!.defaultFontSize,
    })
    expandFolder(folder!.id)
    setActiveTerminal(id)
  }

  function abbreviatePath(p: string): string {
    const home = window.termAPI.homedir
    if (p === home) return '~'
    if (p.startsWith(home + '/')) return '~' + p.slice(home.length)
    return p
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: FONT_MONO,
    }}>
      {/* Drag region */}
      <div style={{
        height: 32,
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties} />

      {/* Header */}
      <div style={{
        padding: `0 ${SPACE.xl}px ${SPACE.lg}px`,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACE.md,
        }}>
          {folder.icon && (
            <span style={{ fontSize: 18 }}>
              <IconDisplay icon={folder.icon} />
            </span>
          )}
          <h1 style={{
            margin: 0,
            fontSize: TYPE.xxl,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: FONT_MONO,
          }}>
            {folder.name}
          </h1>
          <span style={{
            fontSize: TYPE.body,
            color: 'var(--text-faintest)',
          }}>
            {folderTerminals.length} terminal{folderTerminals.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Card grid */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: `0 ${SPACE.xl}px ${SPACE.xl}px`,
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACE.md,
        }}>
          {folderTerminals.map(term => (
            <TerminalCard
              key={term.id}
              title={term.title}
              cwd={abbreviatePath(term.cwd)}
              icon={term.icon}
              onClick={() => { expandFolder(folder.id); setActiveTerminal(term.id) }}
            />
          ))}

          {/* New terminal card */}
          <NewTerminalCard onClick={handleNewTerminal} />

          {childFolders.map(child => {
            const count = terminals.filter(t => t.folderId === child.id).length
            return (
              <SubfolderCard
                key={child.id}
                name={child.name}
                icon={child.icon}
                terminalCount={count}
                onClick={() => setActiveFolder(child.id)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TerminalCard({ title, cwd, icon, onClick }: {
  title: string
  cwd: string
  icon?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 180,
        padding: SPACE.lg,
        background: hovered ? 'var(--elevated)' : 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        transition: 'background 0.1s',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.sm,
        color: 'var(--text-primary)',
        fontSize: TYPE.md,
        fontWeight: 500,
      }}>
        {icon && (
          <span style={{ fontSize: 13, flexShrink: 0 }}>
            <IconDisplay icon={icon} />
          </span>
        )}
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{title}</span>
      </div>
      <div style={{
        fontSize: TYPE.xs,
        color: 'var(--text-faintest)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {cwd}
      </div>
    </div>
  )
}

function NewTerminalCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 180,
        padding: SPACE.lg,
        background: hovered ? 'var(--elevated)' : 'transparent',
        border: '1px dashed var(--border-subtle)',
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        transition: 'background 0.1s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACE.sm,
        color: 'var(--text-faintest)',
        fontSize: TYPE.md,
        minHeight: 60,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
      <span>New Terminal</span>
    </div>
  )
}

function SubfolderCard({ name, icon, terminalCount, onClick }: {
  name: string
  icon?: string
  terminalCount: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 180,
        padding: SPACE.lg,
        background: hovered ? 'var(--elevated)' : 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        transition: 'background 0.1s',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE.sm,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.sm,
        color: 'var(--text-primary)',
        fontSize: TYPE.md,
        fontWeight: 500,
      }}>
        {icon && (
          <span style={{ fontSize: 13, flexShrink: 0 }}>
            <IconDisplay icon={icon} />
          </span>
        )}
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{name}</span>
      </div>
      <div style={{
        fontSize: TYPE.xs,
        color: 'var(--text-faintest)',
      }}>
        {terminalCount} terminal{terminalCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
