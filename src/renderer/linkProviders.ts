import type { Terminal, ILinkProvider, ILink, IBufferRange } from '@xterm/xterm'

// ── Regex patterns (shared with hints scanner) ──────────────────────────

/** Matches absolute, relative, and home-dir paths with optional :line:col */
export const FILE_PATH_REGEX = /(?:\/[\w.@-]+(?:\/[\w.@-]+)+|\.\.?\/[\w.@-]+(?:\/[\w.@-]+)*|~\/[\w.@-]+(?:\/[\w.@-]+)*)(?::(\d+)(?::(\d+))?)?/g

/** Matches 7-40 char hex hashes (git short/full) */
export const GIT_HASH_REGEX = /(?<![#\w])[0-9a-f]{7,40}(?!\w)/g

/** Matches URLs — used by hints scanner (WebLinksAddon handles actual URL clicks) */
export const URL_REGEX = /https?:\/\/[^\s'")\]}>]+/g

// ── File path link provider ─────────────────────────────────────────────

export function createFilePathLinkProvider(
  terminal: Terminal,
  getCwd: () => string,
): ILinkProvider {
  return {
    provideLinks(lineNumber: number, callback: (links: ILink[] | undefined) => void) {
      const line = terminal.buffer.active.getLine(lineNumber - 1)
      if (!line) { callback(undefined); return }
      const text = line.translateToString(true)
      const links: ILink[] = []

      FILE_PATH_REGEX.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = FILE_PATH_REGEX.exec(text)) !== null) {
        const startCol = m.index + 1
        const endCol = m.index + m[0].length
        const filePath = m[0].replace(/:(\d+)(?::(\d+))?$/, '')
        const lineNum = m[1] ? parseInt(m[1], 10) : undefined
        const colNum = m[2] ? parseInt(m[2], 10) : undefined

        const range: IBufferRange = {
          start: { x: startCol, y: lineNumber },
          end: { x: endCol, y: lineNumber },
        }

        links.push({
          range,
          text: m[0],
          activate(event: MouseEvent) {
            if (!event.metaKey) return
            window.termAPI.openFileInEditor(filePath, getCwd(), lineNum, colNum)
          },
        })
      }

      callback(links.length > 0 ? links : undefined)
    },
  }
}

// ── Git hash link provider ──────────────────────────────────────────────

export function createGitHashLinkProvider(
  terminal: Terminal,
  getCwd: () => string,
  getSessionId: () => string,
): ILinkProvider {
  return {
    provideLinks(lineNumber: number, callback: (links: ILink[] | undefined) => void) {
      const line = terminal.buffer.active.getLine(lineNumber - 1)
      if (!line) { callback(undefined); return }
      const text = line.translateToString(true)
      const links: ILink[] = []

      GIT_HASH_REGEX.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = GIT_HASH_REGEX.exec(text)) !== null) {
        const startCol = m.index + 1
        const endCol = m.index + m[0].length
        const hash = m[0]

        const range: IBufferRange = {
          start: { x: startCol, y: lineNumber },
          end: { x: endCol, y: lineNumber },
        }

        links.push({
          range,
          text: hash,
          activate(event: MouseEvent) {
            if (!event.metaKey) return
            window.termAPI.ptyWrite(getSessionId(), `git show ${hash}\r`)
          },
        })
      }

      callback(links.length > 0 ? links : undefined)
    },
  }
}
