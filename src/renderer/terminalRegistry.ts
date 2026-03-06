import type { Terminal } from '@xterm/xterm'
import type { SerializeAddon } from '@xterm/addon-serialize'
export const serializeRegistry = new Map<string, SerializeAddon>()
export const focusRegistry = new Map<string, Terminal>()

export interface FindMatch {
  terminalId: string
  lineIndex: number
  lineText: string
  matchStart: number
  matchLength: number
}

export interface RemoteFindMatch {
  terminalId: string
  terminalTitle: string
  windowId: string
  lineIndex: number
  lineText: string
  matchStart: number
  matchLength: number
}

export function searchAllTerminals(
  query: string,
  priorityId: string | null,
  maxPerTerminal = 50
): FindMatch[] {
  if (!query) return []
  const lowerQuery = query.toLowerCase()
  const priorityResults: FindMatch[] = []
  const otherResults: FindMatch[] = []

  for (const [id, term] of focusRegistry) {
    const results = id === priorityId ? priorityResults : otherResults
    const buf = term.buffer.active
    let count = 0
    for (let i = 0; i < buf.length && count < maxPerTerminal; i++) {
      const line = buf.getLine(i)
      if (!line) continue
      const text = line.translateToString(true)
      const lowerText = text.toLowerCase()
      let searchFrom = 0
      while (count < maxPerTerminal) {
        const idx = lowerText.indexOf(lowerQuery, searchFrom)
        if (idx === -1) break
        results.push({
          terminalId: id,
          lineIndex: i,
          lineText: text,
          matchStart: idx,
          matchLength: query.length,
        })
        count++
        searchFrom = idx + 1
      }
    }
  }

  return [...priorityResults, ...otherResults]
}
