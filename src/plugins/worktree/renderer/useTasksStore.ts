import { create } from 'zustand'
import type { Task } from '../shared/types'

interface TasksStore {
  tasksByWorktree: Record<string, Task[]>
  activeWorktreePath: string
  setActiveWorktree: (path: string) => void
  addTask: (text: string) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void
  editTask: (id: string, newText: string) => void
  clearCompleted: () => void
  reorderTasks: (fromIndex: number, toIndex: number) => void
  hydrate: (data: unknown) => void
}

export const useTasksStore = create<TasksStore>()((set, get) => ({
  tasksByWorktree: {},
  activeWorktreePath: '__default',
  setActiveWorktree: (path) => set({ activeWorktreePath: path }),
  addTask: (text) => set(s => {
    const key = s.activeWorktreePath
    const existing = s.tasksByWorktree[key] ?? []
    return {
      tasksByWorktree: {
        ...s.tasksByWorktree,
        [key]: [{ id: crypto.randomUUID(), text, done: false }, ...existing],
      },
    }
  }),
  toggleTask: (id) => set(s => {
    const key = s.activeWorktreePath
    const existing = s.tasksByWorktree[key] ?? []
    return {
      tasksByWorktree: {
        ...s.tasksByWorktree,
        [key]: existing.map(t => t.id === id ? { ...t, done: !t.done } : t),
      },
    }
  }),
  removeTask: (id) => set(s => {
    const key = s.activeWorktreePath
    const existing = s.tasksByWorktree[key] ?? []
    return {
      tasksByWorktree: {
        ...s.tasksByWorktree,
        [key]: existing.filter(t => t.id !== id),
      },
    }
  }),
  editTask: (id, newText) => {
    const trimmed = newText.trim()
    if (!trimmed) return
    set(s => {
      const key = s.activeWorktreePath
      const existing = s.tasksByWorktree[key] ?? []
      return {
        tasksByWorktree: {
          ...s.tasksByWorktree,
          [key]: existing.map(t => t.id === id ? { ...t, text: trimmed } : t),
        },
      }
    })
  },
  clearCompleted: () => set(s => {
    const key = s.activeWorktreePath
    const existing = s.tasksByWorktree[key] ?? []
    return {
      tasksByWorktree: {
        ...s.tasksByWorktree,
        [key]: existing.filter(t => !t.done),
      },
    }
  }),
  reorderTasks: (fromIndex, toIndex) => set(s => {
    const key = s.activeWorktreePath
    const existing = [...(s.tasksByWorktree[key] ?? [])]
    if (fromIndex < 0 || fromIndex >= existing.length || toIndex < 0 || toIndex >= existing.length) return s
    const [item] = existing.splice(fromIndex, 1)
    existing.splice(toIndex, 0, item)
    return {
      tasksByWorktree: {
        ...s.tasksByWorktree,
        [key]: existing,
      },
    }
  }),
  hydrate: (data) => {
    // Support legacy Task[] format by migrating to { __default: [...] }
    if (Array.isArray(data)) {
      set({ tasksByWorktree: data.length > 0 ? { __default: data } : {} })
    } else if (data && typeof data === 'object') {
      set({ tasksByWorktree: data as Record<string, Task[]> })
    } else {
      set({ tasksByWorktree: {} })
    }
  },
}))
