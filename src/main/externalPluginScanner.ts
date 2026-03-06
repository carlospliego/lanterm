import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { ExternalPluginManifest, ExternalPluginPayload } from '../shared/externalPluginTypes'

const NATIVE_IDS = new Set(['git', 'claudeHistory'])

export function getPluginsDir(): string {
  const dir = path.join(app.getPath('userData'), 'plugins')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function validateManifest(data: unknown): data is ExternalPluginManifest {
  if (typeof data !== 'object' || data == null) return false
  const m = data as Record<string, unknown>
  return (
    typeof m.id === 'string' && m.id.length > 0 &&
    !NATIVE_IDS.has(m.id) &&
    typeof m.name === 'string' && m.name.length > 0 &&
    typeof m.description === 'string' && m.description.length > 0
  )
}

export function scanExternalPlugins(): ExternalPluginPayload[] {
  const dir = getPluginsDir()
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const payloads: ExternalPluginPayload[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pluginDir = path.join(dir, entry.name)
    const manifestPath = path.join(pluginDir, 'manifest.json')
    const rendererPath = path.join(pluginDir, 'renderer.js')

    if (!fs.existsSync(manifestPath) || !fs.existsSync(rendererPath)) {
      console.warn(`[external-plugins] Skipping ${entry.name}: missing manifest.json or renderer.js`)
      continue
    }

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw)
      if (!validateManifest(manifest)) {
        console.warn(`[external-plugins] Skipping ${entry.name}: invalid manifest`)
        continue
      }
      const rendererCode = fs.readFileSync(rendererPath, 'utf-8')
      payloads.push({ manifest, rendererCode })
    } catch (err) {
      console.warn(`[external-plugins] Skipping ${entry.name}:`, err)
    }
  }

  return payloads
}

export function removeExternalPlugin(pluginId: string): boolean {
  const dir = getPluginsDir()
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return false
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pluginDir = path.join(dir, entry.name)
    const manifestPath = path.join(pluginDir, 'manifest.json')
    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(raw)
      if (manifest.id === pluginId) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
        return true
      }
    } catch {
      continue
    }
  }
  return false
}

export function importExternalPlugin(sourcePath: string): { ok: boolean; error?: string } {
  const manifestPath = path.join(sourcePath, 'manifest.json')
  const rendererPath = path.join(sourcePath, 'renderer.js')

  if (!fs.existsSync(manifestPath)) {
    return { ok: false, error: 'Missing manifest.json' }
  }
  if (!fs.existsSync(rendererPath)) {
    return { ok: false, error: 'Missing renderer.js' }
  }

  let manifest: ExternalPluginManifest
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw)
    if (!validateManifest(manifest)) {
      return { ok: false, error: 'Invalid manifest: missing required fields or uses reserved id' }
    }
  } catch (err) {
    return { ok: false, error: `Failed to parse manifest: ${err}` }
  }

  const dest = path.join(getPluginsDir(), manifest.id)
  try {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    fs.cpSync(sourcePath, dest, { recursive: true })
  } catch (err) {
    return { ok: false, error: `Failed to copy plugin: ${err}` }
  }

  return { ok: true }
}
