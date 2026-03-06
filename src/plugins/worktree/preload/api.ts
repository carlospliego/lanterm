import type { PluginPreloadFactory } from '../../plugin-preload'
import { WORKTREE_IPC } from '../shared/channels'
import type { WorktreeCreateArgs, WorktreeRemoveArgs } from '../shared/types'

export const worktreePreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  worktreeList: (cwd: string) =>
    ipcRenderer.invoke(WORKTREE_IPC.LIST, { cwd }),

  worktreeListMulti: (cwd: string) =>
    ipcRenderer.invoke(WORKTREE_IPC.LIST_MULTI, { cwd }),

  worktreeCreate: (args: WorktreeCreateArgs) =>
    ipcRenderer.invoke(WORKTREE_IPC.CREATE, args),

  worktreeRemove: (args: WorktreeRemoveArgs) =>
    ipcRenderer.invoke(WORKTREE_IPC.REMOVE, args),

  worktreePrune: (cwd: string) =>
    ipcRenderer.invoke(WORKTREE_IPC.PRUNE, { cwd }),

  worktreeRemoteUrl: (cwd: string) =>
    ipcRenderer.invoke(WORKTREE_IPC.REMOTE_URL, { cwd }),

  worktreeMergeBase: (cwd: string) =>
    ipcRenderer.invoke(WORKTREE_IPC.MERGE_BASE, { cwd }),

  worktreePrStatus: (cwd: string) =>
    ipcRenderer.invoke(WORKTREE_IPC.PR_STATUS, { cwd }),
})
