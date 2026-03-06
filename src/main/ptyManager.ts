import { execFile } from 'child_process'
import { mkdirSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import type { IPty } from 'node-pty'

// node-pty is a native module — require at runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty = require('node-pty') as typeof import('node-pty')

interface PtyEntry {
  process: IPty
  cwd: string
  oscReceived: boolean
}

type DataCallback = (id: string, data: string) => void
type ExitCallback = (id: string, code: number) => void

export class PtyManager {
  private ptys = new Map<string, PtyEntry>()
  private onDataCb: DataCallback | null = null
  private onExitCb: ExitCallback | null = null

  onData(cb: DataCallback) { this.onDataCb = cb }
  onExit(cb: ExitCallback) { this.onExitCb = cb }

  create(id: string, cwd: string, cols: number, rows: number, shellOverride?: string): void {
    if (this.ptys.has(id)) return

    const shell = shellOverride || process.env.SHELL || '/bin/zsh'
    const isZsh = shell.endsWith('zsh')
    const isBash = shell.endsWith('bash')

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      TERM_PROGRAM: 'term',
    }

    // Inject OSC 7 CWD reporting
    if (isZsh) {
      const zdotdir = this.makeZshZdotdir()
      env.ZDOTDIR = zdotdir
    } else if (isBash) {
      const osc7Hook = `__osc7() { printf "\\033]7;file://%s%s\\007" "$HOSTNAME" "$PWD"; }; PROMPT_COMMAND="__osc7${env.PROMPT_COMMAND ? ';' + env.PROMPT_COMMAND : ''}"`
      env.PROMPT_COMMAND = osc7Hook
    }

    let cwdToUse = cwd
    try {
      // Verify the cwd exists; fall back to home if not
      const { existsSync } = require('fs') as typeof import('fs')
      if (!existsSync(cwdToUse)) cwdToUse = homedir()
    } catch {
      cwdToUse = homedir()
    }

    const args = isZsh || isBash ? ['--login'] : []

    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwdToUse,
      env,
    })

    const entry: PtyEntry = { process: proc, cwd: cwdToUse, oscReceived: false }
    this.ptys.set(id, entry)

    proc.onData((data) => {
      // Parse OSC 7: ESC ] 7 ; file://hostname/path (BEL | ST)
      // Path must not contain escape chars to avoid spanning across sequences
      const osc7Re = /\x1b\]7;file:\/\/[^/]*(\/[^\x07\x1b]+)(?:\x07|\x1b\\)/g
      let match: RegExpExecArray | null
      while ((match = osc7Re.exec(data)) !== null) {
        entry.cwd = decodeURIComponent(match[1])
        entry.oscReceived = true
      }
      this.onDataCb?.(id, data)
    })

    proc.onExit(({ exitCode }) => {
      this.ptys.delete(id)
      this.onExitCb?.(id, exitCode ?? 0)
    })
  }

  write(id: string, data: string): void {
    this.ptys.get(id)?.process.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    this.ptys.get(id)?.process.resize(cols, rows)
  }

  kill(id: string): void {
    const entry = this.ptys.get(id)
    if (entry) {
      try { entry.process.kill() } catch { /* already dead */ }
      this.ptys.delete(id)
    }
  }

  getCwd(id: string): Promise<string | null> {
    const entry = this.ptys.get(id)
    if (!entry) return Promise.resolve(null)

    if (entry.oscReceived) return Promise.resolve(entry.cwd)

    // Fallback: lsof
    return new Promise((resolve) => {
      const pid = entry.process.pid
      execFile('lsof', ['-a', `-p${pid}`, '-d', 'cwd', '-Fn'], (err, stdout) => {
        if (err) { resolve(entry.cwd); return }
        const line = stdout.split('\n').find(l => l.startsWith('n'))
        if (line) {
          const path = line.slice(1).trim()
          entry.cwd = path
          resolve(path)
        } else {
          resolve(entry.cwd)
        }
      })
    })
  }

  hasRunningChild(id: string): Promise<boolean> {
    const entry = this.ptys.get(id)
    if (!entry) return Promise.resolve(false)
    return new Promise(resolve => {
      execFile('ps', ['-o', 'pgid=,tpgid=', '-p', String(entry.process.pid)], (err, stdout) => {
        if (err) { resolve(false); return }
        const parts = stdout.trim().split(/\s+/)
        if (parts.length < 2) { resolve(false); return }
        const pgid = parseInt(parts[0])
        const tpgid = parseInt(parts[1])
        resolve(!isNaN(pgid) && !isNaN(tpgid) && tpgid > 0 && pgid !== tpgid)
      })
    })
  }

  getForegroundProcessName(id: string): Promise<string | null> {
    const entry = this.ptys.get(id)
    if (!entry) return Promise.resolve(null)
    const pid = String(entry.process.pid)
    return new Promise(resolve => {
      execFile('ps', ['-o', 'tpgid=', '-p', pid], (err, stdout) => {
        if (err) { resolve(null); return }
        const tpgid = stdout.trim()
        if (!tpgid || tpgid === '-1') { resolve(null); return }
        execFile('ps', ['-o', 'command=', '-g', tpgid], (err2, stdout2) => {
          if (err2) { resolve(null); return }
          const lines = stdout2.trim().split('\n').filter(Boolean)
          resolve(lines.length > 0 ? lines.join('\n') : null)
        })
      })
    })
  }

  getShellPid(id: string): number | null {
    return this.ptys.get(id)?.process.pid ?? null
  }

  killAll(): void {
    for (const [id] of this.ptys) this.kill(id)
  }

  private makeZshZdotdir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'term-zdotdir-'))
    const home = homedir()
    const userZshenv = join(home, '.zshenv')
    const userZprofile = join(home, '.zprofile')
    const userZshrc = join(home, '.zshrc')

    const osc7Fn = [
      '__term_osc7() {',
      '  printf "\\033]7;file://%s%s\\007" "$HOST" "$PWD"',
      '}',
      'typeset -gaU precmd_functions',
      'precmd_functions+=(__term_osc7)',
    ].join('\n')

    // Forward user's .zshenv (always sourced, before login/interactive checks)
    writeFileSync(join(dir, '.zshenv'),
      `[[ -f "${userZshenv}" ]] && source "${userZshenv}"\n`)

    // Forward user's .zprofile (sourced for login shells — sets up homebrew, path_helper, etc.)
    writeFileSync(join(dir, '.zprofile'),
      `[[ -f "${userZprofile}" ]] && source "${userZprofile}"\n`)

    // Forward user's .zshrc (interactive) + inject OSC 7 CWD reporting
    const zshrcContent = [
      `[[ -f "${userZshrc}" ]] && source "${userZshrc}"`,
      osc7Fn,
    ].join('\n') + '\n'
    writeFileSync(join(dir, '.zshrc'), zshrcContent)

    return dir
  }
}
