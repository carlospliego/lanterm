import { create } from 'zustand'
import type { ButtonConfig, ButtonFolder, ButtonPrompt } from '../shared/types'

interface ButtonsStore {
  buttons: ButtonConfig[]
  folders: ButtonFolder[]
  addButton: (label: string, command: string, cwd?: string, color?: string, prompt?: ButtonPrompt, runInTerminal?: boolean, runInActiveTerminal?: boolean, folderId?: string, runOnStartup?: boolean) => void
  updateButton: (id: string, patch: Partial<Omit<ButtonConfig, 'id'>>) => void
  removeButton: (id: string) => void
  reorderButtons: (ids: string[]) => void
  moveButton: (buttonId: string, targetFolderId: string | undefined, beforeButtonId?: string) => void
  addFolder: (label: string, color?: string) => void
  updateFolder: (id: string, patch: Partial<Omit<ButtonFolder, 'id'>>) => void
  removeFolder: (id: string) => void
  toggleFolderCollapsed: (id: string) => void
  reorderFolders: (ids: string[]) => void
  hydrate: (buttons: ButtonConfig[], folders?: ButtonFolder[]) => void
}

export const useButtonsStore = create<ButtonsStore>((set) => ({
  buttons: [],
  folders: [],

  addButton: (label, command, cwd?, color?, prompt?, runInTerminal?, runInActiveTerminal?, folderId?, runOnStartup?) =>
    set((s) => ({
      buttons: [...s.buttons, {
        id: crypto.randomUUID(),
        label,
        command,
        cwd,
        color,
        prompt,
        runInTerminal,
        runInActiveTerminal,
        folderId,
        runOnStartup,
      }],
    })),

  updateButton: (id, patch) =>
    set((s) => ({
      buttons: s.buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  removeButton: (id) =>
    set((s) => ({
      buttons: s.buttons.filter((b) => b.id !== id),
    })),

  reorderButtons: (ids) =>
    set((s) => {
      const map = new Map(s.buttons.map((b) => [b.id, b]))
      return { buttons: ids.map((id) => map.get(id)!).filter(Boolean) }
    }),

  moveButton: (buttonId, targetFolderId, beforeButtonId?) =>
    set((s) => {
      const btn = s.buttons.find(b => b.id === buttonId)
      if (!btn) return s
      const updated = { ...btn, folderId: targetFolderId }
      const rest = s.buttons.filter(b => b.id !== buttonId)
      if (beforeButtonId) {
        const idx = rest.findIndex(b => b.id === beforeButtonId)
        if (idx >= 0) {
          rest.splice(idx, 0, updated)
          return { buttons: rest }
        }
      }
      // Append at end of target group
      const lastIdx = targetFolderId
        ? rest.findLastIndex(b => b.folderId === targetFolderId)
        : rest.findLastIndex(b => !b.folderId)
      rest.splice(lastIdx + 1, 0, updated)
      return { buttons: rest }
    }),

  addFolder: (label, color?) =>
    set((s) => ({
      folders: [...s.folders, { id: crypto.randomUUID(), label, color }],
    })),

  updateFolder: (id, patch) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  removeFolder: (id) =>
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      buttons: s.buttons.map((b) => (b.folderId === id ? { ...b, folderId: undefined } : b)),
    })),

  toggleFolderCollapsed: (id) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)),
    })),

  reorderFolders: (ids) =>
    set((s) => {
      const map = new Map(s.folders.map((f) => [f.id, f]))
      return { folders: ids.map((id) => map.get(id)!).filter(Boolean) }
    }),

  hydrate: (buttons, folders?) => set({ buttons, folders: folders ?? [] }),
}))
