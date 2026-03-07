/** Escape a file path for safe pasting into a shell (backslash-escapes special chars). */
export function shellEscape(path: string): string {
  return path.replace(/([  ()'\"&;|<>$`!{}[\]*?#~\\])/g, '\\$1')
}
