import type { SidebarPlugin } from '../registry'
import type { PaletteAction } from '../../shared/types'
import { WorktreePanel } from './renderer/WorktreePanel'
import { WorktreeSettings } from './renderer/WorktreeSettings'
import { PromptDialog } from './renderer/PromptDialog'
import { WorktreeIcon } from '../../renderer/components/ActivityBarIcons'
import { useTasksStore } from './renderer/useTasksStore'
import { useWorktreeAvailability } from './renderer/useWorktreeAvailability'
import { useAppStore } from '../../renderer/store/useAppStore'
import { showInput } from '../../renderer/components/InputDialog'
import { showToast } from '../../renderer/components/Toast'

function emitWorktreeRefresh() {
  window.dispatchEvent(new Event('worktree-refresh'))
}

function getActiveCwd(): string | null {
  const { terminals, activeTerminalId, focusedPaneId, splitLayouts } = useAppStore.getState()
  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const targetId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const session = terminals.find(t => t.id === targetId)
  return session?.cwd || null
}

export const worktreePlugin: SidebarPlugin = {
  id: 'worktree',
  name: 'Worktrees',
  description: 'List, create, and remove git worktrees',
  order: 3,
  icon: WorktreeIcon,
  PanelComponent: WorktreePanel,
  SettingsComponent: WorktreeSettings,
  OverlayComponent: PromptDialog,
  defaultInstalled: true,
  defaultCollapsed: true,
  useIsAvailable: () => useWorktreeAvailability(s => s.available) !== false,
  state: {
    stateKey: 'tasks',
    hydrate: (data: unknown) => {
      useTasksStore.getState().hydrate(data)
    },
    serialize: () => useTasksStore.getState().tasksByWorktree,
  },
  actions(): PaletteAction[] {
    return [
      {
        id: 'worktree:create',
        label: 'Worktree: Create',
        group: 'Worktree',
        execute: async () => {
          const cwd = getActiveCwd()
          if (!cwd) return
          const branch = await showInput('New Worktree', 'Branch name…')
          if (!branch) return
          const result = await window.termAPI.worktreeCreate({ cwd, branch })
          if (result.ok) { showToast(`Worktree created: ${branch}`); emitWorktreeRefresh() }
          else showToast(result.error ?? 'Failed to create worktree', 'error')
        },
      },
      {
        id: 'worktree:prune',
        label: 'Worktree: Prune',
        group: 'Worktree',
        execute: async () => {
          const cwd = getActiveCwd()
          if (!cwd) return
          const result = await window.termAPI.worktreePrune(cwd)
          if (result.ok) { showToast('Worktrees pruned'); emitWorktreeRefresh() }
          else showToast(result.error ?? 'Prune failed', 'error')
        },
      },
      {
        id: 'worktree:commit',
        label: 'git commit',
        group: 'Git',
        execute: async () => {
          const cwd = getActiveCwd()
          if (!cwd) return
          const message = await showInput('Commit', 'Commit message…')
          if (!message) return
          const addRes = await window.termAPI.gitAddAll(cwd)
          if (!addRes.ok) { showToast(addRes.error ?? 'Failed to stage files', 'error'); return }
          const commitRes = await window.termAPI.gitCommit(cwd, message)
          if (!commitRes.ok) { showToast(commitRes.error ?? 'Commit failed', 'error'); return }
          showToast('Committed')
          emitWorktreeRefresh()
        },
      },
      {
        id: 'worktree:commitAndPush',
        label: 'git commit & push',
        group: 'Git',
        execute: async () => {
          const cwd = getActiveCwd()
          if (!cwd) return
          const message = await showInput('Commit & Push', 'Commit message…')
          if (!message) return
          const addRes = await window.termAPI.gitAddAll(cwd)
          if (!addRes.ok) { showToast(addRes.error ?? 'Failed to stage files', 'error'); return }
          const commitRes = await window.termAPI.gitCommit(cwd, message)
          if (!commitRes.ok) { showToast(commitRes.error ?? 'Commit failed', 'error'); return }
          const pushRes = await window.termAPI.gitPush(cwd)
          if (!pushRes.ok) { showToast(pushRes.error ?? 'Push failed', 'error'); return }
          showToast('Committed & pushed')
          emitWorktreeRefresh()
        },
      },
      {
        id: 'worktree:createPR',
        label: 'git create pr',
        group: 'Git',
        execute: async () => {
          const cwd = getActiveCwd()
          if (!cwd) return
          const res = await window.termAPI.worktreeRemoteUrl(cwd)
          if (!res.ok || !res.url) { showToast(res.error ?? 'No remote URL found', 'error'); return }
          const branchRes = await window.termAPI.worktreeList(cwd)
          if (!branchRes) { showToast('Could not determine branch', 'error'); return }
          const wt = branchRes.worktrees.find(w => cwd === w.path || cwd.startsWith(w.path + '/'))
          if (!wt || wt.isMain) { showToast('Not on a feature branch', 'error'); return }
          const branch = encodeURIComponent(wt.branchShort)
          await window.termAPI.openExternalUrl(`${res.url}/compare/main...${branch}?expand=1`)
        },
      },
      {
        id: 'worktree:mergeMain',
        label: 'git merge main',
        group: 'Git',
        execute: async () => {
          const cwd = getActiveCwd()
          if (!cwd) return
          const res = await window.termAPI.worktreeMergeBase(cwd)
          if (res.ok) { showToast('Merged main'); emitWorktreeRefresh() }
          else showToast(res.error ?? 'Merge failed', 'error')
        },
      },
    ]
  },
}
