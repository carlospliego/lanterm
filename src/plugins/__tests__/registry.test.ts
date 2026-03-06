import { describe, it, expect, vi } from 'vitest'

// Mock useAppStore to break circular dependency (registry → manifests → components → useAppStore → registry)
vi.mock('../../renderer/store/useAppStore', () => ({
  useAppStore: vi.fn(() => false),
}))

import { allPlugins } from '../registry'

describe('plugin registry', () => {
  it('is sorted by order ascending', () => {
    for (let i = 1; i < allPlugins.length; i++) {
      expect(allPlugins[i].order).toBeGreaterThanOrEqual(allPlugins[i - 1].order)
    }
  })

  it('has no duplicate IDs', () => {
    const ids = allPlugins.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all plugins have required fields', () => {
    for (const p of allPlugins) {
      expect(typeof p.id).toBe('string')
      expect(p.id.length).toBeGreaterThan(0)
      expect(typeof p.name).toBe('string')
      expect(p.name.length).toBeGreaterThan(0)
      expect(typeof p.description).toBe('string')
      expect(typeof p.order).toBe('number')
      expect(p.PanelComponent).toBeDefined()
    }
  })

  it('contains known plugin IDs', () => {
    const ids = allPlugins.map(p => p.id)
    expect(ids).toContain('git')
    expect(ids).toContain('claudeHistory')
    expect(ids).toContain('worktree')
  })

  it('all plugins have a PanelComponent that is a function', () => {
    for (const p of allPlugins) {
      expect(typeof p.PanelComponent).toBe('function')
    }
  })

  it('has at least 4 plugins', () => {
    expect(allPlugins.length).toBeGreaterThanOrEqual(4)
  })
})
