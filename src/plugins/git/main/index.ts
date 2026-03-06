import type { PluginMainModule } from '../../plugin-main'
import { registerGitHandlers, unregisterGitHandlers } from './gitHandlers'
import { cleanupGitWatchers } from './gitWatcher'

export const gitMainModule: PluginMainModule = {
  register(getWindows) {
    registerGitHandlers(getWindows)
  },
  cleanup() {
    cleanupGitWatchers()
    unregisterGitHandlers()
  },
}
