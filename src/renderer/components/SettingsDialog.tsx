import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { FONT_UI, FONT_MONO, TYPE, RADIUS, SPACE } from '../designTokens'
import {
  COMMANDS,
  DEFAULT_KEYBINDINGS,
  formatBinding,
  resolveKeybindings,
} from '../../shared/keybindings'
import type { CommandId, Keybinding } from '../../shared/keybindings'
import { TERMINAL_THEMES, AUTO_THEME_ID } from '../terminalThemes'
import { useCombinedPlugins } from '../useExternalPlugins'

const FONT_OPTIONS = [
  { label: 'Cascadia Code',    value: '"Cascadia Code", "Fira Code", Menlo, Monaco, monospace' },
  { label: 'Fira Code',        value: '"Fira Code", Menlo, Monaco, monospace' },
  { label: 'Menlo',            value: 'Menlo, Monaco, monospace' },
  { label: 'Monaco',           value: 'Monaco, monospace' },
  { label: 'System monospace', value: 'monospace' },
]

type Tab = 'general' | 'commands' | 'developer'
type CommandsSubTab = 'shortcuts' | 'customCommands'

export function SettingsDialog() {
  const {
    settingsOpen, closeSettings,
    settingsTab: initialTab, settingsSubTab: initialSubTab,
    settings, updateSettings,
    fontSize, setFontSize,
    updateKeybinding,
    updatePluginKeybinding,
    addCustomCommand, updateCustomCommand, removeCustomCommand,
    installedPlugins,
  } = useAppStore()

  const combinedPlugins = useCombinedPlugins()

  const [tab, setTab] = useState<Tab>('general')
  const [commandsSubTab, setCommandsSubTab] = useState<CommandsSubTab>('shortcuts')
  const [defaultShell, setDefaultShell] = useState('')
  const [recordingId, setRecordingId] = useState<CommandId | null>(null)
  const [recordingPluginActionId, setRecordingPluginActionId] = useState<string | null>(null)
  const [editingCmdId, setEditingCmdId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editCommand, setEditCommand] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newCommand, setNewCommand] = useState('')

  // Apply initial tab/subtab when dialog opens
  useEffect(() => {
    if (!settingsOpen) return
    if (initialTab === 'commands') {
      setTab('commands')
      setCommandsSubTab(initialSubTab === 'customCommands' ? 'customCommands' : 'shortcuts')
    } else if (initialTab === 'developer' && import.meta.env.DEV) {
      setTab('developer')
    } else {
      setTab('general')
    }
    window.termAPI.getDefaultShell().then(s => setDefaultShell(s))
  }, [settingsOpen])

  // Close on Escape (unless recording — recording handles its own Escape)
  useEffect(() => {
    if (!settingsOpen || recordingId || recordingPluginActionId) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeSettings() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen, recordingId, recordingPluginActionId, closeSettings])

  // Capture new keybinding (built-in commands)
  useEffect(() => {
    if (!recordingId) return
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRecordingId(null); return }
      if (['Meta', 'Shift', 'Alt', 'Control'].includes(e.key)) return
      const binding: Keybinding = {
        key: e.key,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      }
      updateKeybinding(recordingId, binding)
      setRecordingId(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recordingId, updateKeybinding])

  // Capture new keybinding (plugin actions)
  useEffect(() => {
    if (!recordingPluginActionId) return
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRecordingPluginActionId(null); return }
      if (['Meta', 'Shift', 'Alt', 'Control'].includes(e.key)) return
      const binding: Keybinding = {
        key: e.key,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      }
      updatePluginKeybinding(recordingPluginActionId, binding)
      setRecordingPluginActionId(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recordingPluginActionId, updatePluginKeybinding])

  if (!settingsOpen) return null

  const resolved = resolveKeybindings(settings.keybindings)
  const groups = [...new Set(COMMANDS.map(c => c.group))]

  // ── Shared styles ──────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-primary)',
    fontFamily: FONT_MONO,
    fontSize: 13,
    outline: 'none',
    padding: '5px 8px',
    width: '100%',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-faintest)',
    fontFamily: FONT_MONO,
    marginBottom: 6,
  }
  const sectionStyle: React.CSSProperties = { marginBottom: 22 }

  return (
    <div
      data-testid="settings-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) closeSettings() }}
    >
      <div
        style={{
          width: 700,
          maxWidth: '94vw',
          maxHeight: '82vh',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
          <span style={{
            fontSize: TYPE.lg,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: FONT_UI,
          }}>Settings</span>
          <button
            onClick={closeSettings}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
          >×</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: 0,
          padding: '10px 16px 0',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          {([...(['general', 'commands'] as Tab[]), ...(import.meta.env.DEV ? ['developer' as Tab] : [])]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-faint)',
                cursor: 'pointer',
                fontFamily: FONT_UI,
                fontSize: 12,
                fontWeight: tab === t ? 600 : 400,
                padding: '6px 12px 8px',
                marginBottom: -1,
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => { if (tab !== t) e.currentTarget.style.color = 'var(--text-muted)' }}
              onMouseLeave={e => { if (tab !== t) e.currentTarget.style.color = 'var(--text-faint)' }}
            >
              {t === 'general' ? 'General' : t === 'commands' ? 'Commands' : 'Developer'}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 24px' }}>

          {/* ── GENERAL TAB ─────────────────────────────────────── */}
          {tab === 'general' && (
            <>
              {/* Appearance */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Appearance</label>
                {settings.terminalTheme !== 'auto' && (
                  <div style={{ fontSize: 11, color: 'var(--text-faintest)', fontFamily: FONT_MONO, marginBottom: 6 }}>
                    Set theme to Auto to use this setting
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, opacity: settings.terminalTheme !== 'auto' ? 0.4 : 1, pointerEvents: settings.terminalTheme !== 'auto' ? 'none' : 'auto' }}>
                  {(['light', 'dark', 'system'] as const).map(t => {
                    const active = settings.theme === t
                    return (
                      <button
                        key={t}
                        onClick={() => updateSettings({ theme: t })}
                        style={{
                          background: active ? 'var(--accent-dim)' : 'var(--elevated)',
                          border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: 4,
                          color: active ? 'var(--accent)' : 'var(--text-dim)',
                          cursor: 'pointer',
                          fontFamily: FONT_MONO,
                          fontSize: 12,
                          padding: '4px 14px',
                          transition: 'all 0.1s',
                          textTransform: 'capitalize',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--text-faintest)' }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Shell */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Shell</label>
                <input
                  type="text"
                  value={settings.shell}
                  onChange={e => updateSettings({ shell: e.target.value })}
                  placeholder={defaultShell || '/bin/zsh'}
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                {defaultShell && (
                  <button
                    onClick={() => updateSettings({ shell: '' })}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--text-faintest)', cursor: 'pointer', fontSize: 11, fontFamily: FONT_MONO, padding: 0, textDecoration: 'underline' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
                  >
                    Reset to default ({defaultShell})
                  </button>
                )}
              </div>

              {/* Default Directory */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Default Directory</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={settings.defaultDirectory}
                    onChange={e => updateSettings({ defaultDirectory: e.target.value })}
                    placeholder={window.termAPI.homedir}
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.termAPI.showOpenDialog({
                          properties: ['openDirectory', 'createDirectory'],
                          title: 'Choose Default Directory',
                          defaultPath: settings.defaultDirectory || undefined,
                        })
                        if (!result.canceled && result.filePaths[0]) {
                          updateSettings({ defaultDirectory: result.filePaths[0] })
                        }
                      } catch (err) {
                        console.error('Failed to open directory picker:', err)
                      }
                    }}
                    title="Browse…"
                    style={{
                      background: 'var(--elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      fontFamily: FONT_MONO,
                      fontSize: 12,
                      padding: '5px 10px',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >…</button>
                </div>
                {settings.defaultDirectory && (
                  <button
                    onClick={() => updateSettings({ defaultDirectory: '' })}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--text-faintest)', cursor: 'pointer', fontSize: 11, fontFamily: FONT_MONO, padding: 0, textDecoration: 'underline' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
                  >
                    Reset to default ({window.termAPI.homedir})
                  </button>
                )}
              </div>

              {/* Font */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Font</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, width: 56, flexShrink: 0, fontFamily: FONT_MONO }}>Family</span>
                  <select
                    value={settings.fontFamily}
                    onChange={e => updateSettings({ fontFamily: e.target.value })}
                    style={{ ...inputStyle, width: 'auto', flex: 1, cursor: 'pointer' }}
                  >
                    {FONT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {!FONT_OPTIONS.some(o => o.value === settings.fontFamily) && (
                      <option value={settings.fontFamily}>{settings.fontFamily}</option>
                    )}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, width: 56, flexShrink: 0, fontFamily: FONT_MONO }}>Size</span>
                  <input
                    type="number"
                    min={8}
                    max={32}
                    value={fontSize}
                    onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setFontSize(v) }}
                    style={{ ...inputStyle, width: 80 }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>

              {/* Terminal */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Terminal</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: 12, width: 80, flexShrink: 0, fontFamily: FONT_MONO }}>Scrollback</span>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    step={1000}
                    value={settings.scrollback}
                    onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 100) updateSettings({ scrollback: v }) }}
                    style={{ ...inputStyle, width: 100 }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  <span style={{ color: 'var(--text-faintest)', fontSize: 12, fontFamily: FONT_MONO }}>lines</span>
                </div>
              </div>

              {/* Windows */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Windows</label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: 'var(--text-dim)',
                  fontSize: 13,
                  fontFamily: FONT_MONO,
                }}>
                  <input
                    type="checkbox"
                    checked={settings.restoreWindows ?? true}
                    onChange={e => updateSettings({ restoreWindows: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Restore windows on launch
                </label>
                <div style={{ fontSize: 11, color: 'var(--text-faintest)', fontFamily: FONT_MONO, marginTop: 4, marginLeft: 24 }}>
                  Reopen all windows with their terminals when the app starts
                </div>
              </div>

              {/* Theme */}
              <div style={sectionStyle}>
                <label style={labelStyle}>Theme</label>
                <div style={{ fontSize: 11, color: 'var(--text-faintest)', fontFamily: FONT_MONO, marginBottom: 6 }}>
                  Default theme for new terminals
                </div>
                <select
                  value={settings.terminalTheme}
                  onChange={e => updateSettings({ terminalTheme: e.target.value })}
                  style={{ ...inputStyle, width: 'auto', minWidth: 200, cursor: 'pointer' }}
                >
                  <option value={AUTO_THEME_ID}>Auto (follow appearance)</option>
                  {TERMINAL_THEMES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* About */}
              <div style={{
                fontSize: 11,
                color: 'var(--text-faintest)',
                fontFamily: FONT_MONO,
                textAlign: 'center',
                paddingTop: 8,
              }}>
                Version {__APP_VERSION__}
              </div>
            </>
          )}

          {/* ── COMMANDS TAB ────────────────────────────────────── */}
          {tab === 'commands' && (
            <div>
              {/* Command palette reference */}
              <div style={{
                background: 'var(--elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: RADIUS.lg,
                padding: '12px 14px',
                marginBottom: 16,
              }}>
                <div style={{
                  fontSize: TYPE.sm,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  fontFamily: FONT_MONO,
                  marginBottom: 8,
                  letterSpacing: '0.04em',
                }}>Command Palette <kbd style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: RADIUS.sm,
                    color: 'var(--text-faint)',
                    fontSize: 10,
                    padding: '1px 5px',
                    marginLeft: 4,
                  }}>⌘P</kbd></div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto 1fr',
                  gap: '4px 8px',
                  alignItems: 'center',
                  fontSize: TYPE.body,
                  fontFamily: FONT_MONO,
                }}>
                  {([
                    ['>', 'commands', 'Run any command by name'],
                    ['/', 'find', 'Search across terminal content'],
                    ['!', 'history', 'Browse and re-run shell history'],
                  ] as [string, string, string][]).map(([prefix, mode, desc]) => (
                    <React.Fragment key={prefix}>
                      <kbd style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: RADIUS.sm,
                        color: 'var(--accent)',
                        fontSize: 11,
                        padding: '1px 5px',
                        textAlign: 'center',
                        fontWeight: 600,
                        minWidth: 18,
                      }}>{prefix}</kbd>
                      <span style={{ color: 'var(--text-faint)', fontSize: TYPE.sm }}>{mode}</span>
                      <span style={{ color: 'var(--text-faintest)', fontSize: TYPE.sm }}>{desc}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{
                  marginTop: 6,
                  fontSize: TYPE.xs,
                  color: 'var(--text-faintest)',
                  fontFamily: FONT_MONO,
                  opacity: 0.7,
                }}>Type without a prefix to search everything at once</div>
              </div>
              {/* Sub-tab bar */}
              <div style={{
                display: 'flex',
                gap: 0,
                marginBottom: 16,
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {([['shortcuts', 'Keyboard Shortcuts'], ['customCommands', 'Custom Commands']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setCommandsSubTab(key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: commandsSubTab === key ? '2px solid var(--accent)' : '2px solid transparent',
                      color: commandsSubTab === key ? 'var(--text-primary)' : 'var(--text-faint)',
                      cursor: 'pointer',
                      fontFamily: FONT_UI,
                      fontSize: 11,
                      fontWeight: commandsSubTab === key ? 600 : 400,
                      padding: '4px 10px 6px',
                      marginBottom: -1,
                      transition: 'color 0.1s',
                    }}
                    onMouseEnter={e => { if (commandsSubTab !== key) e.currentTarget.style.color = 'var(--text-muted)' }}
                    onMouseLeave={e => { if (commandsSubTab !== key) e.currentTarget.style.color = 'var(--text-faint)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Keyboard Shortcuts sub-tab ──────────────────── */}
              {commandsSubTab === 'shortcuts' && (
                <>
                  <p style={{ margin: '0 0 16px', color: 'var(--text-faintest)', fontSize: 12, fontFamily: FONT_MONO }}>
                    Click a shortcut to record a new one. Press Esc to cancel.
                  </p>
                  {groups.map(group => {
                    const cmds = COMMANDS.filter(c => c.group === group)
                    return (
                      <div key={group} style={{ marginBottom: 24 }}>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--text-faintest)',
                          fontFamily: FONT_MONO,
                          marginBottom: 6,
                          paddingBottom: 5,
                          borderBottom: '1px solid var(--elevated)',
                        }}>{group}</div>
                        {cmds.map(cmd => {
                          const id = cmd.id as CommandId
                          const binding = resolved[id]
                          const isDefault = !settings.keybindings[id]
                          const isRecording = recordingId === id
                          return (
                            <div
                              key={id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '7px 0',
                                borderBottom: '1px solid var(--elevated)',
                              }}
                            >
                              <span style={{
                                flex: 1,
                                color: 'var(--text-muted)',
                                fontSize: 13,
                                fontFamily: FONT_UI,
                              }}>
                                {cmd.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {/* Keybinding badge */}
                                <button
                                  onClick={() => setRecordingId(isRecording ? null : id)}
                                  title={isRecording ? 'Press new shortcut (Esc to cancel)' : 'Click to change'}
                                  style={{
                                    background: isRecording ? 'var(--accent-dim)' : 'var(--bg)',
                                    border: isRecording ? '1px solid var(--accent)' : '1px solid var(--border)',
                                    borderRadius: 4,
                                    color: isRecording ? 'var(--accent)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontFamily: FONT_MONO,
                                    fontSize: 12,
                                    minWidth: 90,
                                    padding: '3px 8px',
                                    textAlign: 'center',
                                    transition: 'all 0.1s',
                                  }}
                                  onMouseEnter={e => { if (!isRecording) e.currentTarget.style.borderColor = 'var(--text-faintest)' }}
                                  onMouseLeave={e => { if (!isRecording) e.currentTarget.style.borderColor = 'var(--border)' }}
                                >
                                  {isRecording ? 'Recording…' : formatBinding(binding)}
                                </button>
                                {/* Reset to default */}
                                <button
                                  onClick={() => updateKeybinding(id, null)}
                                  disabled={isDefault}
                                  title="Reset to default"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: isDefault ? 'var(--elevated)' : 'var(--text-faint)',
                                    cursor: isDefault ? 'default' : 'pointer',
                                    fontSize: 11,
                                    fontFamily: FONT_MONO,
                                    padding: '2px 4px',
                                    opacity: isDefault ? 0.4 : 1,
                                  }}
                                  onMouseEnter={e => { if (!isDefault) e.currentTarget.style.color = 'var(--text-muted)' }}
                                  onMouseLeave={e => { if (!isDefault) e.currentTarget.style.color = 'var(--text-faint)' }}
                                >
                                  ↺
                                </button>
                                {/* Default badge */}
                                {!isDefault && (
                                  <span style={{ fontSize: 10, color: 'var(--elevated)', fontFamily: FONT_MONO }}>
                                    default: {formatBinding(DEFAULT_KEYBINDINGS[id])}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}

                  {/* Plugin action shortcuts */}
                  {combinedPlugins
                    .filter(p => installedPlugins.includes(p.id) && p.actions)
                    .map(plugin => {
                      const actions = plugin.actions!()
                      if (actions.length === 0) return null
                      const pluginBindings = settings.pluginKeybindings ?? {}
                      return (
                        <div key={`plugin-${plugin.id}`} style={{ marginBottom: 24 }}>
                          <div style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--text-faintest)',
                            fontFamily: FONT_MONO,
                            marginBottom: 6,
                            paddingBottom: 5,
                            borderBottom: '1px solid var(--elevated)',
                          }}>{plugin.name}</div>
                          {actions.map(action => {
                            const binding = pluginBindings[action.id]
                            const isRecording = recordingPluginActionId === action.id
                            return (
                              <div
                                key={action.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '7px 0',
                                  borderBottom: '1px solid var(--elevated)',
                                }}
                              >
                                <span style={{
                                  flex: 1,
                                  color: 'var(--text-muted)',
                                  fontSize: 13,
                                  fontFamily: FONT_UI,
                                }}>
                                  {action.label}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    onClick={() => setRecordingPluginActionId(isRecording ? null : action.id)}
                                    title={isRecording ? 'Press new shortcut (Esc to cancel)' : 'Click to assign shortcut'}
                                    style={{
                                      background: isRecording ? 'var(--accent-dim)' : 'var(--bg)',
                                      border: isRecording ? '1px solid var(--accent)' : '1px solid var(--border)',
                                      borderRadius: 4,
                                      color: isRecording ? 'var(--accent)' : binding ? 'var(--text-secondary)' : 'var(--text-faintest)',
                                      cursor: 'pointer',
                                      fontFamily: FONT_MONO,
                                      fontSize: 12,
                                      minWidth: 90,
                                      padding: '3px 8px',
                                      textAlign: 'center',
                                      transition: 'all 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isRecording) e.currentTarget.style.borderColor = 'var(--text-faintest)' }}
                                    onMouseLeave={e => { if (!isRecording) e.currentTarget.style.borderColor = 'var(--border)' }}
                                  >
                                    {isRecording ? 'Recording…' : binding ? formatBinding(binding) : 'none'}
                                  </button>
                                  {binding && (
                                    <button
                                      onClick={() => updatePluginKeybinding(action.id, null)}
                                      title="Remove shortcut"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-faint)',
                                        cursor: 'pointer',
                                        fontSize: 11,
                                        fontFamily: FONT_MONO,
                                        padding: '2px 4px',
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                                    >
                                      ↺
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                </>
              )}

              {/* ── Custom Commands sub-tab ─────────────────────── */}
              {commandsSubTab === 'customCommands' && (
                <>
                  <p style={{ margin: '0 0 12px', color: 'var(--text-faintest)', fontSize: 12, fontFamily: FONT_MONO }}>
                    Custom commands appear in the command palette and run in the active terminal.
                  </p>

                  {(settings.customCommands ?? []).map(cmd => {
                    const isEditing = editingCmdId === cmd.id
                    if (isEditing) {
                      return (
                        <div key={cmd.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--elevated)' }}>
                          <input
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            placeholder="Label"
                            style={{ ...inputStyle, flex: 1 }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                          />
                          <input
                            value={editCommand}
                            onChange={e => setEditCommand(e.target.value)}
                            placeholder="Command"
                            style={{ ...inputStyle, flex: 2 }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && editLabel.trim() && editCommand.trim()) {
                                updateCustomCommand(cmd.id, { label: editLabel.trim(), command: editCommand.trim() })
                                setEditingCmdId(null)
                              } else if (e.key === 'Escape') {
                                setEditingCmdId(null)
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (editLabel.trim() && editCommand.trim()) {
                                updateCustomCommand(cmd.id, { label: editLabel.trim(), command: editCommand.trim() })
                                setEditingCmdId(null)
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: FONT_MONO, padding: '2px 6px', flexShrink: 0 }}
                          >Save</button>
                          <button
                            onClick={() => setEditingCmdId(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, fontFamily: FONT_MONO, padding: '2px 6px', flexShrink: 0 }}
                          >Cancel</button>
                        </div>
                      )
                    }
                    return (
                      <div key={cmd.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--elevated)' }}>
                        <span style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13, fontFamily: FONT_UI }}>{cmd.label}</span>
                        <span style={{ flex: 2, color: 'var(--text-faintest)', fontSize: 12, fontFamily: FONT_MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{cmd.command}</span>
                        <button
                          onClick={() => { setEditingCmdId(cmd.id); setEditLabel(cmd.label); setEditCommand(cmd.command) }}
                          title="Edit"
                          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, fontFamily: FONT_MONO, padding: '2px 4px' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                        >Edit</button>
                        <button
                          onClick={() => removeCustomCommand(cmd.id)}
                          title="Delete"
                          style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, fontFamily: FONT_MONO, padding: '2px 4px' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                        >Delete</button>
                      </div>
                    )
                  })}

                  {/* Add new command */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8 }}>
                    <input
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="Label"
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    />
                    <input
                      value={newCommand}
                      onChange={e => setNewCommand(e.target.value)}
                      placeholder="Shell command"
                      style={{ ...inputStyle, flex: 2 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newLabel.trim() && newCommand.trim()) {
                          addCustomCommand(newLabel.trim(), newCommand.trim())
                          setNewLabel('')
                          setNewCommand('')
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newLabel.trim() && newCommand.trim()) {
                          addCustomCommand(newLabel.trim(), newCommand.trim())
                          setNewLabel('')
                          setNewCommand('')
                        }
                      }}
                      disabled={!newLabel.trim() || !newCommand.trim()}
                      style={{
                        background: (newLabel.trim() && newCommand.trim()) ? 'var(--accent-dim)' : 'var(--elevated)',
                        border: (newLabel.trim() && newCommand.trim()) ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 4,
                        color: (newLabel.trim() && newCommand.trim()) ? 'var(--accent)' : 'var(--text-faintest)',
                        cursor: (newLabel.trim() && newCommand.trim()) ? 'pointer' : 'default',
                        fontFamily: FONT_MONO,
                        fontSize: 12,
                        padding: '4px 12px',
                        flexShrink: 0,
                      }}
                    >Add</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── DEVELOPER TAB ────────────────────────────────────── */}
          {tab === 'developer' && (
            <>
              <div style={sectionStyle}>
                <label style={labelStyle}>Onboarding</label>
                <div style={{ fontSize: TYPE.body, color: 'var(--text-dim)', fontFamily: FONT_MONO, marginBottom: SPACE.md, lineHeight: 1.5 }}>
                  Reset the onboarding tour so it shows again on next launch or when settings are closed.
                </div>
                <button
                  onClick={() => { updateSettings({ onboardingComplete: false }); closeSettings() }}
                  disabled={!settings.onboardingComplete}
                  style={{
                    background: settings.onboardingComplete ? 'var(--accent-dim)' : 'var(--elevated)',
                    border: settings.onboardingComplete ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 4,
                    color: settings.onboardingComplete ? 'var(--accent)' : 'var(--text-faintest)',
                    cursor: settings.onboardingComplete ? 'pointer' : 'default',
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    padding: '6px 14px',
                    opacity: settings.onboardingComplete ? 1 : 0.5,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (settings.onboardingComplete) e.currentTarget.style.opacity = '0.85' }}
                  onMouseLeave={e => { if (settings.onboardingComplete) e.currentTarget.style.opacity = '1' }}
                >
                  Reset Onboarding
                </button>
              </div>

              <div style={sectionStyle}>
                <label style={labelStyle}>Data</label>
                <div style={{ fontSize: TYPE.body, color: 'var(--text-dim)', fontFamily: FONT_MONO, marginBottom: SPACE.md, lineHeight: 1.5 }}>
                  Delete all saved data (terminals, folders, settings) and restart the app in a fresh state. This cannot be undone.
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Delete all saved data and restart? This cannot be undone.')) {
                      window.termAPI.resetAllData()
                    }
                  }}
                  style={{
                    background: 'var(--destructive-dim, rgba(255,59,48,0.1))',
                    border: '1px solid var(--destructive, #ff3b30)',
                    borderRadius: 4,
                    color: 'var(--destructive, #ff3b30)',
                    cursor: 'pointer',
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    padding: '6px 14px',
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Delete All Data &amp; Restart
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
