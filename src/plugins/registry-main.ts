import type { PluginMainModule } from './plugin-main'
import { gitMainModule } from './git/main/index'
import { claudeHistoryMainModule } from './claude-history/main/index'
import { fileBrowserMainModule } from './file-browser/main/index'
import { worktreeMainModule } from './worktree/main/index'
import { buttonsMainModule } from './buttons/main/index'

export const pluginMainModules: PluginMainModule[] = [
  gitMainModule,
  claudeHistoryMainModule,
  fileBrowserMainModule,
  worktreeMainModule,
  buttonsMainModule,
]
