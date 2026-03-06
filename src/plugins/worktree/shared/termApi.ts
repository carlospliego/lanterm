import type { WorktreeListResult, WorktreeCreateArgs, WorktreeRemoveArgs, WorktreeResult, WorktreePrInfo, MultiRepoWorktreeResult } from './types'

export interface WorktreeTermAPI {
  worktreeList(cwd: string): Promise<WorktreeListResult | null>
  worktreeListMulti(cwd: string): Promise<MultiRepoWorktreeResult | null>
  worktreeCreate(args: WorktreeCreateArgs): Promise<WorktreeResult>
  worktreeRemove(args: WorktreeRemoveArgs): Promise<WorktreeResult>
  worktreePrune(cwd: string): Promise<WorktreeResult>
  worktreeRemoteUrl(cwd: string): Promise<{ ok: boolean; url?: string; error?: string }>
  worktreeMergeBase(cwd: string): Promise<WorktreeResult>
  worktreePrStatus(cwd: string): Promise<{ ok: boolean; prs?: WorktreePrInfo[]; error?: string }>
}
