import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { SidebarPlugin } from '../plugins/registry'
import type { ExternalPluginPayload } from '../shared/externalPluginTypes'
import { FONT_MONO, TYPE, RADIUS, SPACE, panelHeaderStyle, btnReset } from './designTokens'

const hostAPI = {
  React,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  FONT_MONO,
  TYPE,
  RADIUS,
  SPACE,
  panelHeaderStyle,
  btnReset,
}

function createErrorBoundary(pluginName: string): React.ComponentType<{ children: React.ReactNode }> {
  return class PluginErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
  > {
    state = { error: null as Error | null }

    static getDerivedStateFromError(error: Error) {
      return { error }
    }

    render() {
      if (this.state.error) {
        return React.createElement('div', {
          style: {
            padding: '8px 12px',
            fontSize: 11,
            fontFamily: FONT_MONO,
            color: 'var(--destructive)',
          },
        }, `Plugin "${pluginName}" error: ${this.state.error.message}`)
      }
      return this.props.children
    }
  }
}

function wrapComponent<P extends object>(
  Comp: React.ComponentType<P>,
  pluginName: string,
): React.ComponentType<P> {
  const Boundary = createErrorBoundary(pluginName)
  const Wrapped = (props: P) =>
    React.createElement(Boundary, null, React.createElement(Comp, props))
  Wrapped.displayName = `ExternalPlugin(${pluginName})`
  return Wrapped
}

export function loadExternalPlugin(payload: ExternalPluginPayload): SidebarPlugin | null {
  const { manifest, rendererCode } = payload
  try {
    const mod = { exports: {} as Record<string, unknown> }
    const factory = new Function('module', 'exports', 'host', rendererCode)
    factory(mod, mod.exports, hostAPI)

    const exported = typeof mod.exports === 'function' ? mod.exports : mod.exports.default || mod.exports
    let components: Record<string, unknown>
    if (typeof exported === 'function') {
      components = (exported as (host: typeof hostAPI) => Record<string, unknown>)(hostAPI)
    } else {
      components = exported as Record<string, unknown>
    }

    if (!components || typeof components.PanelComponent !== 'function') {
      console.warn(`[external-plugins] ${manifest.id}: renderer.js must export PanelComponent`)
      return null
    }

    const plugin: SidebarPlugin = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      order: manifest.order ?? 100,
      defaultInstalled: manifest.defaultInstalled,
      PanelComponent: wrapComponent(
        components.PanelComponent as React.ComponentType,
        manifest.name,
      ),
    }

    if (typeof components.SettingsComponent === 'function') {
      plugin.SettingsComponent = wrapComponent(
        components.SettingsComponent as React.ComponentType,
        manifest.name,
      )
    }
    if (typeof components.OverlayComponent === 'function') {
      plugin.OverlayComponent = wrapComponent(
        components.OverlayComponent as React.ComponentType,
        manifest.name,
      )
    }
    if (typeof components.MenuBarComponent === 'function') {
      plugin.MenuBarComponent = wrapComponent(
        components.MenuBarComponent as React.ComponentType<{ sessionId: string; cwd: string }>,
        manifest.name,
      )
    }

    return plugin
  } catch (err) {
    console.warn(`[external-plugins] Failed to load ${manifest.id}:`, err)
    return null
  }
}

export function loadAllExternalPlugins(payloads: ExternalPluginPayload[]): SidebarPlugin[] {
  const plugins: SidebarPlugin[] = []
  for (const payload of payloads) {
    const plugin = loadExternalPlugin(payload)
    if (plugin) plugins.push(plugin)
  }
  return plugins
}
