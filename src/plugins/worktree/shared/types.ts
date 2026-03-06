export interface WorktreeInfo {
  path: string
  head: string
  branchShort: string
  isMain: boolean
  isLocked: boolean
  prunable: boolean
}

export interface WorktreeListResult {
  worktrees: WorktreeInfo[]
  gitRoot: string
}

export interface WorktreeCreateArgs {
  cwd: string
  branch: string
  path?: string
  baseBranch?: string
  createBranch?: boolean
}

export interface WorktreeRemoveArgs {
  cwd: string
  worktreePath: string
  force?: boolean
}

export interface WorktreeResult {
  ok: boolean
  error?: string
}

export interface WorktreeMergeArgs {
  cwd: string
}

export interface WorktreePluginSettings {
  defaultBasePath: string
  panelMaxHeight: number
}

export interface WorktreePrInfo {
  branch: string
  number: number
  url: string
  state: string
}

export interface RepoWorktreeGroup {
  repoName: string    // basename of gitRoot
  gitRoot: string     // absolute path
  worktrees: WorktreeInfo[]
}

export interface MultiRepoWorktreeResult {
  repos: RepoWorktreeGroup[]
}

export interface Task {
  id: string
  text: string
  done: boolean
}
