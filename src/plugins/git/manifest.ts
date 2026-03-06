import type { SidebarPlugin } from '../registry'
import { GitGraphPanel } from './renderer/GitGraphPanel'
import { GitSettings } from './renderer/GitSettings'
import { GitMenuBarInfo } from './renderer/GitMenuBarInfo'
import { GitBranchIcon } from '../../renderer/components/ActivityBarIcons'
import { useGitAvailability } from './renderer/useGitAvailability'
import { useGitBadge } from './renderer/useGitBadge'

export const gitPlugin: SidebarPlugin = {
  id: 'git',
  name: 'Git',
  description: 'Commit graph for the active repository',
  order: 0,
  icon: GitBranchIcon,
  useIsAvailable: () => useGitAvailability(s => s.available),
  useBadge: useGitBadge,
  PanelComponent: GitGraphPanel,
  SettingsComponent: GitSettings,
  MenuBarComponent: GitMenuBarInfo,
  defaultInstalled: true,
  defaultCollapsed: false,
}
