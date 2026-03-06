import { useState, useEffect } from 'react'
import type { SidebarPlugin } from '../plugins/registry'
import { allPlugins } from '../plugins/registry'
import { loadAllExternalPlugins } from './externalPluginLoader'
import { useAppStore } from './store/useAppStore'

const BUILTIN_IDS = new Set(allPlugins.map(p => p.id))

let cachedExternalPlugins: SidebarPlugin[] = []
const listeners = new Set<() => void>()

function notify() {
  for (const cb of listeners) cb()
}

export async function scanAndLoadExternalPlugins(): Promise<void> {
  try {
    const payloads = await window.termAPI.externalPluginsScan()
    cachedExternalPlugins = loadAllExternalPlugins(payloads)

    // Auto-install plugins with defaultInstalled: true
    const { installedPlugins, installPlugin } = useAppStore.getState()
    for (const plugin of cachedExternalPlugins) {
      if (plugin.defaultInstalled && !installedPlugins.includes(plugin.id)) {
        installPlugin(plugin.id)
      }
    }

    notify()
  } catch (err) {
    console.warn('[external-plugins] Scan failed:', err)
  }
}

export function useExternalPlugins(): SidebarPlugin[] {
  const [, setTick] = useState(0)

  useEffect(() => {
    const cb = () => setTick(t => t + 1)
    listeners.add(cb)
    return () => { listeners.delete(cb) }
  }, [])

  return cachedExternalPlugins
}

export function useCombinedPlugins(): SidebarPlugin[] {
  const external = useExternalPlugins()
  return [...allPlugins, ...external].sort((a, b) => a.order - b.order)
}

export function isExternalPlugin(id: string): boolean {
  return !BUILTIN_IDS.has(id)
}
