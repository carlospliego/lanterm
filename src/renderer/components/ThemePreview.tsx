import React from 'react'
import { RADIUS } from '../designTokens'
import { resolveTerminalTheme } from '../terminalThemes'

export function ThemePreview({ themeId, resolvedTheme }: { themeId: string; resolvedTheme: 'light' | 'dark' }) {
  const theme = resolveTerminalTheme(themeId, resolvedTheme)
  const colors = [
    theme.background, theme.foreground,
    theme.black, theme.red, theme.green, theme.yellow,
    theme.blue, theme.magenta, theme.cyan, theme.white,
    theme.brightBlack, theme.brightRed,
  ].filter(Boolean) as string[]

  return (
    <div style={{ display: 'flex', height: 16, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: 6 }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, background: c }} />
      ))}
    </div>
  )
}
