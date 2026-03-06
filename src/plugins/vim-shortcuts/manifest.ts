import type { SidebarPlugin } from '../registry'
import { VimShortcutsPanel } from './renderer/VimShortcutsPanel'
import { VimShortcutsSettings } from './renderer/VimShortcutsSettings'
import { VimIcon } from '../../renderer/components/ActivityBarIcons'

export const vimShortcutsPlugin: SidebarPlugin = {
  id: 'vimShortcuts',
  name: 'Vim Shortcuts',
  description: 'Searchable vim keyboard shortcut reference',
  order: 5,
  icon: VimIcon,
  PanelComponent: VimShortcutsPanel,
  SettingsComponent: VimShortcutsSettings,
  defaultInstalled: false,
}
