import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { FONT_UI, FONT_MONO, TYPE, RADIUS } from '../designTokens'
import { TERMINAL_THEMES, AUTO_THEME_ID } from '../terminalThemes'
import { useAppStore } from '../store/useAppStore'
import { EmojiPickerContent } from './EmojiPickerContent'
import { IconDisplay } from './IconDisplay'
import { ThemePreview } from './ThemePreview'

interface FolderSettingsPopupProps {
  folderId: string
  onClose: () => void
}

export function FolderSettingsPopup({ folderId, onClose }: FolderSettingsPopupProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(true)


  const folders = useAppStore(s => s.folders)
  const setFolderIcon = useAppStore(s => s.setFolderIcon)
  const updateFolderDefaults = useAppStore(s => s.updateFolderDefaults)
  const globalFontSize = useAppStore(s => s.fontSize)
  const settings = useAppStore(s => s.settings)
  const resolvedTheme = useAppStore(s => s.resolvedTheme)

  const folder = folders.find(f => f.id === folderId)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!folder) return null

  const currentIcon = folder.icon ?? 'fa:fa-solid fa-folder'
  const defaultTheme = folder.defaultTerminalTheme ?? AUTO_THEME_ID
  const defaultFontSize = folder.defaultFontSize

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

  const resetBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-faintest)',
    cursor: 'pointer',
    fontSize: TYPE.body,
    fontFamily: FONT_MONO,
    padding: 0,
    textDecoration: 'underline',
  }

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid var(--border-subtle)',
    margin: '16px 0',
  }

  async function handleBrowseCwd() {
    const result = await window.termAPI.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: folder!.defaultCwd || undefined,
    })
    if (result && result.length > 0) {
      updateFolderDefaults(folderId, { defaultCwd: result[0] })
    }
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
            Folder Settings
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
          {/* Folder Icon */}
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
                  onSelect={icon => setFolderIcon(folderId, icon)}
                />
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={dividerStyle} />

          {/* Section heading for terminal defaults */}
          <div style={{ ...labelStyle, fontSize: TYPE.body, marginBottom: 12, color: 'var(--text-muted)' }}>
            Terminal Defaults
          </div>

          {/* Default Working Directory */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Working Directory</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="text"
                value={folder.defaultCwd ?? ''}
                placeholder="Inherit from app settings"
                onChange={e => updateFolderDefaults(folderId, { defaultCwd: e.target.value || undefined })}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={handleBrowseCwd}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: RADIUS.md,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: TYPE.body,
                  fontFamily: FONT_MONO,
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                Browse
              </button>
            </div>
            {folder.defaultCwd && (
              <button
                onClick={() => updateFolderDefaults(folderId, { defaultCwd: undefined })}
                style={{ ...resetBtnStyle, marginTop: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
              >
                Clear
              </button>
            )}
          </div>

          {/* Default Theme */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Theme</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={defaultTheme}
                onChange={e => {
                  const val = e.target.value
                  updateFolderDefaults(folderId, { defaultTerminalTheme: val === AUTO_THEME_ID ? undefined : val })
                }}
                style={{ ...inputStyle, width: 'auto', minWidth: 200, cursor: 'pointer' }}
              >
                <option value={AUTO_THEME_ID}>Auto (match appearance)</option>
                {TERMINAL_THEMES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {folder.defaultTerminalTheme && (
                <button
                  onClick={() => updateFolderDefaults(folderId, { defaultTerminalTheme: undefined })}
                  style={resetBtnStyle}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
                >
                  Reset
                </button>
              )}
            </div>
            <ThemePreview
              themeId={defaultTheme === AUTO_THEME_ID ? settings.terminalTheme : defaultTheme}
              resolvedTheme={resolvedTheme}
            />
          </div>

          {/* Default Font Size */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Font Size</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                min={8}
                max={32}
                value={defaultFontSize ?? globalFontSize}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v)) updateFolderDefaults(folderId, { defaultFontSize: v })
                }}
                style={{ ...inputStyle, width: 80 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              {defaultFontSize != null && (
                <button
                  onClick={() => updateFolderDefaults(folderId, { defaultFontSize: undefined })}
                  style={resetBtnStyle}
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
