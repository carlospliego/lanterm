import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SerializeAddon } from '@xterm/addon-serialize'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import '@xterm/xterm/css/xterm.css'
import { useAppStore } from '../store/useAppStore'
import { serializeRegistry, focusRegistry } from '../terminalRegistry'
import { createFilePathLinkProvider, createGitHashLinkProvider } from '../linkProviders'
import { FONT_MONO, TYPE, RADIUS, SPACE, btnReset } from '../designTokens'
import { IconDisplay } from './IconDisplay'
import { resolveTerminalTheme } from '../terminalThemes'
import type { TerminalSession } from '../../shared/types'
import { useCombinedPlugins } from '../useExternalPlugins'

/** Escape a file path for safe pasting into a shell (backslash-escapes special chars). */
function shellEscape(path: string): string {
  return path.replace(/([  ()'\"&;|<>$`!{}[\]*?#~\\])/g, '\\$1')
}

interface Props {
  session: TerminalSession
  isActive: boolean
  isFocused?: boolean
  showSplitButton?: boolean
  onSplit?: () => void
  onClose?: () => void
  onFocus?: () => void
}

export const TerminalPane = React.memo(function TerminalPane({ session, isActive, isFocused, showSplitButton, onSplit, onClose, onFocus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const serializeAddonRef = useRef<SerializeAddon | null>(null)
  const unsubDataRef = useRef<(() => void) | null>(null)
  const unsubExitRef = useRef<(() => void) | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  // Prevents onPtyExit from removing the session when cleanup intentionally kills the PTY
  const intentionalKillRef = useRef(false)

  // Data selectors (re-render only when these specific values change)
  const sidebarOpen = useAppStore(s => s.sidebarOpen)
  const folders = useAppStore(s => s.folders)
  const globalFontSize = useAppStore(s => s.fontSize)
  const settings = useAppStore(s => s.settings)
  const resolvedTheme = useAppStore(s => s.resolvedTheme)
  const installedPlugins = useAppStore(s => s.installedPlugins)
  // Action selectors (stable references, never cause re-renders)
  const updateCwd = useAppStore(s => s.updateCwd)
  const updateScrollback = useAppStore(s => s.updateScrollback)
  const removeTerminal = useAppStore(s => s.removeTerminal)
  const combinedPlugins = useCombinedPlugins()
  const fontSize = session.fontSize ?? globalFontSize
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    // 1. Create terminal
    const { settings: s, resolvedTheme: rt } = useAppStore.getState()
    const themeId = session.terminalTheme ?? s.terminalTheme ?? 'auto'
    const term = new Terminal({
      allowProposedApi: true,
      fontFamily: s.fontFamily,
      fontSize: session.fontSize ?? useAppStore.getState().fontSize,
      lineHeight: 1.2,
      theme: resolveTerminalTheme(themeId, rt),
      cursorBlink: true,
      scrollback: s.scrollback,
    })
    termRef.current = term

    // 2. Load addons
    const fitAddon = new FitAddon()
    const serializeAddon = new SerializeAddon()
    fitAddonRef.current = fitAddon
    serializeAddonRef.current = serializeAddon
    term.loadAddon(fitAddon)
    term.loadAddon(serializeAddon)

    // Web links: Cmd+click opens URL in browser
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      if (_event.metaKey) {
        _event.preventDefault()
        window.termAPI.openExternalUrl(uri)
      }
    })
    term.loadAddon(webLinksAddon)

    // Custom link providers for file paths and git hashes
    term.registerLinkProvider(createFilePathLinkProvider(term, () => session.cwd))
    term.registerLinkProvider(createGitHashLinkProvider(term, () => session.cwd, () => session.id))

    serializeRegistry.set(session.id, serializeAddon)
    focusRegistry.set(session.id, term)

    // Intercept Ctrl+R to open history search instead of shell reverse-search
    term.attachCustomKeyEventHandler((event) => {
      if (event.type === 'keydown' && event.ctrlKey && event.key === 'r') {
        useAppStore.getState().openPalette('history')
        return false
      }
      if (event.type === 'keydown' && event.metaKey && (event.key === 'Backspace' || event.key === 'Delete')) {
        return false
      }
      return true
    })

    // 3. Mount
    term.open(containerRef.current)
    fitAddon.fit()

    // 3b. GPU-accelerated renderer: WebGL → Canvas → DOM fallback
    // Skip WebGL/Canvas in test mode — hidden windows have no GPU context,
    // and tests need DOM rows (.xterm-rows > div) for content assertions.
    const isTestMode = new URLSearchParams(window.location.search).has('testMode')
    if (!isTestMode) {
      try {
        const webgl = new WebglAddon()
        webgl.onContextLoss(() => {
          webgl.dispose()
          // Fall back to canvas on GPU context loss
          try { term.loadAddon(new CanvasAddon()) } catch { /* DOM fallback */ }
        })
        term.loadAddon(webgl)
      } catch {
        try { term.loadAddon(new CanvasAddon()) } catch { /* DOM fallback */ }
      }
    }

    // 4. Restore scrollback
    if (session.scrollback) {
      term.write(session.scrollback)
      // Clear the current line (old prompt) so the new PTY prompt replaces it
      // instead of stacking — prevents accumulating extra prompt lines on each restart
      term.write('\x1b[2K\r')
      term.scrollToBottom()
    }

    // 5. Create PTY
    const { cols, rows } = term
    const shellArg = useAppStore.getState().settings.shell || undefined
    window.termAPI.ptyCreate({ id: session.id, cwd: session.cwd, cols, rows, shell: shellArg })
      .then(() => {
        if (session.initialCommand) {
          window.termAPI.ptyWrite(session.id, session.initialCommand + '\r')
        }
      })

    // 6. Wire input
    term.onData(data => window.termAPI.ptyWrite(session.id, data))

    // 7. Use xterm's built-in OSC parser for CWD reporting (handles buffered/split
    //    data and both BEL and ST terminators, unlike raw regex on data chunks)
    term.parser.registerOscHandler(7, (data) => {
      // data = "file://hostname/path"
      try {
        const url = new URL(data)
        updateCwd(session.id, decodeURIComponent(url.pathname))
      } catch { /* ignore malformed */ }
      return false // let xterm continue default handling
    })

    intentionalKillRef.current = false
    unsubDataRef.current = window.termAPI.onPtyData((id, data) => {
      if (id !== session.id) return
      term.write(data)
    })

    // 8. Wire PTY exit — only remove session for natural shell exits, not intentional kills
    unsubExitRef.current = window.termAPI.onPtyExit((id, _code) => {
      if (id === session.id && !intentionalKillRef.current) {
        term.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n')
        removeTerminal(id)
      }
    })

    // 10. ResizeObserver (RAF-debounced to coalesce multiple resize events per frame)
    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      if (rafId != null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        try {
          fitAddon.fit()
          window.termAPI.ptyResize(session.id, term.cols, term.rows)
        } catch { /* ignore during unmount */ }
      })
    })
    observer.observe(containerRef.current)
    resizeObserverRef.current = observer

    // Drag-and-drop file paths into terminal.
    // Use document-level capture to guarantee we intercept drops before any
    // child element (xterm canvas/WebGL) can swallow or ignore them.
    const container = containerRef.current!
    const onDragOver = (e: DragEvent) => {
      if (!container.contains(e.target as Node)) return
      e.preventDefault()
      setDragOver(true)
    }
    const onDragLeave = (e: DragEvent) => {
      if (!container.contains(e.target as Node)) return
      setDragOver(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!container.contains(e.target as Node)) return
      e.preventDefault()
      setDragOver(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      const paths: string[] = []
      for (let i = 0; i < files.length; i++) {
        const filePath = window.termAPI.getPathForFile(files[i])
        if (filePath) paths.push(shellEscape(filePath))
      }
      if (paths.length > 0) {
        window.termAPI.ptyWrite(session.id, paths.join(' '))
      }
    }
    document.addEventListener('dragover', onDragOver, true)
    document.addEventListener('dragleave', onDragLeave, true)
    document.addEventListener('drop', onDrop, true)

    // Cleanup
    return () => {
      document.removeEventListener('dragover', onDragOver, true)
      document.removeEventListener('dragleave', onDragLeave, true)
      document.removeEventListener('drop', onDrop, true)
      intentionalKillRef.current = true
      serializeRegistry.delete(session.id)
      focusRegistry.delete(session.id)
      // Serialize scrollback before destroy
      try {
        const scrollback = serializeAddon.serialize()
        updateScrollback(session.id, scrollback)
      } catch { /* ignore */ }

      unsubDataRef.current?.()
      unsubExitRef.current?.()
      if (rafId != null) cancelAnimationFrame(rafId)
      observer.disconnect()
      window.termAPI.ptyKill(session.id)
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  // Fit when becoming active (layout may have changed while hidden).
  // In split mode (isFocused !== undefined), skip auto-focus here — isFocused effect handles it.
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current!.fit()
          window.termAPI.ptyResize(session.id, termRef.current!.cols, termRef.current!.rows)
          if (isFocused === undefined) {
            termRef.current!.focus()
          }
        } catch { /* ignore */ }
      }, 50)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, session.id])

  // Sync font size changes to live terminal
  useEffect(() => {
    if (termRef.current && fitAddonRef.current) {
      termRef.current.options.fontSize = fontSize
      try {
        fitAddonRef.current.fit()
        window.termAPI.ptyResize(session.id, termRef.current.cols, termRef.current.rows)
      } catch { /* ignore */ }
    }
  }, [fontSize, session.id])

  // Sync fontFamily changes to live terminal
  useEffect(() => {
    if (termRef.current && fitAddonRef.current) {
      termRef.current.options.fontFamily = settings.fontFamily
      try {
        fitAddonRef.current.fit()
        window.termAPI.ptyResize(session.id, termRef.current.cols, termRef.current.rows)
      } catch { /* ignore */ }
    }
  }, [settings.fontFamily, session.id])

  // Sync theme changes to live terminal
  const terminalThemeId = session.terminalTheme ?? settings.terminalTheme ?? 'auto'
  const effectiveResolvedTheme = resolvedTheme
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = resolveTerminalTheme(terminalThemeId, effectiveResolvedTheme)
    }
  }, [effectiveResolvedTheme, terminalThemeId])

  // Focus management in split mode
  useEffect(() => {
    if (isFocused && termRef.current) {
      termRef.current.focus()
    }
  }, [isFocused])

  const termBg = resolveTerminalTheme(terminalThemeId, effectiveResolvedTheme).background

  const shortCwd = session.cwd.replace(/^\/Users\/[^/]+/, '~')
  const parentFolder = session.folderId ? folders.find(f => f.id === session.folderId) : null

  return (
    <div
      data-testid="terminal-pane"
      data-tour="terminal-pane"
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'flex' : 'none',
        flexDirection: 'column',
        background: termBg,
      }}
    >
      <div
        style={{
          height: 38,
          minHeight: 38,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: sidebarOpen ? 10 : 80,
          paddingRight: 10,
          gap: 6,
          background: termBg,
          fontFamily: FONT_MONO,
          fontSize: TYPE.body,
          userSelect: 'none',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <span style={{ color: 'var(--text-dim)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>
          {parentFolder && (
            <>{parentFolder.icon && <span style={{ marginRight: 3 }}><IconDisplay icon={parentFolder.icon} /></span>}<span style={{ color: 'var(--text-faintest)' }}>{parentFolder.name}</span><span style={{ color: 'var(--text-faintest)', margin: '0 4px' }}>/</span></>
          )}
          {session.icon && <span style={{ marginRight: 3 }}><IconDisplay icon={session.icon} /></span>}
          {session.title}
        </span>
        <span style={{ color: 'var(--text-faintest)', flexShrink: 0 }}>—</span>
        <span style={{ color: 'var(--text-muted)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shortCwd}
        </span>
        {combinedPlugins
          .filter(p => p.MenuBarComponent && installedPlugins.includes(p.id))
          .map(p => <p.MenuBarComponent key={p.id} sessionId={session.id} cwd={session.cwd} />)
        }
        {showSplitButton && onSplit && (
          <button
            data-tour="split-button"
            onClick={onSplit}
            title="Split pane horizontally"
            style={{
              ...btnReset,
              color: 'var(--text-faintest)',
              fontSize: TYPE.lg,
              padding: `${SPACE.xxs}px ${SPACE.xs}px`,
              borderRadius: RADIUS.md,
              flexShrink: 0,
              WebkitAppRegion: 'no-drag',
              transition: 'color 0.1s',
            } as React.CSSProperties}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
          >
            ⊟
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            title="Close pane"
            style={{
              ...btnReset,
              color: 'var(--text-faintest)',
              fontSize: TYPE.lg,
              padding: `${SPACE.xxs}px ${SPACE.xs}px`,
              borderRadius: RADIUS.md,
              flexShrink: 0,
              WebkitAppRegion: 'no-drag',
              transition: 'color 0.1s',
            } as React.CSSProperties}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--destructive)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faintest)')}
          >
            ×
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: '2px 8px 0 12px',
          background: termBg,
          outline: dragOver ? '2px solid var(--accent)' : 'none',
          outlineOffset: -2,
        }}
        onClick={() => {
          termRef.current?.focus()
          onFocus?.()
        }}
      />
    </div>
  )
}, (prev, next) =>
  prev.session.id === next.session.id &&
  prev.isActive === next.isActive &&
  prev.isFocused === next.isFocused &&
  prev.showSplitButton === next.showSplitButton &&
  prev.session.cwd === next.session.cwd &&
  prev.session.title === next.session.title &&
  prev.session.fontSize === next.session.fontSize &&
  prev.session.terminalTheme === next.session.terminalTheme &&
  prev.onSplit === next.onSplit &&
  prev.onClose === next.onClose &&
  prev.onFocus === next.onFocus
)
