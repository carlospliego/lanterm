export const COMMANDS = [
  { id: 'newTerminal',        label: 'New Terminal',         group: 'Terminals' },
  { id: 'closeTerminal',      label: 'Close Terminal',        group: 'Terminals' },
  { id: 'prevTerminal',       label: 'Previous Terminal',     group: 'Terminals' },
  { id: 'nextTerminal',       label: 'Next Terminal',         group: 'Terminals' },
  { id: 'toggleSidebar',      label: 'Toggle Left Sidebar',   group: 'View' },
  { id: 'toggleRightSidebar', label: 'Toggle Right Sidebar',  group: 'View' },
  { id: 'openSettings',       label: 'Settings',              group: 'View' },
  { id: 'findInTerminal',    label: 'Find in Terminal',      group: 'View' },
  { id: 'togglePrompt',       label: 'Task Prompt',           group: 'Plugins' },
  { id: 'increaseFontSize',   label: 'Increase Font Size',    group: 'Font & Zoom' },
  { id: 'decreaseFontSize',   label: 'Decrease Font Size',    group: 'Font & Zoom' },
  { id: 'resetFontSize',      label: 'Reset Font Size',       group: 'Font & Zoom' },
  { id: 'zoomIn',             label: 'Zoom In',               group: 'Font & Zoom' },
  { id: 'zoomOut',            label: 'Zoom Out',              group: 'Font & Zoom' },
  { id: 'resetZoom',          label: 'Reset Zoom',            group: 'Font & Zoom' },
  { id: 'focusLeftPane',      label: 'Focus Left Pane',       group: 'Split' },
  { id: 'focusRightPane',     label: 'Focus Right Pane',      group: 'Split' },
  { id: 'splitPane',           label: 'Split Pane',            group: 'Split' },
  { id: 'switchPaneLeft',     label: 'Switch Pane Left',      group: 'Split' },
  { id: 'switchPaneRight',    label: 'Switch Pane Right',     group: 'Split' },
  { id: 'commandPalette',     label: 'Command Palette',       group: 'View' },
  { id: 'hintsMode',          label: 'Hints Mode',            group: 'View' },
  { id: 'newFolder',          label: 'New Folder',            group: 'Terminals' },
  { id: 'duplicateTerminal',  label: 'Duplicate Terminal',    group: 'Terminals' },
  { id: 'renameTerminal',    label: 'Rename Terminal',        group: 'Terminals' },
  { id: 'newWindow',          label: 'New Window',            group: 'View' },
  { id: 'newMenu',            label: 'New…',                  group: 'View' },
  { id: 'activatePlugin1',    label: 'Activate Plugin 1',     group: 'Plugins' },
  { id: 'activatePlugin2',    label: 'Activate Plugin 2',     group: 'Plugins' },
  { id: 'activatePlugin3',    label: 'Activate Plugin 3',     group: 'Plugins' },
  { id: 'activatePlugin4',    label: 'Activate Plugin 4',     group: 'Plugins' },
  { id: 'activatePlugin5',    label: 'Activate Plugin 5',     group: 'Plugins' },
  { id: 'activatePlugin6',    label: 'Activate Plugin 6',     group: 'Plugins' },
  { id: 'activatePlugin7',    label: 'Activate Plugin 7',     group: 'Plugins' },
  { id: 'activatePlugin8',    label: 'Activate Plugin 8',     group: 'Plugins' },
  { id: 'activatePlugin9',    label: 'Activate Plugin 9',     group: 'Plugins' },
] as const

export type CommandId = typeof COMMANDS[number]['id']

export interface Keybinding {
  key: string
  meta: boolean
  shift: boolean
  alt: boolean
}

export const DEFAULT_KEYBINDINGS: Record<CommandId, Keybinding> = {
  newTerminal:        { key: 't',          meta: true,  shift: false, alt: false },
  closeTerminal:      { key: 'w',          meta: true,  shift: false, alt: false },
  prevTerminal:       { key: 'ArrowUp',    meta: true,  shift: false, alt: false },
  nextTerminal:       { key: 'ArrowDown',  meta: true,  shift: false, alt: false },
  toggleSidebar:      { key: 'ArrowLeft',  meta: true,  shift: false, alt: false },
  toggleRightSidebar: { key: 'ArrowRight', meta: true,  shift: false, alt: false },
  openSettings:       { key: ',',          meta: true,  shift: false, alt: false },
  findInTerminal:     { key: 'f',          meta: true,  shift: false, alt: false },
  togglePrompt:       { key: 'k',          meta: true,  shift: false, alt: false },
  increaseFontSize:   { key: '=',          meta: true,  shift: false, alt: false },
  decreaseFontSize:   { key: '-',          meta: true,  shift: false, alt: false },
  resetFontSize:      { key: '0',          meta: true,  shift: false, alt: false },
  zoomIn:             { key: '=',          meta: true,  shift: true,  alt: false },
  zoomOut:            { key: '-',          meta: true,  shift: true,  alt: false },
  resetZoom:          { key: '0',          meta: true,  shift: true,  alt: false },
  splitPane:          { key: 'd',          meta: true,  shift: false, alt: false },
  focusLeftPane:      { key: 'ArrowUp',    meta: true,  shift: false, alt: true  },
  focusRightPane:     { key: 'ArrowDown',  meta: true,  shift: false, alt: true  },
  switchPaneLeft:     { key: 'ArrowLeft',  meta: true,  shift: true,  alt: false },
  switchPaneRight:    { key: 'ArrowRight', meta: true,  shift: true,  alt: false },
  commandPalette:     { key: 'p',          meta: true,  shift: false, alt: false },
  hintsMode:          { key: 'u',          meta: true,  shift: true,  alt: false },
  newFolder:          { key: '',           meta: false, shift: false, alt: false },
  duplicateTerminal:  { key: 'd',          meta: true,  shift: true,  alt: false },
  renameTerminal:     { key: 'l',          meta: true,  shift: false, alt: false },
  newWindow:          { key: 'n',          meta: true,  shift: true,  alt: false },
  newMenu:            { key: 'n',          meta: true,  shift: false, alt: false },
  activatePlugin1:    { key: '1',          meta: true,  shift: false, alt: false },
  activatePlugin2:    { key: '2',          meta: true,  shift: false, alt: false },
  activatePlugin3:    { key: '3',          meta: true,  shift: false, alt: false },
  activatePlugin4:    { key: '4',          meta: true,  shift: false, alt: false },
  activatePlugin5:    { key: '5',          meta: true,  shift: false, alt: false },
  activatePlugin6:    { key: '6',          meta: true,  shift: false, alt: false },
  activatePlugin7:    { key: '7',          meta: true,  shift: false, alt: false },
  activatePlugin8:    { key: '8',          meta: true,  shift: false, alt: false },
  activatePlugin9:    { key: '9',          meta: true,  shift: false, alt: false },
}

export function resolveKeybindings(
  overrides: Partial<Record<CommandId, Keybinding>>
): Record<CommandId, Keybinding> {
  return { ...DEFAULT_KEYBINDINGS, ...overrides }
}

export function matchesBinding(e: KeyboardEvent, b: Keybinding): boolean {
  // Normalize: Shift+= produces '+' on US keyboards
  const eKey = (b.shift && e.key === '+') ? '=' : e.key
  return eKey === b.key
    && !!e.metaKey  === b.meta
    && !!e.shiftKey === b.shift
    && !!e.altKey   === b.alt
}

const KEY_LABELS: Record<string, string> = {
  ArrowLeft:  '←',
  ArrowRight: '→',
  ArrowUp:    '↑',
  ArrowDown:  '↓',
  Escape:     'Esc',
  Backspace:  '⌫',
  Delete:     '⌦',
  Enter:      '↩',
  Tab:        '⇥',
  ' ':        'Space',
}

export function formatBinding(b: Keybinding): string {
  const parts: string[] = []
  if (b.meta)  parts.push('⌘')
  if (b.alt)   parts.push('⌥')
  if (b.shift) parts.push('⇧')
  parts.push(KEY_LABELS[b.key] ?? b.key.toUpperCase())
  return parts.join('')
}
