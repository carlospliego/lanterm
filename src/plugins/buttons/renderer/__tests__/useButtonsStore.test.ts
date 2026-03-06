import { describe, it, expect, beforeEach } from 'vitest'
import { useButtonsStore } from '../useButtonsStore'

describe('useButtonsStore', () => {
  beforeEach(() => {
    useButtonsStore.setState({ buttons: [] })
  })

  it('starts empty', () => {
    expect(useButtonsStore.getState().buttons).toEqual([])
  })

  it('adds a button', () => {
    useButtonsStore.getState().addButton('Build', 'npm run build')
    const { buttons } = useButtonsStore.getState()
    expect(buttons).toHaveLength(1)
    expect(buttons[0].label).toBe('Build')
    expect(buttons[0].command).toBe('npm run build')
    expect(buttons[0].id).toBeTruthy()
  })

  it('adds a button with optional fields', () => {
    useButtonsStore.getState().addButton('Deploy', 'deploy.sh', '/app', '#ff0000', undefined, true)
    const btn = useButtonsStore.getState().buttons[0]
    expect(btn.cwd).toBe('/app')
    expect(btn.color).toBe('#ff0000')
    expect(btn.runInTerminal).toBe(true)
  })

  it('updates a button', () => {
    useButtonsStore.getState().addButton('Old', 'old cmd')
    const id = useButtonsStore.getState().buttons[0].id
    useButtonsStore.getState().updateButton(id, { label: 'New', command: 'new cmd' })
    const updated = useButtonsStore.getState().buttons[0]
    expect(updated.label).toBe('New')
    expect(updated.command).toBe('new cmd')
  })

  it('removes a button', () => {
    useButtonsStore.getState().addButton('Remove me', 'cmd')
    const id = useButtonsStore.getState().buttons[0].id
    useButtonsStore.getState().removeButton(id)
    expect(useButtonsStore.getState().buttons).toHaveLength(0)
  })

  it('reorders buttons', () => {
    useButtonsStore.getState().addButton('A', 'a')
    useButtonsStore.getState().addButton('B', 'b')
    useButtonsStore.getState().addButton('C', 'c')
    const [a, b, c] = useButtonsStore.getState().buttons
    useButtonsStore.getState().reorderButtons([c.id, a.id, b.id])
    const labels = useButtonsStore.getState().buttons.map(b => b.label)
    expect(labels).toEqual(['C', 'A', 'B'])
  })

  it('hydrates with data', () => {
    const data = [
      { id: '1', label: 'X', command: 'x' },
      { id: '2', label: 'Y', command: 'y' },
    ]
    useButtonsStore.getState().hydrate(data as any)
    expect(useButtonsStore.getState().buttons).toEqual(data)
  })

  it('appends buttons (not prepends)', () => {
    useButtonsStore.getState().addButton('First', 'f')
    useButtonsStore.getState().addButton('Second', 's')
    const labels = useButtonsStore.getState().buttons.map(b => b.label)
    expect(labels).toEqual(['First', 'Second'])
  })
})
