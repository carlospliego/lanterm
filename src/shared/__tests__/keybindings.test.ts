import { describe, it, expect } from 'vitest'
import {
  COMMANDS,
  DEFAULT_KEYBINDINGS,
  resolveKeybindings,
  matchesBinding,
  formatBinding,
  type Keybinding,
  type CommandId,
} from '../keybindings'

/* ── resolveKeybindings ───────────────────────────────────────── */

describe('resolveKeybindings', () => {
  it('returns defaults when no overrides', () => {
    const result = resolveKeybindings({})
    expect(result).toEqual(DEFAULT_KEYBINDINGS)
  })

  it('overrides a single key', () => {
    const override: Keybinding = { key: 'x', meta: true, shift: false, alt: false }
    const result = resolveKeybindings({ newTerminal: override })
    expect(result.newTerminal).toEqual(override)
    // Others unchanged
    expect(result.closeTerminal).toEqual(DEFAULT_KEYBINDINGS.closeTerminal)
  })

  it('overrides multiple keys', () => {
    const result = resolveKeybindings({
      newTerminal: { key: 'a', meta: false, shift: false, alt: true },
      closeTerminal: { key: 'b', meta: false, shift: true, alt: false },
    })
    expect(result.newTerminal.key).toBe('a')
    expect(result.closeTerminal.key).toBe('b')
    expect(result.prevTerminal).toEqual(DEFAULT_KEYBINDINGS.prevTerminal)
  })

  it('contains all command ids', () => {
    const result = resolveKeybindings({})
    for (const cmd of COMMANDS) {
      expect(result).toHaveProperty(cmd.id)
    }
  })
})

/* ── matchesBinding ───────────────────────────────────────────── */

function fakeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: '',
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  } as KeyboardEvent
}

describe('matchesBinding', () => {
  it('matches exact binding', () => {
    const b: Keybinding = { key: 't', meta: true, shift: false, alt: false }
    const e = fakeEvent({ key: 't', metaKey: true })
    expect(matchesBinding(e, b)).toBe(true)
  })

  it('rejects wrong key', () => {
    const b: Keybinding = { key: 't', meta: true, shift: false, alt: false }
    const e = fakeEvent({ key: 'x', metaKey: true })
    expect(matchesBinding(e, b)).toBe(false)
  })

  it('rejects missing meta', () => {
    const b: Keybinding = { key: 't', meta: true, shift: false, alt: false }
    const e = fakeEvent({ key: 't', metaKey: false })
    expect(matchesBinding(e, b)).toBe(false)
  })

  it('rejects extra shift', () => {
    const b: Keybinding = { key: 't', meta: true, shift: false, alt: false }
    const e = fakeEvent({ key: 't', metaKey: true, shiftKey: true })
    expect(matchesBinding(e, b)).toBe(false)
  })

  it('matches shift binding', () => {
    const b: Keybinding = { key: 'd', meta: true, shift: true, alt: false }
    const e = fakeEvent({ key: 'd', metaKey: true, shiftKey: true })
    expect(matchesBinding(e, b)).toBe(true)
  })

  it('matches alt binding', () => {
    const b: Keybinding = { key: 'ArrowLeft', meta: true, shift: false, alt: true }
    const e = fakeEvent({ key: 'ArrowLeft', metaKey: true, altKey: true })
    expect(matchesBinding(e, b)).toBe(true)
  })

  it('normalizes Shift+= to + for zoom in', () => {
    const b: Keybinding = { key: '=', meta: true, shift: true, alt: false }
    // On US keyboard Shift+= produces '+'
    const e = fakeEvent({ key: '+', metaKey: true, shiftKey: true })
    expect(matchesBinding(e, b)).toBe(true)
  })

  it('does not normalize + when shift is not expected', () => {
    const b: Keybinding = { key: '=', meta: true, shift: false, alt: false }
    const e = fakeEvent({ key: '+', metaKey: true, shiftKey: false })
    expect(matchesBinding(e, b)).toBe(false)
  })
})

/* ── formatBinding ────────────────────────────────────────────── */

describe('formatBinding', () => {
  it('formats meta+key', () => {
    expect(formatBinding({ key: 't', meta: true, shift: false, alt: false })).toBe('⌘T')
  })

  it('formats meta+shift+key', () => {
    expect(formatBinding({ key: 'd', meta: true, shift: true, alt: false })).toBe('⌘⇧D')
  })

  it('formats meta+alt+key', () => {
    expect(formatBinding({ key: 'ArrowLeft', meta: true, shift: false, alt: true })).toBe('⌘⌥←')
  })

  it('formats arrow keys with symbols', () => {
    expect(formatBinding({ key: 'ArrowRight', meta: true, shift: false, alt: false })).toBe('⌘→')
    expect(formatBinding({ key: 'ArrowUp', meta: true, shift: false, alt: false })).toBe('⌘↑')
    expect(formatBinding({ key: 'ArrowDown', meta: true, shift: false, alt: false })).toBe('⌘↓')
  })

  it('formats special keys', () => {
    expect(formatBinding({ key: 'Escape', meta: false, shift: false, alt: false })).toBe('Esc')
    expect(formatBinding({ key: 'Backspace', meta: false, shift: false, alt: false })).toBe('⌫')
    expect(formatBinding({ key: 'Enter', meta: false, shift: false, alt: false })).toBe('↩')
  })

  it('uppercases regular keys', () => {
    expect(formatBinding({ key: ',', meta: true, shift: false, alt: false })).toBe('⌘,')
  })

  it('formats space key', () => {
    expect(formatBinding({ key: ' ', meta: true, shift: false, alt: false })).toBe('⌘Space')
  })
})
