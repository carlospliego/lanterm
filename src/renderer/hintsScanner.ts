import type { Terminal } from '@xterm/xterm'
import { FILE_PATH_REGEX, GIT_HASH_REGEX, URL_REGEX } from './linkProviders'

export interface HintTarget {
  type: 'url' | 'file' | 'hash'
  text: string
  /** Buffer row (0-indexed from viewport top) */
  row: number
  /** Column start (0-indexed) */
  col: number
  length: number
}

/**
 * Scans all visible lines in the terminal viewport for links.
 * Returns deduplicated targets sorted top-to-bottom, left-to-right.
 */
export function scanVisibleLinks(terminal: Terminal): HintTarget[] {
  const buf = terminal.buffer.active
  const viewportTop = buf.viewportY
  const viewportRows = terminal.rows
  const targets: HintTarget[] = []
  const seen = new Set<string>()

  for (let row = 0; row < viewportRows; row++) {
    const bufferRow = viewportTop + row
    const line = buf.getLine(bufferRow)
    if (!line) continue
    const text = line.translateToString(true)
    if (!text.trim()) continue

    const regexes: [RegExp, HintTarget['type']][] = [
      [URL_REGEX, 'url'],
      [FILE_PATH_REGEX, 'file'],
      [GIT_HASH_REGEX, 'hash'],
    ]

    for (const [regex, type] of regexes) {
      regex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = regex.exec(text)) !== null) {
        const key = `${row}:${m.index}:${m[0]}`
        if (seen.has(key)) continue
        seen.add(key)
        targets.push({
          type,
          text: m[0],
          row,
          col: m.index,
          length: m[0].length,
        })
      }
    }
  }

  targets.sort((a, b) => a.row - b.row || a.col - b.col)
  return targets
}

/**
 * Generates short hint labels: a-z for up to 26 targets,
 * then aa-zz for more.
 */
export function generateHintLabels(count: number): string[] {
  const labels: string[] = []
  const chars = 'abcdefghijklmnopqrstuvwxyz'

  if (count <= chars.length) {
    for (let i = 0; i < count; i++) {
      labels.push(chars[i])
    }
  } else {
    // Two-character labels
    for (let i = 0; i < count; i++) {
      const first = chars[Math.floor(i / chars.length) % chars.length]
      const second = chars[i % chars.length]
      labels.push(first + second)
    }
  }

  return labels
}
