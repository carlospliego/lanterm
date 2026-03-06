import { describe, it, expect, beforeEach } from 'vitest'
import { focusRegistry, searchAllTerminals, type FindMatch } from '../terminalRegistry'

/* Create a minimal mock terminal buffer */
function mockTerminal(lines: string[]) {
  return {
    buffer: {
      active: {
        length: lines.length,
        getLine(i: number) {
          if (i >= lines.length) return null
          return {
            translateToString(_trimRight?: boolean) {
              return lines[i]
            },
          }
        },
      },
    },
  } as any
}

describe('searchAllTerminals', () => {
  beforeEach(() => {
    focusRegistry.clear()
  })

  it('returns empty array for empty query', () => {
    focusRegistry.set('t1', mockTerminal(['hello']))
    expect(searchAllTerminals('', null)).toEqual([])
  })

  it('returns empty array when no terminals', () => {
    expect(searchAllTerminals('hello', null)).toEqual([])
  })

  it('finds a single match', () => {
    focusRegistry.set('t1', mockTerminal(['hello world']))
    const results = searchAllTerminals('hello', null)
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      terminalId: 't1',
      lineIndex: 0,
      lineText: 'hello world',
      matchStart: 0,
      matchLength: 5,
    })
  })

  it('is case-insensitive', () => {
    focusRegistry.set('t1', mockTerminal(['Hello World']))
    const results = searchAllTerminals('hello', null)
    expect(results).toHaveLength(1)
    expect(results[0].matchStart).toBe(0)
  })

  it('finds matches in multiple terminals', () => {
    focusRegistry.set('t1', mockTerminal(['foo bar']))
    focusRegistry.set('t2', mockTerminal(['bar baz']))
    const results = searchAllTerminals('bar', null)
    expect(results).toHaveLength(2)
    const ids = results.map(r => r.terminalId)
    expect(ids).toContain('t1')
    expect(ids).toContain('t2')
  })

  it('finds multiple matches on same line', () => {
    focusRegistry.set('t1', mockTerminal(['aba aba']))
    const results = searchAllTerminals('aba', null)
    expect(results).toHaveLength(2)
    expect(results[0].matchStart).toBe(0)
    expect(results[1].matchStart).toBe(4)
  })

  it('finds matches across multiple lines', () => {
    focusRegistry.set('t1', mockTerminal(['line one test', 'line two', 'test again']))
    const results = searchAllTerminals('test', null)
    expect(results).toHaveLength(2)
    expect(results[0].lineIndex).toBe(0)
    expect(results[1].lineIndex).toBe(2)
  })

  it('respects maxPerTerminal limit', () => {
    const lines = Array.from({ length: 100 }, () => 'match match match')
    focusRegistry.set('t1', mockTerminal(lines))
    const results = searchAllTerminals('match', null, 5)
    expect(results).toHaveLength(5)
  })

  it('priorityId results come first', () => {
    focusRegistry.set('t1', mockTerminal(['alpha']))
    focusRegistry.set('t2', mockTerminal(['alpha']))
    const results = searchAllTerminals('alpha', 't2')
    expect(results).toHaveLength(2)
    expect(results[0].terminalId).toBe('t2')
    expect(results[1].terminalId).toBe('t1')
  })

  it('handles no match case', () => {
    focusRegistry.set('t1', mockTerminal(['hello world']))
    const results = searchAllTerminals('xyz', null)
    expect(results).toEqual([])
  })

  it('handles empty lines', () => {
    focusRegistry.set('t1', mockTerminal(['', '', 'hello']))
    const results = searchAllTerminals('hello', null)
    expect(results).toHaveLength(1)
    expect(results[0].lineIndex).toBe(2)
  })

  it('returns correct matchLength for query', () => {
    focusRegistry.set('t1', mockTerminal(['foobar']))
    const results = searchAllTerminals('foo', null)
    expect(results[0].matchLength).toBe(3)
  })

  it('maxPerTerminal applies per terminal not globally', () => {
    const lines = Array.from({ length: 10 }, () => 'x')
    focusRegistry.set('t1', mockTerminal(lines))
    focusRegistry.set('t2', mockTerminal(lines))
    const results = searchAllTerminals('x', null, 3)
    // 3 from t1 + 3 from t2
    expect(results).toHaveLength(6)
  })

  it('preserves lineText in results', () => {
    focusRegistry.set('t1', mockTerminal(['  some output here  ']))
    const results = searchAllTerminals('output', null)
    expect(results[0].lineText).toBe('  some output here  ')
  })
})
