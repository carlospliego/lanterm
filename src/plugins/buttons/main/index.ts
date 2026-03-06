import type { PluginMainModule } from '../../plugin-main'
import { registerButtonsHandlers, unregisterButtonsHandlers } from './buttonsHandlers'

export const buttonsMainModule: PluginMainModule = {
  register(getWindows) {
    registerButtonsHandlers(getWindows)
  },
  cleanup() {
    unregisterButtonsHandlers()
  },
}
