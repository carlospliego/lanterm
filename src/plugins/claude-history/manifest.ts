import type { SidebarPlugin } from '../registry'
import { ClaudeHistoryPanel } from './renderer/ClaudeHistoryPanel'
import { ClaudeHistorySettings } from './renderer/ClaudeHistorySettings'
import { ClaudeIcon } from '../../renderer/components/ActivityBarIcons'

export const claudeHistoryPlugin: SidebarPlugin = {
  id: 'claudeHistory',
  name: 'Claude',
  description: 'Usage stats and recent Claude Code session history',
  order: 2,
  icon: ClaudeIcon,
  PanelComponent: ClaudeHistoryPanel,
  SettingsComponent: ClaudeHistorySettings,
  defaultInstalled: true,
  defaultCollapsed: false,
}
