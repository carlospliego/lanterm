import type { PluginPreloadFactory } from './plugin-preload'
import { gitPreloadFactory } from './git/preload/api'
import { claudeHistoryPreloadFactory } from './claude-history/preload/api'
import { fileBrowserPreloadFactory } from './file-browser/preload/api'
import { worktreePreloadFactory } from './worktree/preload/api'
import { buttonsPreloadFactory } from './buttons/preload/api'

export const pluginPreloadFactories: PluginPreloadFactory[] = [
  gitPreloadFactory,
  claudeHistoryPreloadFactory,
  fileBrowserPreloadFactory,
  worktreePreloadFactory,
  buttonsPreloadFactory,
]
