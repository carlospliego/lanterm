import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import { WORKTREE_IPC } from '../shared/channels'
import type { WorktreeInfo, WorktreeListResult, WorktreeCreateArgs, WorktreeRemoveArgs, WorktreeResult, WorktreeMergeArgs, WorktreePrInfo, RepoWorktreeGroup, MultiRepoWorktreeResult } from '../shared/types'

const execFileAsync = promisify(execFile)

export function parsePorcelain(output: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = []
  const blocks = output.trim().split('\n\n')
  let isFirst = true

  for (const block of blocks) {
    if (!block.trim()) continue
    const lines = block.split('\n')
    let wtPath = ''
    let head = ''
    let branchShort = ''
    let isLocked = false
    let prunable = false
    let isBare = false

    for (const line of lines) {
      if (line.startsWith('worktree ')) wtPath = line.slice('worktree '.length)
      else if (line.startsWith('HEAD ')) head = line.slice('HEAD '.length)
      else if (line.startsWith('branch ')) {
        const ref = line.slice('branch '.length)
        branchShort = ref.replace(/^refs\/heads\//, '')
      }
      else if (line === 'detached') branchShort = head.slice(0, 7)
      else if (line === 'locked') isLocked = true
      else if (line.startsWith('prunable ')) prunable = true
      else if (line === 'bare') isBare = true
    }

    if (isBare) { isFirst = false; continue }

    worktrees.push({
      path: wtPath,
      head,
      branchShort: branchShort || '(unknown)',
      isMain: isFirst,
      isLocked,
      prunable,
    })
    isFirst = false
  }

  return worktrees
}

const SKIP_DIRS = new Set(['.git', 'node_modules', '.hg', '.svn', 'vendor', 'dist', 'build', '.next', '.cache'])
const MAX_REPOS = 20

async function findGitRepos(parentDir: string): Promise<string[]> {
  const repos: string[] = []
  let entries: import('fs').Dirent[]
  try {
    entries = await fs.readdir(parentDir, { withFileTypes: true })
  } catch {
    return repos
  }
  // Only check immediate children for .git
  await Promise.all(
    entries
      .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.'))
      .slice(0, MAX_REPOS)
      .map(async (e) => {
        const childDir = path.join(parentDir, e.name)
        try {
          await fs.access(path.join(childDir, '.git'))
          repos.push(childDir)
        } catch { /* not a git repo */ }
      })
  )
  return repos.sort()
}

export function registerWorktreeHandlers() {
  ipcMain.handle(WORKTREE_IPC.LIST, async (_event, { cwd }: { cwd: string }): Promise<WorktreeListResult | null> => {
    try {
      const opts = { cwd, timeout: 5000 }
      const [rootResult, listResult] = await Promise.all([
        execFileAsync('git', ['rev-parse', '--show-toplevel'], opts),
        execFileAsync('git', ['worktree', 'list', '--porcelain'], opts),
      ])
      const gitRoot = rootResult.stdout.trim()
      const worktrees = parsePorcelain(listResult.stdout)
      return { worktrees, gitRoot }
    } catch {
      return null
    }
  })

  ipcMain.handle(WORKTREE_IPC.LIST_MULTI, async (_event, { cwd }: { cwd: string }): Promise<MultiRepoWorktreeResult | null> => {
    try {
      const repoPaths = await findGitRepos(cwd)
      if (repoPaths.length === 0) return null

      const results = await Promise.allSettled(
        repoPaths.map(async (repoPath): Promise<RepoWorktreeGroup> => {
          const opts = { cwd: repoPath, timeout: 5000 }
          const [rootResult, listResult] = await Promise.all([
            execFileAsync('git', ['rev-parse', '--show-toplevel'], opts),
            execFileAsync('git', ['worktree', 'list', '--porcelain'], opts),
          ])
          return {
            repoName: path.basename(rootResult.stdout.trim()),
            gitRoot: rootResult.stdout.trim(),
            worktrees: parsePorcelain(listResult.stdout),
          }
        })
      )

      const repos = results
        .filter((r): r is PromiseFulfilledResult<RepoWorktreeGroup> => r.status === 'fulfilled')
        .map(r => r.value)
        .sort((a, b) => a.repoName.localeCompare(b.repoName))

      return repos.length > 0 ? { repos } : null
    } catch {
      return null
    }
  })

  ipcMain.handle(WORKTREE_IPC.CREATE, async (_event, args: WorktreeCreateArgs): Promise<WorktreeResult> => {
    try {
      const opts = { cwd: args.cwd, timeout: 10000 }

      let wtPath = args.path
      if (!wtPath) {
        const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], opts)
        const gitRoot = stdout.trim()
        const repoParent = path.dirname(gitRoot)
        const repoName = path.basename(gitRoot)
        wtPath = path.join(repoParent, `${repoName}-${args.branch}`)
      }

      const gitArgs = ['worktree', 'add']
      if (args.createBranch !== false) gitArgs.push('-b', args.branch)
      gitArgs.push(wtPath)
      if (args.baseBranch) gitArgs.push(args.baseBranch)
      if (args.createBranch === false) gitArgs.push(args.branch)

      await execFileAsync('git', gitArgs, opts)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(WORKTREE_IPC.REMOVE, async (_event, args: WorktreeRemoveArgs): Promise<WorktreeResult> => {
    try {
      const gitArgs = ['worktree', 'remove']
      if (args.force) gitArgs.push('--force')
      gitArgs.push(args.worktreePath)

      await execFileAsync('git', gitArgs, { cwd: args.cwd, timeout: 10000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(WORKTREE_IPC.PRUNE, async (_event, { cwd }: { cwd: string }): Promise<WorktreeResult> => {
    try {
      await execFileAsync('git', ['worktree', 'prune'], { cwd, timeout: 5000 })
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(WORKTREE_IPC.REMOTE_URL, async (_event, { cwd }: { cwd: string }): Promise<{ ok: boolean; url?: string; error?: string }> => {
    try {
      const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd, timeout: 5000 })
      let url = stdout.trim()
      // Convert SSH URLs to HTTPS
      const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
      if (sshMatch) {
        url = `https://${sshMatch[1]}/${sshMatch[2]}`
      } else {
        url = url.replace(/\.git$/, '')
      }
      return { ok: true, url }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })

  ipcMain.handle(WORKTREE_IPC.PR_STATUS, async (_event, { cwd }: { cwd: string }): Promise<{ ok: boolean; prs?: WorktreePrInfo[]; error?: string }> => {
    try {
      const { stdout } = await execFileAsync('gh', ['pr', 'list', '--json', 'headRefName,url,number,state', '--limit', '100'], { cwd, timeout: 10000 })
      const raw = JSON.parse(stdout) as Array<{ headRefName: string; url: string; number: number; state: string }>
      const prs: WorktreePrInfo[] = raw.map(pr => ({
        branch: pr.headRefName,
        number: pr.number,
        url: pr.url,
        state: pr.state,
      }))
      return { ok: true, prs }
    } catch (err: any) {
      const msg = err?.stderr ?? err?.message ?? String(err)
      if (/auth|login|token/i.test(msg)) {
        return { ok: false, error: 'gh-auth' }
      }
      if (err?.code === 'ENOENT') {
        return { ok: false, error: 'gh-missing' }
      }
      return { ok: false }
    }
  })

  ipcMain.handle(WORKTREE_IPC.MERGE_BASE, async (_event, { cwd }: WorktreeMergeArgs): Promise<WorktreeResult> => {
    try {
      const opts = { cwd, timeout: 15000 }
      // Detect default branch
      let defaultBranch = 'main'
      try {
        const { stdout } = await execFileAsync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], opts)
        defaultBranch = stdout.trim().replace(/^refs\/remotes\/origin\//, '')
      } catch {
        // Fallback: check if main or master exists
        try {
          await execFileAsync('git', ['rev-parse', '--verify', 'main'], opts)
          defaultBranch = 'main'
        } catch {
          try {
            await execFileAsync('git', ['rev-parse', '--verify', 'master'], opts)
            defaultBranch = 'master'
          } catch {
            return { ok: false, error: 'Could not determine default branch' }
          }
        }
      }
      await execFileAsync('git', ['fetch', 'origin', defaultBranch], opts)
      await execFileAsync('git', ['merge', `origin/${defaultBranch}`], opts)
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) }
    }
  })
}

export function unregisterWorktreeHandlers() {
  Object.values(WORKTREE_IPC).forEach(ch => {
    ipcMain.removeHandler(ch)
  })
}
