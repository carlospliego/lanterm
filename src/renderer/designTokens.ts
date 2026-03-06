import type React from 'react'

export const FONT_UI = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
export const FONT_MONO = '"Cascadia Code", "Fira Code", Menlo, Monaco, monospace'

export const TYPE = { xs: 9, sm: 10, body: 11, md: 12, lg: 13, xl: 14, xxl: 16 } as const
export const RADIUS = { sm: 2, md: 4, lg: 8 } as const
export const SPACE = { xxs: 2, xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 20 } as const

export const panelHeaderStyle: React.CSSProperties = {
  padding: '10px 12px 8px',
  fontSize: TYPE.sm,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  display: 'flex',
  alignItems: 'center',
  gap: SPACE.sm,
  cursor: 'pointer',
  userSelect: 'none',
}

export const panelTitleStyle: React.CSSProperties = {
  padding: `${SPACE.xs}px ${SPACE.lg}px`,
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  fontSize: TYPE.sm,
  fontWeight: 600,
  color: 'var(--text-faint)',
  userSelect: 'none',
}

export const btnReset: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
}

export const btnGhost: React.CSSProperties = {
  ...btnReset,
  fontSize: TYPE.body,
  color: 'var(--text-faintest)',
  borderRadius: RADIUS.sm,
  transition: 'color 0.1s',
}

export const btnOutline: React.CSSProperties = {
  ...btnReset,
  fontSize: TYPE.xs,
  fontFamily: FONT_MONO,
  fontWeight: 600,
  color: 'var(--text-muted)',
  background: 'var(--elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: RADIUS.sm,
  padding: '2px 6px',
  transition: 'all 0.1s',
}

export const btnPrimary: React.CSSProperties = {
  ...btnReset,
  fontSize: TYPE.body,
  fontFamily: FONT_MONO,
  fontWeight: 600,
  color: 'var(--bg)',
  background: 'var(--accent)',
  borderRadius: RADIUS.sm,
  padding: '4px 8px',
  transition: 'background 0.15s',
}

export const btnPill: React.CSSProperties = {
  ...btnReset,
  padding: '2px 6px',
  borderRadius: RADIUS.sm,
  fontSize: TYPE.xs,
  fontFamily: FONT_MONO,
  fontWeight: 600,
  border: '1px solid var(--border-subtle)',
  transition: 'all 0.1s',
}

export const inputBase: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: RADIUS.sm,
  color: 'var(--text-secondary)',
  fontSize: TYPE.body,
  fontFamily: FONT_MONO,
  padding: '2px 4px',
  outline: 'none',
}

export const emptyState: React.CSSProperties = {
  padding: '6px 12px',
  color: 'var(--text-faintest)',
  fontStyle: 'italic',
  fontSize: TYPE.body,
}

export const badge: React.CSSProperties = {
  fontSize: TYPE.xs,
  borderRadius: RADIUS.sm,
  padding: '0 4px',
  lineHeight: '16px',
  whiteSpace: 'nowrap',
  display: 'inline-block',
  fontWeight: 500,
}

export const panelHeaderAction: React.CSSProperties = {
  ...btnReset,
  fontSize: 14,
  color: 'var(--text-faint)',
  width: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: RADIUS.sm,
  flexShrink: 0,
  transition: 'color 0.1s',
}

export const LIST_SEPARATOR = '1px solid var(--border-subtle)'
