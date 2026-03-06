import type { ComponentType } from 'react'
import type { PaletteAction } from '../shared/types'
import { gitPlugin } from './git/manifest'
import { claudeHistoryPlugin } from './claude-history/manifest'
import { fileBrowserPlugin } from './file-browser/manifest'
import { worktreePlugin } from './worktree/manifest'
import { vimShortcutsPlugin } from './vim-shortcuts/manifest'
import { buttonsPlugin } from './buttons/manifest'

export interface BadgeData {
  count?: number
  label?: string
}

export interface SidebarPlugin {
  id: string
  name: string
  description: string
  order: number
  icon?: ComponentType<{ size?: number }>
  useIsAvailable?: () => boolean
  useBadge?: () => BadgeData | null
  PanelComponent: ComponentType
  SettingsComponent?: ComponentType
  OverlayComponent?: ComponentType
  MenuBarComponent?: ComponentType<{ sessionId: string; cwd: string }>
  actions?: () => PaletteAction[]
  defaultInstalled?: boolean
  defaultCollapsed?: boolean
  state?: {
    stateKey: string
    hydrate: (data: unknown) => void
    serialize: () => unknown
  }
}

export const allPlugins: SidebarPlugin[] = [gitPlugin, claudeHistoryPlugin, fileBrowserPlugin, worktreePlugin, vimShortcutsPlugin, buttonsPlugin]
  .sort((a, b) => a.order - b.order)
