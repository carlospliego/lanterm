import React, { useState, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { FONT_MONO } from '../designTokens'
import { PuzzlePieceIcon, GearIcon } from './ActivityBarIcons'
import { IconDisplay } from './IconDisplay'
import type { SidebarPlugin } from '../../plugins/registry'

const BAR_WIDTH = 36
const ICON_SIZE = 16

function PluginBadge({ plugin }: { plugin: SidebarPlugin }) {
  if (!plugin.useBadge) return null
  const badge = plugin.useBadge()
  if (!badge || !badge.count) return null
  const display = badge.count > 99 ? '99+' : String(badge.count)
  return (
    <span
      style={{
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'var(--accent)',
        color: '#fff',
        fontSize: 9,
        fontWeight: 700,
        fontFamily: FONT_MONO,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3px',
        pointerEvents: 'none',
        lineHeight: 1,
        zIndex: 2,
      }}
    >
      {display}
    </span>
  )
}

function ActivityBarButton({
  plugin,
  isActive,
  onClick,
  shortcutLabel,
}: {
  plugin: SidebarPlugin
  isActive: boolean
  onClick: () => void
  shortcutLabel?: string
}) {
  const [hovered, setHovered] = useState(false)
  const iconOverride = useAppStore(s => s.pluginIconOverrides[plugin.id])
  const Icon = plugin.icon ?? PuzzlePieceIcon
  const color = isActive
    ? 'var(--accent)'
    : hovered
      ? 'var(--text-muted)'
      : 'var(--text-faintest)'

  const title = shortcutLabel ? `${plugin.name} (${shortcutLabel})` : plugin.name

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        width: BAR_WIDTH,
        height: BAR_WIDTH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color,
        backgroundColor: isActive || hovered ? 'var(--elevated)' : 'transparent',
        transition: 'color 0.1s, background-color 0.1s',
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            borderRadius: 1,
            backgroundColor: 'var(--accent)',
          }}
        />
      )}
      {iconOverride ? (
        <IconDisplay icon={iconOverride} style={{ fontSize: ICON_SIZE, color }} />
      ) : (
        <Icon size={ICON_SIZE} />
      )}
      <PluginBadge plugin={plugin} />
    </button>
  )
}

function ActivityBarItem({
  plugin,
  activeRightPlugin,
  setActiveRightPlugin,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  shortcutLabel,
}: {
  plugin: SidebarPlugin
  activeRightPlugin: string | null
  setActiveRightPlugin: (id: string | null) => void
  dropPosition: 'before' | 'after' | null
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent) => void
  shortcutLabel?: string
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      style={{ position: 'relative' }}
    >
      {dropPosition === 'before' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 6,
          right: 6,
          height: 2,
          backgroundColor: 'var(--accent)',
          borderRadius: 1,
          zIndex: 1,
        }} />
      )}
      <ActivityBarButton
        plugin={plugin}
        isActive={activeRightPlugin === plugin.id}
        shortcutLabel={shortcutLabel}
        onClick={() => {
          if (activeRightPlugin === plugin.id) {
            setActiveRightPlugin(null)
          } else {
            setActiveRightPlugin(plugin.id)
          }
        }}
      />
      {dropPosition === 'after' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 6,
          right: 6,
          height: 2,
          backgroundColor: 'var(--accent)',
          borderRadius: 1,
          zIndex: 1,
        }} />
      )}
    </div>
  )
}

export function ActivityBar({ plugins }: { plugins: SidebarPlugin[] }) {
  const activeRightPlugin = useAppStore(s => s.activeRightPlugin)
  const setActiveRightPlugin = useAppStore(s => s.setActiveRightPlugin)
  const reorderPlugin = useAppStore(s => s.reorderPlugin)
  const openPluginGallery = useAppStore(s => s.openPluginGallery)
  const [gearHovered, setGearHovered] = useState(false)

  const draggedIdRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null)

  const handleDragStart = (pluginId: string) => (e: React.DragEvent) => {
    draggedIdRef.current = pluginId
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (pluginId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedIdRef.current || draggedIdRef.current === pluginId) {
      setDropTarget(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'before' : 'after'
    setDropTarget({ id: pluginId, position })
  }

  const handleDrop = (pluginId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedIdRef.current || draggedIdRef.current === pluginId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const before = e.clientY < midY
    reorderPlugin(draggedIdRef.current, pluginId, before)
    draggedIdRef.current = null
    setDropTarget(null)
  }

  const handleDragEnd = () => {
    draggedIdRef.current = null
    setDropTarget(null)
  }

  return (
    <div
      data-testid="activity-bar"
      data-tour="activity-bar"
      style={{
        width: BAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT_MONO,
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
        {plugins.map((plugin, i) => (
          <ActivityBarItem
            key={plugin.id}
            plugin={plugin}
            activeRightPlugin={activeRightPlugin}
            setActiveRightPlugin={setActiveRightPlugin}
            dropPosition={dropTarget?.id === plugin.id ? dropTarget.position : null}
            onDragStart={handleDragStart(plugin.id)}
            onDragOver={handleDragOver(plugin.id)}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop(plugin.id)}
            shortcutLabel={i < 9 ? `\u2318${i + 1}` : undefined}
          />
        ))}
      </div>
      <button
        onClick={openPluginGallery}
        onMouseEnter={() => setGearHovered(true)}
        onMouseLeave={() => setGearHovered(false)}
        title="Plugin gallery"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          width: BAR_WIDTH,
          height: BAR_WIDTH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: gearHovered ? 'var(--text-muted)' : 'var(--text-faintest)',
          backgroundColor: gearHovered ? 'var(--elevated)' : 'transparent',
          transition: 'color 0.1s, background-color 0.1s',
          flexShrink: 0,
        }}
      >
        <GearIcon size={ICON_SIZE} />
      </button>
    </div>
  )
}
