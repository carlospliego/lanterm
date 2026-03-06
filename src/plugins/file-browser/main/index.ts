import type { PluginMainModule } from '../../plugin-main'
import { registerFileBrowserHandlers, unregisterFileBrowserHandlers } from './fileBrowserHandlers'

export const fileBrowserMainModule: PluginMainModule = {
  register() {
    registerFileBrowserHandlers()
  },
  cleanup() {
    unregisterFileBrowserHandlers()
  },
}
