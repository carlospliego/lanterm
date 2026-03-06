import { ipcMain, type BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { GIT_IPC } from '../shared/channels'
import { unwatchTerminal, watchTerminal } from './gitWatcher'

const execFileAsync = promisify(execFile)

let getWindows: () => Set<BrowserWindow> = () => new Set()

export function registerGitHandlers(getWin: () => Set<BrowserWindow>) {
  getWindows = getWin

  ipcMain.handle(GIT_IPC.GIT_BRANCH, async (_event, { id, cwd }: { id: string; cwd: string }) => {
    unwatchTerminal(id)
    try {
      const opts = { cwd, timeout: 3000 }
      const [rootResult, ...rest] = await Promise.allSettled([
        execFileAsync('git', ['rev-parse', '--show-toplevel'], opts),
        execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts),
        execFileAsync('git', ['status', '--porcelain'], opts),
        execFileAsync('git', ['rev-list', '@{u}..HEAD', '--count'], opts),
        execFileAsync('git', ['rev-parse', '--git-dir'], opts),
      ])
      const [branchResult, statusResult, aheadResult, gitDirResult] = rest
      if (branchResult.status === 'rejected') return null
      const branch = branchResult.value.stdout.trim()
      if (!branch) return null
      const files = statusResult.status === 'fulfilled'
        ? statusResult.value.stdout.trim().split('\n').filter(Boolean)
        : []
      const dirty = files.length > 0
      const ahead = aheadResult.status === 'fulfilled'
        ? parseInt(aheadResult.value.stdout.trim(), 10) || 0
        : 0
      const gitDir = gitDirResult.status === 'fulfilled' ? gitDirResult.value.stdout.trim() : ''
      const isWorktree = gitDir.includes('/.git/worktrees/')
      if (rootResult.status === 'fulfilled') {
        const gitRoot = rootResult.value.stdout.trim()
        if (gitRoot) watchTerminal(id, gitRoot, getWindows)
      }
      const gitRoot = rootResult.status === 'fulfilled' ? rootResult.value.stdout.trim() : ''
      return { branch, dirty, ahead, files, isWorktree, worktreePath: isWorktree ? gitRoot : undefined }
    } catch {
      return null
    }
  })

  ipcMain.handle(GIT_IPC.GIT_UNWATCH, (_event, { id }: { id: string }) => {
    unwatchTerminal(id)
  })

  ipcMain.handle(GIT_IPC.GIT_GRAPH, async (_event, { id: _id, cwd, maxCommits }: { id: string; cwd: string; maxCommits?: number }) => {
    const limit = String(maxCommits ?? 150)
    const opts = { cwd, timeout: 5000 }
    const [branchResult, logResult, statusResult, aheadResult, diffTreeResult] = await Promise.allSettled([
      execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts),
      execFileAsync('git', [
        'log', '--all', '--topo-order',
        '--pretty=format:%H\x1f%P\x1f%D\x1f%s\x1f%an\x1f%ar',
        '-n', limit,
      ], opts),
      execFileAsync('git', ['status', '--porcelain'], opts),
      execFileAsync('git', ['rev-list', '@{u}..HEAD', '--count'], opts),
      execFileAsync('git', ['diff-tree', '--no-commit-id', '--name-status', '-r', 'HEAD'], opts),
    ])

    if (branchResult.status === 'rejected') return null
    const branch = branchResult.value.stdout.trim()
    if (!branch) return null

    const files = statusResult.status === 'fulfilled'
      ? statusResult.value.stdout.trim().split('\n').filter(Boolean) : []
    const ahead = aheadResult.status === 'fulfilled'
      ? parseInt(aheadResult.value.stdout.trim(), 10) || 0 : 0

    const commits: Array<{
      hash: string; shortHash: string; parents: string[];
      refs: string[]; subject: string; author: string; relativeTime: string
    }> = []

    if (logResult.status === 'fulfilled') {
      for (const line of logResult.value.stdout.split('\n')) {
        const parts = line.split('\x1f')
        if (parts.length < 6) continue
        const [hash, parentsRaw, refsRaw, subject, author, relativeTime] = parts
        commits.push({
          hash,
          shortHash: hash.slice(0, 7),
          parents: parentsRaw.trim().split(' ').filter(Boolean),
          refs: refsRaw.trim().split(', ').filter(Boolean),
          subject: subject.trim(),
          author,
          relativeTime,
        })
      }
    }

    const headFiles: Array<{ status: string; file: string }> = []
    if (diffTreeResult.status === 'fulfilled') {
      for (const line of diffTreeResult.value.stdout.trim().split('\n')) {
        if (!line) continue
        const [status, ...rest] = line.split('\t')
        if (status && rest.length > 0) headFiles.push({ status: status.trim(), file: rest.join('\t') })
      }
    }

    return { commits, branch, dirty: files.length > 0, ahead, files, headFiles }
  })

  ipcMain.handle(GIT_IPC.GIT_PULL, async (_event, { cwd }: { cwd: string }) => {
    try {
      await execFileAsync('git', ['pull'], { cwd, timeout: 30000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_FETCH, async (_event, { cwd }: { cwd: string }) => {
    try {
      await execFileAsync('git', ['fetch'], { cwd, timeout: 30000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_STASH, async (_event, { cwd }: { cwd: string }) => {
    try {
      await execFileAsync('git', ['stash'], { cwd, timeout: 10000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_STASH_POP, async (_event, { cwd }: { cwd: string }) => {
    try {
      await execFileAsync('git', ['stash', 'pop'], { cwd, timeout: 10000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_LIST_BRANCHES, async (_event, { cwd }: { cwd: string }) => {
    try {
      const { stdout } = await execFileAsync('git', ['branch', '--format=%(refname:short)'], { cwd, timeout: 5000 })
      const branches = stdout.trim().split('\n').filter(Boolean)
      return { ok: true, branches }
    } catch (err: any) {
      return { ok: false, branches: [], error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_CHECKOUT, async (_event, { cwd, branch }: { cwd: string; branch: string }) => {
    try {
      await execFileAsync('git', ['checkout', branch], { cwd, timeout: 10000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_COMMIT, async (_event, { cwd, message }: { cwd: string; message: string }) => {
    try {
      await execFileAsync('git', ['commit', '-m', message], { cwd, timeout: 10000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_PUSH, async (_event, { cwd }: { cwd: string }) => {
    try {
      await execFileAsync('git', ['push'], { cwd, timeout: 30000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_STATUS, async (_event, { cwd }: { cwd: string }) => {
    try {
      const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd, timeout: 5000 })
      const files = stdout.trim().split('\n').filter(Boolean)
      return { ok: true, files }
    } catch (err: any) {
      return { ok: false, files: [], error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(GIT_IPC.GIT_ADD_ALL, async (_event, { cwd }: { cwd: string }) => {
    try {
      await execFileAsync('git', ['add', '-A'], { cwd, timeout: 10000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })
}

export function unregisterGitHandlers() {
  Object.values(GIT_IPC).forEach(ch => {
    ipcMain.removeHandler(ch)
  })
}
