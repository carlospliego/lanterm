import type { SidebarPlugin } from '../registry'
import { GitGraphPanel } from './renderer/GitGraphPanel'
import { GitSettings } from './renderer/GitSettings'
import { GitMenuBarInfo } from './renderer/GitMenuBarInfo'
import { GitBranchIcon } from '../../renderer/components/ActivityBarIcons'
import { useGitAvailability } from './renderer/useGitAvailability'

export const gitPlugin: SidebarPlugin = {
  id: 'git',
  name: 'Git',
  description: 'Commit graph for the active repository',
  order: 0,
  icon: GitBranchIcon,
  useIsAvailable: () => useGitAvailability(s => s.available),
  PanelComponent: GitGraphPanel,
  SettingsComponent: GitSettings,
  MenuBarComponent: GitMenuBarInfo,
  defaultInstalled: true,
  defaultCollapsed: false,
}
