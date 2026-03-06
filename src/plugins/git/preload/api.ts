import type { PluginPreloadFactory } from '../../plugin-preload'
import { GIT_IPC } from '../shared/channels'

export const gitPreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  gitBranch: (id: string, cwd: string): Promise<{ branch: string; dirty: boolean; ahead: number; files: string[] } | null> =>
    ipcRenderer.invoke(GIT_IPC.GIT_BRANCH, { id, cwd }),

  gitUnwatch: (id: string): Promise<void> =>
    ipcRenderer.invoke(GIT_IPC.GIT_UNWATCH, { id }),

  gitGraph: (id: string, cwd: string, maxCommits?: number): Promise<{
    commits: Array<{ hash: string; shortHash: string; parents: string[]; refs: string[];
                     subject: string; author: string; relativeTime: string }>;
    branch: string; dirty: boolean; ahead: number; files: string[];
    headFiles: Array<{ status: string; file: string }>
  } | null> =>
    ipcRenderer.invoke(GIT_IPC.GIT_GRAPH, { id, cwd, maxCommits }),

  gitPull: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_PULL, { cwd }),

  gitFetch: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_FETCH, { cwd }),

  gitStash: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_STASH, { cwd }),

  gitStashPop: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_STASH_POP, { cwd }),

  gitListBranches: (cwd: string): Promise<{ ok: boolean; branches?: string[]; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_LIST_BRANCHES, { cwd }),

  gitCheckout: (cwd: string, branch: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_CHECKOUT, { cwd, branch }),

  gitCommit: (cwd: string, message: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_COMMIT, { cwd, message }),

  gitPush: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_PUSH, { cwd }),

  gitStatus: (cwd: string): Promise<{ ok: boolean; files?: string[]; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_STATUS, { cwd }),

  gitAddAll: (cwd: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(GIT_IPC.GIT_ADD_ALL, { cwd }),

  onGitUpdate: (cb: (id: string, info: { branch: string; dirty: boolean; ahead: number; files: string[] } | null) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, event: { id: string; info: { branch: string; dirty: boolean; ahead: number; files: string[] } | null }) =>
      cb(event.id, event.info)
    ipcRenderer.on(GIT_IPC.GIT_UPDATE, handler)
    return () => ipcRenderer.removeListener(GIT_IPC.GIT_UPDATE, handler)
  },
})
