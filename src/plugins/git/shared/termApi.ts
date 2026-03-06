export interface GitTermAPI {
  gitBranch(id: string, cwd: string): Promise<{ branch: string; dirty: boolean; ahead: number; files: string[]; isWorktree: boolean } | null>
  gitUnwatch(id: string): Promise<void>
  gitGraph(id: string, cwd: string, maxCommits?: number): Promise<{
    commits: Array<{ hash: string; shortHash: string; parents: string[]; refs: string[];
                     subject: string; author: string; relativeTime: string }>;
    branch: string; dirty: boolean; ahead: number; files: string[];
    headFiles: Array<{ status: string; file: string }>
  } | null>
  gitPull(cwd: string): Promise<{ ok: boolean; error?: string }>
  gitFetch(cwd: string): Promise<{ ok: boolean; error?: string }>
  gitStash(cwd: string): Promise<{ ok: boolean; error?: string }>
  gitStashPop(cwd: string): Promise<{ ok: boolean; error?: string }>
  gitListBranches(cwd: string): Promise<{ ok: boolean; branches?: string[]; error?: string }>
  gitCheckout(cwd: string, branch: string): Promise<{ ok: boolean; error?: string }>
  gitCommit(cwd: string, message: string): Promise<{ ok: boolean; error?: string }>
  gitPush(cwd: string): Promise<{ ok: boolean; error?: string }>
  gitStatus(cwd: string): Promise<{ ok: boolean; files?: string[]; error?: string }>
  gitAddAll(cwd: string): Promise<{ ok: boolean; error?: string }>
  onGitUpdate(cb: (id: string, info: { branch: string; dirty: boolean; ahead: number; files: string[]; isWorktree: boolean } | null) => void): () => void
}
