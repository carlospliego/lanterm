import { describe, it, expect } from 'vitest'

// Mock electron and child_process to avoid module-level import failures
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
}))
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}))

import { parsePorcelain } from '../worktreeHandlers'

describe('parsePorcelain', () => {
  it('parses a single worktree', () => {
    const output = `worktree /home/user/project
HEAD abc1234567890
branch refs/heads/main

`
    const result = parsePorcelain(output)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      path: '/home/user/project',
      head: 'abc1234567890',
      branchShort: 'main',
      isMain: true,
      isLocked: false,
      prunable: false,
    })
  })

  it('parses multiple worktrees', () => {
    const output = `worktree /home/user/project
HEAD abc1234567890
branch refs/heads/main

worktree /home/user/project-feature
HEAD def4567890123
branch refs/heads/feature/cool

`
    const result = parsePorcelain(output)
    expect(result).toHaveLength(2)
    expect(result[0].isMain).toBe(true)
    expect(result[0].branchShort).toBe('main')
    expect(result[1].isMain).toBe(false)
    expect(result[1].branchShort).toBe('feature/cool')
  })

  it('skips bare worktrees', () => {
    const output = `worktree /home/user/project.git
HEAD abc1234567890
bare

worktree /home/user/project-wt
HEAD def4567890123
branch refs/heads/main

`
    const result = parsePorcelain(output)
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('/home/user/project-wt')
    // isMain should be false because bare was first (isFirst consumed by bare then set false)
    expect(result[0].isMain).toBe(false)
  })

  it('handles detached HEAD', () => {
    const output = `worktree /home/user/project
HEAD abc1234567890abcdef1234567890abcdef12345678
detached

`
    const result = parsePorcelain(output)
    expect(result).toHaveLength(1)
    expect(result[0].branchShort).toBe('abc1234')
  })

  it('detects locked worktree', () => {
    const output = `worktree /home/user/project
HEAD abc1234567890
branch refs/heads/main
locked

`
    const result = parsePorcelain(output)
    expect(result[0].isLocked).toBe(true)
  })

  it('detects prunable worktree', () => {
    const output = `worktree /home/user/project
HEAD abc1234567890
branch refs/heads/main
prunable gitdir file points to non-existent location

`
    const result = parsePorcelain(output)
    expect(result[0].prunable).toBe(true)
  })

  it('strips refs/heads/ from branch', () => {
    const output = `worktree /path
HEAD abc
branch refs/heads/my-feature

`
    const result = parsePorcelain(output)
    expect(result[0].branchShort).toBe('my-feature')
  })

  it('first non-bare worktree is main', () => {
    const output = `worktree /repo
HEAD abc
branch refs/heads/main

worktree /repo-wt
HEAD def
branch refs/heads/dev

`
    const result = parsePorcelain(output)
    expect(result[0].isMain).toBe(true)
    expect(result[1].isMain).toBe(false)
  })

  it('returns empty for empty input', () => {
    expect(parsePorcelain('')).toEqual([])
  })

  it('handles both locked and prunable', () => {
    const output = `worktree /path
HEAD abc
branch refs/heads/test
locked
prunable gitdir file points to non-existent location

`
    const result = parsePorcelain(output)
    expect(result[0].isLocked).toBe(true)
    expect(result[0].prunable).toBe(true)
  })
})
