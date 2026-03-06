import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useCombinedPlugins, isExternalPlugin, scanAndLoadExternalPlugins } from '../useExternalPlugins'
import { FONT_UI, FONT_MONO, TYPE, RADIUS } from '../designTokens'
import { PuzzlePieceIcon } from './ActivityBarIcons'
import { IconDisplay } from './IconDisplay'
import { EmojiPickerContent } from './EmojiPickerContent'
import type { SidebarPlugin } from '../../plugins/registry'

export function PluginGallery() {
  const { pluginGalleryOpen, closePluginGallery, installedPlugins, installPlugin, uninstallPlugin } = useAppStore()
  const pluginIconOverrides = useAppStore(s => s.pluginIconOverrides)
  const setPluginIconOverride = useAppStore(s => s.setPluginIconOverride)
  const combinedPlugins = useCombinedPlugins()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  // Select first plugin on open
  useEffect(() => {
    if (pluginGalleryOpen && combinedPlugins.length > 0) {
      setSelectedId(combinedPlugins[0].id)
      setIconPickerOpen(false)
    }
    if (!pluginGalleryOpen) {
      setSelectedId(null)
      setIconPickerOpen(false)
    }
  }, [pluginGalleryOpen])

  useEffect(() => {
    if (!pluginGalleryOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closePluginGallery() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pluginGalleryOpen, closePluginGallery])

  if (!pluginGalleryOpen) return null

  const selectedPlugin = combinedPlugins.find(p => p.id === selectedId) ?? null

  const handleImport = async () => {
    const result = await window.termAPI.externalPluginImport()
    if (result.ok) {
      await scanAndLoadExternalPlugins()
    }
  }

  const handleRemoveExternal = async (pluginId: string) => {
    await window.termAPI.externalPluginRemove(pluginId)
    uninstallPlugin(pluginId)
    await scanAndLoadExternalPlugins()
    if (selectedId === pluginId) {
      setSelectedId(combinedPlugins[0]?.id ?? null)
    }
  }

  return (
    <div
      data-testid="plugin-gallery"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) closePluginGallery() }}
    >
      <div
        style={{
          width: 780,
          maxWidth: '94vw',
          maxHeight: '82vh',
          background: 'var(--surface)',
          borderRadius: RADIUS.lg,
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
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{
            fontSize: TYPE.lg,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            fontFamily: FONT_UI,
          }}>Plugins</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => window.termAPI.externalPluginsOpenDir()}
              title="Open plugins folder"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: RADIUS.md,
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontFamily: FONT_MONO,
                fontSize: TYPE.body,
                padding: '2px 8px',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >Open Folder</button>
            <button
              onClick={handleImport}
              title="Import plugin from folder"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: RADIUS.md,
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontFamily: FONT_MONO,
                fontSize: TYPE.body,
                padding: '2px 8px',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-faintest)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >Import...</button>
            <button
              onClick={closePluginGallery}
              style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
            >&times;</button>
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Left column — plugin list */}
          <div style={{
            width: 240,
            flexShrink: 0,
            overflowY: 'auto',
            borderRight: '1px solid var(--border-subtle)',
            padding: '4px 0',
          }}>
            {combinedPlugins.map(plugin => (
              <PluginListRow
                key={plugin.id}
                plugin={plugin}
                selected={selectedId === plugin.id}
                installed={installedPlugins.includes(plugin.id)}
                iconOverride={pluginIconOverrides[plugin.id]}
                onClick={() => {
                  setSelectedId(plugin.id)
                  setIconPickerOpen(false)
                }}
              />
            ))}
          </div>

          {/* Right column — detail pane */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {selectedPlugin ? (
              <PluginDetailPane
                plugin={selectedPlugin}
                installed={installedPlugins.includes(selectedPlugin.id)}
                external={isExternalPlugin(selectedPlugin.id)}
                iconOverride={pluginIconOverrides[selectedPlugin.id]}
                iconPickerOpen={iconPickerOpen}
                onToggleIconPicker={() => setIconPickerOpen(!iconPickerOpen)}
                onIconSelect={icon => setPluginIconOverride(selectedPlugin.id, icon)}
                onInstall={() => installPlugin(selectedPlugin.id)}
                onUninstall={() => {
                  if (isExternalPlugin(selectedPlugin.id)) {
                    handleRemoveExternal(selectedPlugin.id)
                  } else {
                    uninstallPlugin(selectedPlugin.id)
                  }
                }}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-faintest)',
                fontFamily: FONT_MONO,
                fontSize: TYPE.body,
              }}>
                Select a plugin
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PluginListRow({
  plugin,
  selected,
  installed,
  iconOverride,
  onClick,
}: {
  plugin: SidebarPlugin
  selected: boolean
  installed: boolean
  iconOverride?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const Icon = plugin.icon ?? PuzzlePieceIcon

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        cursor: 'pointer',
        background: selected
          ? 'var(--selection-bg)'
          : hovered
            ? 'var(--elevated)'
            : 'transparent',
        transition: 'background 0.08s',
      }}
    >
      {/* Plugin icon */}
      <div style={{
        width: 18,
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: selected ? 'var(--accent)' : 'var(--text-muted)',
      }}>
        {iconOverride ? (
          <IconDisplay icon={iconOverride} style={{ fontSize: 14 }} />
        ) : (
          <Icon size={14} />
        )}
      </div>

      {/* Name */}
      <span style={{
        flex: 1,
        fontSize: TYPE.body,
        fontFamily: FONT_UI,
        fontWeight: selected ? 600 : 400,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {plugin.name}
      </span>

      {/* Installed dot */}
      {installed && (
        <div style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: 'var(--accent)',
          flexShrink: 0,
        }} />
      )}
    </div>
  )
}

function PluginDetailPane({
  plugin,
  installed,
  external,
  iconOverride,
  iconPickerOpen,
  onToggleIconPicker,
  onIconSelect,
  onInstall,
  onUninstall,
}: {
  plugin: SidebarPlugin
  installed: boolean
  external: boolean
  iconOverride?: string
  iconPickerOpen: boolean
  onToggleIconPicker: () => void
  onIconSelect: (icon: string | undefined) => void
  onInstall: () => void
  onUninstall: () => void
}) {
  const Icon = plugin.icon ?? PuzzlePieceIcon

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          {iconOverride ? (
            <IconDisplay icon={iconOverride} style={{ fontSize: 20 }} />
          ) : (
            <Icon size={20} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: TYPE.lg,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: FONT_UI,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {plugin.name}
            {external && (
              <span style={{
                fontSize: 9,
                fontFamily: FONT_MONO,
                color: 'var(--text-faintest)',
                border: '1px solid var(--border)',
                borderRadius: RADIUS.sm,
                padding: '1px 4px',
                fontWeight: 400,
              }}>External</span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: TYPE.body,
        color: 'var(--text-muted)',
        fontFamily: FONT_MONO,
        lineHeight: 1.5,
      }}>
        {plugin.description}
      </div>

      {/* Icon section */}
      <div style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: RADIUS.md,
        overflow: 'hidden',
      }}>
        <div
          onClick={onToggleIconPicker}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ fontSize: 9, color: 'var(--text-faintest)' }}>
            {iconPickerOpen ? '\u25BC' : '\u25B6'}
          </span>
          <span style={{
            fontSize: TYPE.body,
            fontFamily: FONT_UI,
            color: 'var(--text-secondary)',
            fontWeight: 500,
          }}>Icon</span>
          <div style={{ flex: 1 }} />
          <div style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}>
            {iconOverride ? (
              <IconDisplay icon={iconOverride} style={{ fontSize: 14 }} />
            ) : (
              <Icon size={14} />
            )}
          </div>
          {iconOverride && (
            <button
              onClick={e => {
                e.stopPropagation()
                onIconSelect(undefined)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-faintest)',
                cursor: 'pointer',
                fontSize: TYPE.sm,
                fontFamily: FONT_UI,
                padding: '2px 4px',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
            >Reset</button>
          )}
        </div>
        {iconPickerOpen && (
          <div style={{
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 300,
            overflow: 'hidden',
          }}>
            <EmojiPickerContent
              autoFocus={false}
              onSelect={icon => onIconSelect(icon)}
            />
          </div>
        )}
      </div>

      {/* Settings section */}
      {installed && plugin.SettingsComponent && (
        <div style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: RADIUS.md,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '8px 12px',
            fontSize: TYPE.body,
            fontFamily: FONT_UI,
            color: 'var(--text-secondary)',
            fontWeight: 500,
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            Settings
          </div>
          <div style={{ background: 'var(--bg)', fontFamily: FONT_MONO }}>
            <plugin.SettingsComponent />
          </div>
        </div>
      )}

      {/* Action button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={e => {
            e.stopPropagation()
            if (installed) onUninstall()
            else onInstall()
          }}
          style={{
            background: installed ? 'var(--accent-dim)' : 'transparent',
            border: installed ? '1px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: RADIUS.md,
            color: installed ? 'var(--accent)' : 'var(--text-dim)',
            cursor: 'pointer',
            fontFamily: FONT_MONO,
            fontSize: TYPE.body,
            padding: '4px 16px',
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => {
            if (!installed) e.currentTarget.style.borderColor = 'var(--text-faintest)'
          }}
          onMouseLeave={e => {
            if (!installed) e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          {installed ? (external ? 'Remove' : 'Installed') : 'Install'}
        </button>
      </div>
    </div>
  )
}
