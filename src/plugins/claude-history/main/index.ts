import type { PluginMainModule } from '../../plugin-main'
import { registerClaudeHandlers, startClaudeWatcher, cleanupClaudeHandlers } from './claudeHandlers'

export const claudeHistoryMainModule: PluginMainModule = {
  register(getWindows) {
    registerClaudeHandlers(getWindows)
  },
  onWindowReady(getWindows) {
    startClaudeWatcher(getWindows)
  },
  cleanup() {
    cleanupClaudeHandlers()
  },
}
