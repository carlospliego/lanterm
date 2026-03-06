import { describe, it, expect, beforeEach } from 'vitest'
import { useTasksStore } from '../useTasksStore'

describe('useTasksStore', () => {
  beforeEach(() => {
    useTasksStore.setState({ tasksByWorktree: {}, activeWorktreePath: '__default' })
  })

  it('starts empty', () => {
    const { tasksByWorktree } = useTasksStore.getState()
    expect(tasksByWorktree).toEqual({})
  })

  it('adds a task to active worktree', () => {
    useTasksStore.getState().addTask('Buy milk')
    const tasks = useTasksStore.getState().tasksByWorktree['__default']
    expect(tasks).toHaveLength(1)
    expect(tasks[0].text).toBe('Buy milk')
    expect(tasks[0].done).toBe(false)
    expect(tasks[0].id).toBeTruthy()
  })

  it('prepends new tasks', () => {
    useTasksStore.getState().addTask('First')
    useTasksStore.getState().addTask('Second')
    const tasks = useTasksStore.getState().tasksByWorktree['__default']
    expect(tasks[0].text).toBe('Second')
    expect(tasks[1].text).toBe('First')
  })

  it('toggles a task', () => {
    useTasksStore.getState().addTask('Toggle me')
    const id = useTasksStore.getState().tasksByWorktree['__default'][0].id
    useTasksStore.getState().toggleTask(id)
    expect(useTasksStore.getState().tasksByWorktree['__default'][0].done).toBe(true)
    useTasksStore.getState().toggleTask(id)
    expect(useTasksStore.getState().tasksByWorktree['__default'][0].done).toBe(false)
  })

  it('removes a task', () => {
    useTasksStore.getState().addTask('Remove me')
    const id = useTasksStore.getState().tasksByWorktree['__default'][0].id
    useTasksStore.getState().removeTask(id)
    expect(useTasksStore.getState().tasksByWorktree['__default']).toHaveLength(0)
  })

  it('edits a task', () => {
    useTasksStore.getState().addTask('Old text')
    const id = useTasksStore.getState().tasksByWorktree['__default'][0].id
    useTasksStore.getState().editTask(id, 'New text')
    expect(useTasksStore.getState().tasksByWorktree['__default'][0].text).toBe('New text')
  })

  it('editTask trims whitespace', () => {
    useTasksStore.getState().addTask('Original')
    const id = useTasksStore.getState().tasksByWorktree['__default'][0].id
    useTasksStore.getState().editTask(id, '  Trimmed  ')
    expect(useTasksStore.getState().tasksByWorktree['__default'][0].text).toBe('Trimmed')
  })

  it('editTask ignores empty string', () => {
    useTasksStore.getState().addTask('Keep me')
    const id = useTasksStore.getState().tasksByWorktree['__default'][0].id
    useTasksStore.getState().editTask(id, '   ')
    expect(useTasksStore.getState().tasksByWorktree['__default'][0].text).toBe('Keep me')
  })

  it('clears completed tasks', () => {
    useTasksStore.getState().addTask('Keep')
    useTasksStore.getState().addTask('Remove')
    const tasks = useTasksStore.getState().tasksByWorktree['__default']
    useTasksStore.getState().toggleTask(tasks[0].id) // mark 'Remove' as done (it's first since prepended)
    useTasksStore.getState().clearCompleted()
    const remaining = useTasksStore.getState().tasksByWorktree['__default']
    expect(remaining).toHaveLength(1)
    expect(remaining[0].text).toBe('Keep')
  })

  it('tasks are per-worktree', () => {
    useTasksStore.getState().addTask('Default task')
    useTasksStore.getState().setActiveWorktree('/some/path')
    useTasksStore.getState().addTask('Path task')
    expect(useTasksStore.getState().tasksByWorktree['__default']).toHaveLength(1)
    expect(useTasksStore.getState().tasksByWorktree['/some/path']).toHaveLength(1)
  })

  it('reorders tasks', () => {
    useTasksStore.getState().addTask('C')
    useTasksStore.getState().addTask('B')
    useTasksStore.getState().addTask('A')
    // Order is [A, B, C] after prepending
    useTasksStore.getState().reorderTasks(0, 2) // move A to position 2
    const texts = useTasksStore.getState().tasksByWorktree['__default'].map(t => t.text)
    expect(texts).toEqual(['B', 'C', 'A'])
  })

  it('reorderTasks ignores out-of-bounds', () => {
    useTasksStore.getState().addTask('Only one')
    useTasksStore.getState().reorderTasks(0, 5)
    expect(useTasksStore.getState().tasksByWorktree['__default']).toHaveLength(1)
  })

  it('reorderTasks ignores negative indices', () => {
    useTasksStore.getState().addTask('Only one')
    useTasksStore.getState().reorderTasks(-1, 0)
    expect(useTasksStore.getState().tasksByWorktree['__default']).toHaveLength(1)
  })

  // hydrate tests
  it('hydrates legacy Task[] format', () => {
    const legacyData = [
      { id: '1', text: 'legacy task', done: false },
    ]
    useTasksStore.getState().hydrate(legacyData)
    expect(useTasksStore.getState().tasksByWorktree['__default']).toEqual(legacyData)
  })

  it('hydrates Record<string, Task[]> format', () => {
    const data = {
      '/repo': [{ id: '1', text: 'repo task', done: true }],
      '__default': [{ id: '2', text: 'default task', done: false }],
    }
    useTasksStore.getState().hydrate(data)
    expect(useTasksStore.getState().tasksByWorktree).toEqual(data)
  })

  it('hydrates null/undefined as empty', () => {
    useTasksStore.getState().hydrate(null)
    expect(useTasksStore.getState().tasksByWorktree).toEqual({})
    useTasksStore.getState().hydrate(undefined)
    expect(useTasksStore.getState().tasksByWorktree).toEqual({})
  })
})
