import type { PluginMainModule } from '../../plugin-main'
import { registerWorktreeHandlers, unregisterWorktreeHandlers } from './worktreeHandlers'

export const worktreeMainModule: PluginMainModule = {
  register() {
    registerWorktreeHandlers()
  },
  cleanup() {
    unregisterWorktreeHandlers()
  },
}
