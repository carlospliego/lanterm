import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { FONT_UI, FONT_MONO, TYPE, RADIUS } from '../designTokens'
import { TERMINAL_THEMES, AUTO_THEME_ID } from '../terminalThemes'
import { useAppStore } from '../store/useAppStore'
import { EmojiPickerContent } from './EmojiPickerContent'
import { IconDisplay } from './IconDisplay'
import { ThemePreview } from './ThemePreview'

interface TerminalSettingsPopupProps {
  terminalId: string
  onClose: () => void
}

export function TerminalSettingsPopup({ terminalId, onClose }: TerminalSettingsPopupProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(true)

  const terminals = useAppStore(s => s.terminals)
  const setTerminalIcon = useAppStore(s => s.setTerminalIcon)
  const setTerminalTheme = useAppStore(s => s.setTerminalTheme)
  const setTerminalFontSize = useAppStore(s => s.setTerminalFontSize)
  const globalFontSize = useAppStore(s => s.fontSize)
  const settings = useAppStore(s => s.settings)
  const resolvedTheme = useAppStore(s => s.resolvedTheme)

  const session = terminals.find(t => t.id === terminalId)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!session) return null

  const perTheme = session.terminalTheme ?? AUTO_THEME_ID
  const perFontSize = session.fontSize
  const currentIcon = session.icon ?? 'fa:fa-solid fa-terminal'

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: TYPE.sm,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-faintest)',
    fontFamily: FONT_MONO,
    marginBottom: 6,
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: RADIUS.md,
    color: 'var(--text-primary)',
    fontFamily: FONT_MONO,
    fontSize: TYPE.lg,
    outline: 'none',
    padding: '5px 8px',
    width: '100%',
    boxSizing: 'border-box' as const,
  }

  const sectionStyle: React.CSSProperties = { marginBottom: 16 }

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    userSelect: 'none',
  }

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 500,
          maxWidth: '94vw',
          maxHeight: '82vh',
          background: 'var(--surface)',
          borderRadius: RADIUS.lg,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: FONT_UI,
          fontSize: TYPE.body,
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: TYPE.lg, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: FONT_UI }}>
            Terminal Settings
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
          >&times;</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
          {/* Icon */}
          <div style={sectionStyle}>
            <div
              style={sectionHeaderStyle}
              onClick={() => setIconPickerOpen(!iconPickerOpen)}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>Icon</label>
              <span style={{ fontSize: 9, color: 'var(--text-faintest)' }}>
                {iconPickerOpen ? '\u25BC' : '\u25B6'}
              </span>
              <div style={{ flex: 1 }} />
              <IconDisplay icon={currentIcon} style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
            </div>
            {iconPickerOpen && (
              <div style={{
                marginTop: 8,
                border: '1px solid var(--border-subtle)',
                borderRadius: RADIUS.md,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 300,
                overflow: 'hidden',
              }}>
                <EmojiPickerContent
                  autoFocus={false}
                  onSelect={icon => setTerminalIcon(terminalId, icon ?? 'fa:fa-solid fa-terminal')}
                />
              </div>
            )}
          </div>

          {/* Theme */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Theme</label>
            <select
              value={perTheme}
              onChange={e => setTerminalTheme(terminalId, e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 200, cursor: 'pointer' }}
            >
              <option value={AUTO_THEME_ID}>Auto (match appearance)</option>
              {TERMINAL_THEMES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ThemePreview
              themeId={perTheme === AUTO_THEME_ID ? settings.terminalTheme : perTheme}
              resolvedTheme={resolvedTheme}
            />
          </div>

          {/* Font Size */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Font Size</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                min={8}
                max={32}
                value={perFontSize ?? globalFontSize}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v)) setTerminalFontSize(terminalId, v)
                }}
                style={{ ...inputStyle, width: 80 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              {perFontSize != null && (
                <button
                  onClick={() => setTerminalFontSize(terminalId, globalFontSize)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-faintest)', cursor: 'pointer', fontSize: TYPE.body, fontFamily: FONT_MONO, padding: 0, textDecoration: 'underline' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
                >
                  Reset to default ({globalFontSize})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
