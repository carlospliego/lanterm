import type { SidebarPlugin } from '../registry'
import type { PaletteAction } from '../../shared/types'
import { ButtonsPanel } from './renderer/ButtonsPanel'
import { ButtonsSettings } from './renderer/ButtonsSettings'
import { useButtonsStore } from './renderer/useButtonsStore'
import { useAppStore } from '../../renderer/store/useAppStore'
import { showInput } from '../../renderer/components/InputDialog'
import { GridButtonsIcon } from '../../renderer/components/ActivityBarIcons'
import type { ButtonConfig, ButtonFolder } from './shared/types'

function getActiveCwd(): string {
  const { terminals, activeTerminalId, focusedPaneId, splitLayouts } = useAppStore.getState()
  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const targetId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const session = terminals.find(t => t.id === targetId)
  return session?.cwd || ''
}

export const buttonsPlugin: SidebarPlugin = {
  id: 'buttons',
  name: 'Buttons',
  description: 'Custom buttons that run scripts in the background',
  order: 6,
  icon: GridButtonsIcon,
  PanelComponent: ButtonsPanel,
  SettingsComponent: ButtonsSettings,
  defaultInstalled: true,
  state: {
    stateKey: 'buttons',
    hydrate: (data: unknown) => {
      if (data && typeof data === 'object' && 'buttons' in data) {
        const d = data as { buttons: ButtonConfig[]; folders?: ButtonFolder[] }
        useButtonsStore.getState().hydrate(d.buttons ?? [], d.folders)
      } else {
        // Legacy format: data is just the buttons array
        useButtonsStore.getState().hydrate((data as ButtonConfig[]) ?? [])
      }
    },
    serialize: () => {
      const { buttons, folders } = useButtonsStore.getState()
      return { buttons, folders }
    },
  },
  actions(): PaletteAction[] {
    return useButtonsStore.getState().buttons.map((btn) => ({
      id: `buttons:run:${btn.id}`,
      label: `Buttons: ${btn.label}`,
      group: 'Buttons',
      execute: async () => {
        let command = btn.command
        if (btn.prompt) {
          const value = await showInput(btn.prompt.title, btn.prompt.placeholder)
          if (value === null) return
          command = command.replaceAll(`{{${btn.prompt.variable}}}`, value)
        }
        const cwd = btn.cwd || getActiveCwd()
        if (btn.runInTerminal) {
          const id = crypto.randomUUID()
          const store = useAppStore.getState()
          const order = store.terminals.filter(t => !t.folderId).length
          store.addTerminal({
            id,
            title: btn.label,
            cwd,
            order,
            scrollback: '',
            icon: 'fa:fa-solid fa-terminal',
            initialCommand: command,
          })
          store.setActiveTerminal(id)
          return
        }
        await window.termAPI.buttonsRun({ buttonId: btn.id, command, cwd })
      },
    }))
  },
}
