import type { SidebarPlugin } from '../registry'
import { FileBrowserPanel } from './renderer/FileBrowserPanel'
import { FileBrowserSettings } from './renderer/FileBrowserSettings'
import { FileTreeIcon } from '../../renderer/components/ActivityBarIcons'

export const fileBrowserPlugin: SidebarPlugin = {
  id: 'fileBrowser',
  name: 'Files',
  description: 'Browse files in the current directory',
  order: 9,
  icon: FileTreeIcon,
  PanelComponent: FileBrowserPanel,
  SettingsComponent: FileBrowserSettings,
  defaultInstalled: true,
}
