export interface ButtonPrompt {
  title: string        // dialog title, e.g. "Commit Message"
  placeholder: string  // input placeholder, e.g. "Enter commit message…"
  variable: string     // substitution key — {{MESSAGE}} in command
}

export interface ButtonFolder {
  id: string
  label: string
  color?: string
  collapsed?: boolean
}

export interface ButtonConfig {
  id: string          // crypto.randomUUID()
  label: string       // "Build", "Deploy Staging"
  command: string     // "npm run build"
  cwd?: string        // working directory (defaults to active terminal cwd at runtime)
  color?: string      // optional CSS color for the button
  prompt?: ButtonPrompt
  runInTerminal?: boolean // when true, opens a new terminal tab instead of running in the background
  runInActiveTerminal?: boolean // when true, writes the command to the currently focused terminal
  runOnStartup?: boolean // when true, runs automatically when the app starts (background or new terminal only)
  folderId?: string   // optional folder grouping
}

export interface ButtonRunState {
  running: boolean
  output: string      // accumulated stdout+stderr (capped at ~50KB)
  exitCode: number | null
  durationMs: number | null
  pid: number | null
}

export interface ButtonsPluginSettings {
  panelMaxHeight: number
}

export interface ButtonRunArgs {
  buttonId: string
  command: string
  cwd: string
}

export interface ButtonOutputEvent {
  buttonId: string
  data: string
}

export interface ButtonExitEvent {
  buttonId: string
  exitCode: number
  durationMs: number
}
