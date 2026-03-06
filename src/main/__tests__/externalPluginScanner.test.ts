import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mocks
const mockExistsSync = vi.fn()
const mockReaddirSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockMkdirSync = vi.fn()
const mockRmSync = vi.fn()
const mockCpSync = vi.fn()

vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userData',
  },
}))

vi.mock('fs', () => {
  const fsMock = {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readdirSync: (...args: any[]) => mockReaddirSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
    rmSync: (...args: any[]) => mockRmSync(...args),
    cpSync: (...args: any[]) => mockCpSync(...args),
  }
  return { ...fsMock, default: fsMock }
})

// Reset modules each test to clear NATIVE_IDS-related caching
describe('externalPluginScanner', () => {
  beforeEach(() => {
    mockExistsSync.mockReset()
    mockReaddirSync.mockReset()
    mockReadFileSync.mockReset()
    mockMkdirSync.mockReset()
    mockRmSync.mockReset()
    mockCpSync.mockReset()
  })

  describe('validateManifest (via scanExternalPlugins)', () => {
    it('rejects null', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return 'null'
        return 'code'
      })
      const result = scanExternalPlugins()
      expect(result).toHaveLength(0)
    })

    it('rejects manifest with empty id', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return JSON.stringify({ id: '', name: 'X', description: 'X' })
        return 'code'
      })
      const result = scanExternalPlugins()
      expect(result).toHaveLength(0)
    })

    it('rejects native IDs (git, claudeHistory)', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return JSON.stringify({ id: 'git', name: 'Git', description: 'desc' })
        return 'code'
      })
      const result = scanExternalPlugins()
      expect(result).toHaveLength(0)
    })

    it('rejects manifest missing name', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return JSON.stringify({ id: 'myPlugin', description: 'desc' })
        return 'code'
      })
      const result = scanExternalPlugins()
      expect(result).toHaveLength(0)
    })

    it('accepts valid manifest', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return JSON.stringify({ id: 'myPlugin', name: 'My Plugin', description: 'A plugin' })
        return 'renderer code here'
      })
      const result = scanExternalPlugins()
      expect(result).toHaveLength(1)
      expect(result[0].manifest.id).toBe('myPlugin')
      expect(result[0].rendererCode).toBe('renderer code here')
    })
  })

  describe('scanExternalPlugins', () => {
    it('returns empty when directory read fails', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation(() => { throw new Error('EPERM') })
      expect(scanExternalPlugins()).toEqual([])
    })

    it('skips non-directory entries', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        { name: 'file.txt', isDirectory: () => false },
      ])
      expect(scanExternalPlugins()).toEqual([])
    })

    it('skips entries missing manifest.json or renderer.js', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('plugins')) return true
        return false // neither manifest.json nor renderer.js exist
      })
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      expect(scanExternalPlugins()).toEqual([])
    })

    it('scans multiple valid plugins', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([
        { name: 'plugin-a', isDirectory: () => true },
        { name: 'plugin-b', isDirectory: () => true },
      ])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('plugin-a') && p.endsWith('manifest.json'))
          return JSON.stringify({ id: 'pluginA', name: 'A', description: 'Plugin A' })
        if (p.includes('plugin-b') && p.endsWith('manifest.json'))
          return JSON.stringify({ id: 'pluginB', name: 'B', description: 'Plugin B' })
        return 'code'
      })
      const result = scanExternalPlugins()
      expect(result).toHaveLength(2)
    })

    it('handles JSON parse errors gracefully', async () => {
      const { scanExternalPlugins } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'plugin1', isDirectory: () => true }])
      mockReadFileSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return '{invalid-json'
        return 'code'
      })
      expect(scanExternalPlugins()).toEqual([])
    })
  })

  describe('importExternalPlugin', () => {
    it('returns error when manifest.json missing', async () => {
      const { importExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockImplementation((p: string) => !p.endsWith('manifest.json'))
      const result = importExternalPlugin('/source')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('manifest.json')
    })

    it('returns error when renderer.js missing', async () => {
      const { importExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith('manifest.json')) return true
        if (p.endsWith('renderer.js')) return false
        return true
      })
      const result = importExternalPlugin('/source')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('renderer.js')
    })

    it('returns error for invalid manifest', async () => {
      const { importExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({ id: '', name: '', description: '' }))
      const result = importExternalPlugin('/source')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Invalid manifest')
    })

    it('copies plugin on success', async () => {
      const { importExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockImplementation((p: string) => {
        // Plugin destination does not exist yet (for rmSync check)
        if (p.includes('/mock/userData/plugins/myPlugin')) return false
        return true
      })
      mockReadFileSync.mockReturnValue(JSON.stringify({ id: 'myPlugin', name: 'My Plugin', description: 'A plugin' }))
      const result = importExternalPlugin('/source')
      expect(result.ok).toBe(true)
      expect(mockCpSync).toHaveBeenCalled()
    })
  })

  describe('removeExternalPlugin', () => {
    it('removes plugin by id', async () => {
      const { removeExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'my-plugin', isDirectory: () => true }])
      mockReadFileSync.mockReturnValue(JSON.stringify({ id: 'myPlugin' }))
      const result = removeExternalPlugin('myPlugin')
      expect(result).toBe(true)
      expect(mockRmSync).toHaveBeenCalled()
    })

    it('returns false when plugin not found', async () => {
      const { removeExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue([{ name: 'other', isDirectory: () => true }])
      mockReadFileSync.mockReturnValue(JSON.stringify({ id: 'otherPlugin' }))
      const result = removeExternalPlugin('nonexistent')
      expect(result).toBe(false)
    })

    it('returns false when directory read fails', async () => {
      const { removeExternalPlugin } = await import('../externalPluginScanner')
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockImplementation(() => { throw new Error('EPERM') })
      expect(removeExternalPlugin('myPlugin')).toBe(false)
    })
  })
})
