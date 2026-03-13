import type { TerminalThemeDefinition } from './terminalThemes'

// ── Color utilities (no external deps) ──────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')
}

/** Linear interpolation between two hex colors. amount=0 → c1, amount=1 → c2 */
function mix(c1: string, c2: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  return rgbToHex(
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  )
}

function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Lighten a hex color by a percentage (0-1) toward white */
function lighten(hex: string, amount: number): string {
  return mix(hex, '#ffffff', amount)
}

/** Darken a hex color by a percentage (0-1) toward black */
function darken(hex: string, amount: number): string {
  return mix(hex, '#000000', amount)
}

// ── Derive full UI CSS variable set from a terminal theme ───────────

export function deriveUITheme(def: TerminalThemeDefinition): Record<string, string> {
  const t = def.theme
  const bg = t.background ?? '#1a1a1a'
  const fg = t.foreground ?? '#d4d4d4'
  const blue = t.blue ?? '#3b8eea'
  const red = t.red ?? '#f14c4c'
  const green = t.green ?? '#23d18b'
  const yellow = t.yellow ?? '#f5f543'
  const magenta = t.magenta ?? '#d670d6'
  const cyan = t.cyan ?? '#29b8db'
  const isDark = def.isDark

  const vars: Record<string, string> = {}

  // Core surfaces
  vars['--bg'] = bg
  vars['--surface'] = isDark ? lighten(bg, 0.06) : darken(bg, 0.04)
  vars['--elevated'] = isDark ? lighten(bg, 0.08) : darken(bg, 0.06)
  vars['--input-bg'] = bg
  vars['--border'] = isDark ? lighten(bg, 0.15) : darken(bg, 0.15)
  vars['--border-subtle'] = isDark ? lighten(bg, 0.10) : darken(bg, 0.10)

  // Text
  vars['--text-primary'] = fg
  vars['--text-secondary'] = mix(fg, bg, 0.05)
  vars['--text-muted'] = mix(fg, bg, 0.15)
  vars['--text-dim'] = mix(fg, bg, 0.45)
  vars['--text-faint'] = mix(fg, bg, 0.55)
  vars['--text-faintest'] = mix(fg, bg, 0.65)

  // Accent
  vars['--accent'] = blue
  vars['--accent-dim'] = withAlpha(blue, isDark ? 0.15 : 0.12)

  // Overlays & shadows
  vars['--shadow'] = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.2)'
  vars['--overlay'] = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)'

  // Interactive backgrounds
  vars['--selection-bg'] = withAlpha(fg, 0.08)
  vars['--hover-bg'] = withAlpha(fg, 0.05)
  vars['--subtle-bg'] = withAlpha(fg, 0.03)

  // Status & git colors — map from ANSI colors
  vars['--status-running'] = green
  vars['--status-dirty'] = yellow
  vars['--status-ahead'] = blue
  vars['--git-branch'] = green
  vars['--destructive'] = red

  // Lane colors — derived from theme ANSI palette
  vars['--lane-1'] = cyan
  vars['--lane-2'] = green
  vars['--lane-3'] = yellow
  vars['--lane-4'] = red
  vars['--lane-5'] = magenta
  vars['--lane-6'] = mix(cyan, green, 0.5)
  vars['--lane-7'] = mix(yellow, fg, 0.3)
  vars['--lane-8'] = mix(red, yellow, 0.5)

  // Ref backgrounds — ANSI color blended at low alpha onto bg
  vars['--ref-head'] = isDark
    ? mix(bg, green, 0.15)
    : mix(bg, green, 0.2)
  vars['--ref-tag'] = isDark
    ? mix(bg, yellow, 0.15)
    : mix(bg, yellow, 0.2)
  vars['--ref-remote'] = isDark
    ? mix(bg, blue, 0.12)
    : mix(bg, blue, 0.15)
  vars['--ref-detached'] = isDark
    ? mix(bg, magenta, 0.15)
    : mix(bg, magenta, 0.2)
  vars['--ref-default'] = isDark
    ? mix(bg, blue, 0.15)
    : mix(bg, blue, 0.2)

  // Git file status
  vars['--git-modified'] = mix(red, yellow, 0.5)
  vars['--git-added'] = green
  vars['--git-deleted'] = red
  vars['--git-renamed'] = mix(blue, magenta, 0.5)
  vars['--git-untracked'] = mix(fg, bg, 0.55)

  return vars
}

// ── Apply / clear derived theme on documentElement ──────────────────

// Track which CSS vars we've set so we can cleanly remove them
let appliedVarNames: string[] = []

export function applyDerivedTheme(vars: Record<string, string> | null): void {
  const el = document.documentElement

  // Remove previous overrides
  for (const name of appliedVarNames) {
    el.style.removeProperty(name)
  }
  appliedVarNames = []

  // Apply new overrides
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      el.style.setProperty(name, value)
      appliedVarNames.push(name)
    }
  }
}
