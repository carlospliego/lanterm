import type { ITheme } from '@xterm/xterm'

export interface TerminalThemeDefinition {
  id: string
  name: string
  isDark: boolean
  theme: ITheme
}

export const AUTO_THEME_ID = 'auto'

const defaultDark: TerminalThemeDefinition = {
  id: 'defaultDark',
  name: 'Default Dark',
  isDark: true,
  theme: {
    background: '#1a1a1a',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    selectionBackground: '#264f78',
    black: '#1a1a1a',
    red: '#f14c4c',
    green: '#23d18b',
    yellow: '#f5f543',
    blue: '#3b8eea',
    magenta: '#d670d6',
    cyan: '#29b8db',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f1897f',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
  },
}

const defaultLight: TerminalThemeDefinition = {
  id: 'defaultLight',
  name: 'Default Light',
  isDark: false,
  theme: {
    background: '#f0f0f0',
    foreground: '#1a1a1a',
    cursor: '#1a1a1a',
    selectionBackground: '#a8c8e8',
    black: '#1a1a1a',
    red: '#cc0000',
    green: '#007700',
    yellow: '#887700',
    blue: '#0055bb',
    magenta: '#880088',
    cyan: '#007788',
    white: '#aaaaaa',
    brightBlack: '#555555',
    brightRed: '#cc4444',
    brightGreen: '#44aa44',
    brightYellow: '#aaaa44',
    brightBlue: '#4477bb',
    brightMagenta: '#aa44aa',
    brightCyan: '#44aaaa',
    brightWhite: '#ffffff',
  },
}

const dracula: TerminalThemeDefinition = {
  id: 'dracula',
  name: 'Dracula',
  isDark: true,
  theme: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selectionBackground: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
}

const solarizedDark: TerminalThemeDefinition = {
  id: 'solarizedDark',
  name: 'Solarized Dark',
  isDark: true,
  theme: {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    selectionBackground: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
}

const solarizedLight: TerminalThemeDefinition = {
  id: 'solarizedLight',
  name: 'Solarized Light',
  isDark: false,
  theme: {
    background: '#fdf6e3',
    foreground: '#657b83',
    cursor: '#657b83',
    selectionBackground: '#eee8d5',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
}

const oneDark: TerminalThemeDefinition = {
  id: 'oneDark',
  name: 'One Dark',
  isDark: true,
  theme: {
    background: '#282c34',
    foreground: '#abb2bf',
    cursor: '#528bff',
    selectionBackground: '#3e4451',
    black: '#282c34',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#e5c07b',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf',
    brightBlack: '#5c6370',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff',
  },
}

const monokai: TerminalThemeDefinition = {
  id: 'monokai',
  name: 'Monokai',
  isDark: true,
  theme: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selectionBackground: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5',
  },
}

const nord: TerminalThemeDefinition = {
  id: 'nord',
  name: 'Nord',
  isDark: true,
  theme: {
    background: '#2e3440',
    foreground: '#d8dee9',
    cursor: '#d8dee9',
    selectionBackground: '#434c5e',
    black: '#3b4252',
    red: '#bf616a',
    green: '#a3be8c',
    yellow: '#ebcb8b',
    blue: '#81a1c1',
    magenta: '#b48ead',
    cyan: '#88c0d0',
    white: '#e5e9f0',
    brightBlack: '#4c566a',
    brightRed: '#bf616a',
    brightGreen: '#a3be8c',
    brightYellow: '#ebcb8b',
    brightBlue: '#81a1c1',
    brightMagenta: '#b48ead',
    brightCyan: '#8fbcbb',
    brightWhite: '#eceff4',
  },
}

const gruvboxDark: TerminalThemeDefinition = {
  id: 'gruvboxDark',
  name: 'Gruvbox Dark',
  isDark: true,
  theme: {
    background: '#282828',
    foreground: '#ebdbb2',
    cursor: '#ebdbb2',
    selectionBackground: '#504945',
    black: '#282828',
    red: '#cc241d',
    green: '#98971a',
    yellow: '#d79921',
    blue: '#458588',
    magenta: '#b16286',
    cyan: '#689d6a',
    white: '#a89984',
    brightBlack: '#928374',
    brightRed: '#fb4934',
    brightGreen: '#b8bb26',
    brightYellow: '#fabd2f',
    brightBlue: '#83a598',
    brightMagenta: '#d3869b',
    brightCyan: '#8ec07c',
    brightWhite: '#ebdbb2',
  },
}

const tokyoNight: TerminalThemeDefinition = {
  id: 'tokyoNight',
  name: 'Tokyo Night',
  isDark: true,
  theme: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    selectionBackground: '#33467c',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
  },
}

export const TERMINAL_THEMES: TerminalThemeDefinition[] = [
  defaultDark,
  defaultLight,
  dracula,
  solarizedDark,
  solarizedLight,
  oneDark,
  monokai,
  nord,
  gruvboxDark,
  tokyoNight,
]

export function getThemeById(id: string): TerminalThemeDefinition | undefined {
  return TERMINAL_THEMES.find(t => t.id === id)
}

/**
 * Resolves a theme ID to an ITheme object.
 * - 'auto' resolves to defaultDark or defaultLight based on resolvedTheme
 * - Named themes resolve directly
 * - Unknown IDs fall back to auto behavior
 */
export function resolveTerminalTheme(themeId: string, resolvedTheme: 'light' | 'dark'): ITheme {
  if (themeId === AUTO_THEME_ID) {
    return resolvedTheme === 'light' ? defaultLight.theme : defaultDark.theme
  }
  const found = getThemeById(themeId)
  if (found) return found.theme
  // Fallback for unknown IDs
  return resolvedTheme === 'light' ? defaultLight.theme : defaultDark.theme
}
