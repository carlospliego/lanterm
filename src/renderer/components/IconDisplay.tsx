import React from 'react'

interface IconDisplayProps {
  icon: string
  style?: React.CSSProperties
}

/**
 * Renders an icon value — either an emoji (plain string) or a Font Awesome icon
 * (stored as "fa:fa-solid fa-house").
 */
export function IconDisplay({ icon, style }: IconDisplayProps) {
  if (icon.startsWith('fa:')) {
    return <i className={icon.slice(3)} style={{ ...style, lineHeight: 1 }} />
  }
  return <span style={style}>{icon}</span>
}

/** Check whether an icon string is a Font Awesome icon */
export function isFaIcon(icon: string): boolean {
  return icon.startsWith('fa:')
}
