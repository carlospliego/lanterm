# LanTerm

A macOS terminal emulator built with Electron, React, xterm.js, and node-pty.

## Quick Reference

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Production build (electron-vite build)
npm run preview      # Preview production build
npm test             # Run all tests (Playwright e2e + Vitest unit)
npm run test:unit    # Unit tests only (vitest run)
npm run test:smoke   # Smoke e2e test only
npm run test:plugins # Plugin e2e tests only
```

After `npm install`, the postinstall script runs `electron-rebuild -f -w node-pty` to build the native PTY module for Electron's Node version.

## Architecture

The app follows Electron's three-process model:

```
src/
  main/           # Electron main process
    index.ts      # Window creation, IPC handler registration
    ptyManager.ts # PTY lifecycle, OSC 7 CWD parsing, lsof fallback
    stateManager.ts # JSON persistence to userData/appState.json
  preload/
    index.ts      # contextBridge -> window.termAPI
  renderer/       # React UI (single window)
    App.tsx       # Root layout, keybinding handler, state hydration/save
    store/useAppStore.ts # Zustand store (persisted via main process)
    components/   # Sidebar, TerminalPane, SettingsDialog, PluginGallery, etc.
    designTokens.ts # FONT_*, TYPE, RADIUS, SPACE, shared style constants
    terminalRegistry.ts # xterm instance map for serialize/focus
  shared/         # Code imported by both main and renderer
    types.ts      # AppState, Folder, TerminalSession, Settings
    ipcChannels.ts # IPC channel constants and arg types
    keybindings.ts # Command definitions and binding resolution
  plugins/           # Modular sidebar plugin system
    registry.ts      # SidebarPlugin interface, allPlugins array
    registry-main.ts # PluginMainModule collection for main process
    registry-preload.ts # PluginPreloadFactory collection for preload
    plugin-main.ts   # PluginMainModule interface, broadcast helper
    plugin-preload.ts # PluginPreloadFactory type
    git/             # Git commit graph panel
    claude-history/  # Claude Code session browser
    file-browser/    # Browse files in current directory
    worktree/        # Git worktree management
    vim-shortcuts/   # Searchable vim shortcut reference
    buttons/         # Custom buttons that run scripts
```

## Key Patterns

### IPC
All IPC channels are defined as constants in `src/shared/ipcChannels.ts`. The preload script (`src/preload/index.ts`) exposes a typed `window.termAPI` object via `contextBridge`. Renderer code calls `window.termAPI.*` methods; never uses `ipcRenderer` directly.

Each plugin can define its own IPC channels (e.g. `src/plugins/git/shared/channels.ts`), with handlers registered in `src/plugins/*/main/` and bridged in `preload/index.ts`.

### State Management
- **Zustand** store in `src/renderer/store/useAppStore.ts` holds all UI state
- Hydrated on launch from `stateManager.ts` (JSON file in userData)
- Saved on structural changes (debounced 1s) and before unload
- `getAppState()` serializes store to the `AppState` interface for persistence

### Plugin System
Each sidebar plugin follows a manifest pattern:
```
src/plugins/<name>/
  manifest.ts          # SidebarPlugin registration (id, name, description, components)
  renderer/            # React panel + optional settings component
  shared/              # Types and IPC channel constants
  main/                # Main-process handlers (if needed)
```

Plugins are collected in `src/plugins/registry.ts` as `allPlugins`. The `installedPlugins: string[]` array in the store controls which appear in the right sidebar. The Plugin Gallery modal allows install/uninstall at runtime.

### Styling
Inline styles using CSS custom properties (`var(--bg)`, `var(--text-primary)`, `var(--accent)`, etc.) with light/dark theme support. Shared constants in `designTokens.ts`. No CSS modules or external CSS framework.

## Plugin Rules

These rules MUST be followed when creating or modifying plugins. Violations will break the plugin system.

### Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Plugin folder | kebab-case | `my-plugin/` |
| Plugin ID | camelCase | `myPlugin` |
| Manifest export | `<name>Plugin` | `myPlugin` |
| Panel component | `<Name>Panel.tsx` | `MyPluginPanel.tsx` |
| Settings component | `<Name>Settings.tsx` | `MyPluginSettings.tsx` |
| IPC constant object | `<PLUGIN>_IPC` | `MY_PLUGIN_IPC` |
| IPC channel string | `'<plugin>:<action>'` | `'myPlugin:fetch'` |
| Handler functions | `register<Name>Handlers` / `unregister<Name>Handlers` | `registerMyPluginHandlers` |
| Preload factory | `<name>PreloadFactory` | `myPluginPreloadFactory` |
| TermAPI interface | `<Name>TermAPI` | `MyPluginTermAPI` |

### Structural Rules

1. **Every plugin MUST have** `manifest.ts` and `renderer/<Name>Panel.tsx` at minimum.
2. **All panel components MUST** use the collapsible header pattern: `panelHeaderStyle` from `designTokens.ts`, collapse arrow (`\u25B6`/`\u25BC`), and `useAppStore(s => s.panelCollapsed.<id>)`.
3. **All styling MUST** use inline styles with CSS custom properties (`var(--bg)`, `var(--text-primary)`, `var(--accent)`, `var(--border-subtle)`, etc.) and shared design tokens (`FONT_MONO`, `TYPE`, `RADIUS`, `SPACE`, `panelHeaderStyle`, `btnReset`). No CSS modules or external CSS.
4. **Manifest `order` field** controls sidebar sort position. Check existing plugins' order values before assigning.
5. **Set `defaultInstalled: true`** in the manifest for built-in plugins.

### Registration Checklist

Every new plugin MUST touch these files:

- `src/plugins/<name>/manifest.ts` — create with `SidebarPlugin` shape
- `src/plugins/registry.ts` — import manifest, add to `allPlugins` array
- `src/renderer/store/useAppStore.ts` — add default `pluginSettings.<id>` if plugin has settings

If the plugin needs IPC (main-process access), ALSO touch:

- `src/plugins/<name>/shared/channels.ts` — IPC channel constants (`as const`)
- `src/plugins/<name>/shared/termApi.ts` — TypeScript interface for API methods
- `src/plugins/<name>/main/index.ts` — export `PluginMainModule` with `register`/`cleanup`
- `src/plugins/<name>/preload/api.ts` — preload factory returning API methods
- `src/plugins/registry-main.ts` — add to `pluginMainModules` array
- `src/plugins/registry-preload.ts` — add factory to `pluginPreloadFactories` array

If the plugin has persistent state, add `state: { stateKey, hydrate, serialize }` to the manifest.

### IPC Rules

- **Never use `ipcRenderer` directly** in renderer code. All IPC goes through `window.termAPI.*`.
- **Preload factories** receive `ipcRenderer` and return an API object. Methods are auto-merged into `window.termAPI`.
- **Use `ipcMain.handle()`** for request-response. Use `broadcast(getWindows, channel, ...args)` from `plugin-main.ts` to push to all windows.
- **Every `PluginMainModule.register` MUST have a matching `cleanup`** that calls `ipcMain.removeHandler()` for each channel.
- **For event listeners** (`on`/`removeListener`), the preload factory method MUST return an unsubscribe function.

### State & Settings Rules

- Plugin settings live at `state.settings.pluginSettings.<pluginId>` in the Zustand store.
- Defaults MUST be defined in `DEFAULT_PLUGIN_SETTINGS` in `useAppStore.ts` and in the hydrate fallback.
- The `PluginSettingsMap` type in `src/shared/types.ts` MUST be updated when adding new plugin settings.
- Use `updatePluginSettings(pluginId, patch)` to update — never mutate directly.

## Creating a New Sidebar Plugin

Each right-sidebar plugin lives in `src/plugins/<name>/` and follows a standard structure. Here's the full process:

### 1. Create the directory structure

```
src/plugins/<name>/
  manifest.ts              # Plugin registration
  renderer/
    <Name>Panel.tsx        # Main panel component (required)
    <Name>Settings.tsx     # Settings component (optional, shown in Plugin Gallery)
  shared/                  # Only needed if the plugin has IPC
    types.ts               # Shared type definitions
    channels.ts            # IPC channel constants
  main/                    # Only needed if the plugin has main-process logic
    <name>Handlers.ts      # ipcMain handlers
```

### 2. Write the panel component

The panel renders inside the right sidebar column. Use the shared design tokens and collapsible header pattern:

```tsx
// src/plugins/<name>/renderer/<Name>Panel.tsx
import React from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { FONT_MONO, TYPE, panelHeaderStyle } from '../../../renderer/designTokens'

export function MyPluginPanel() {
  const collapsed = useAppStore(s => s.panelCollapsed.myPlugin)
  const setPanelCollapsed = useAppStore(s => s.setPanelCollapsed)

  return (
    <div style={{
      flexShrink: 0,
      fontFamily: FONT_MONO,
      fontSize: TYPE.body,
      color: 'var(--text-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div
        onClick={() => setPanelCollapsed('myPlugin', !collapsed)}
        style={{
          ...panelHeaderStyle,
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-faintest)' }}>
          {collapsed ? '\u25B6' : '\u25BC'}
        </span>
        My Plugin
      </div>
      {!collapsed && (
        <div style={{ padding: '6px 12px' }}>
          {/* Panel content */}
        </div>
      )}
    </div>
  )
}
```

### 3. Write the settings component (optional)

Shown inline in the Plugin Gallery when the user expands the plugin row:

```tsx
// src/plugins/<name>/renderer/<Name>Settings.tsx
import React from 'react'

export function MyPluginSettings() {
  return (
    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
      Description of what this plugin does and any configuration options.
    </div>
  )
}
```

### 4. Create the manifest

```tsx
// src/plugins/<name>/manifest.ts
import type { SidebarPlugin } from '../registry'
import { MyPluginPanel } from './renderer/MyPluginPanel'
import { MyPluginSettings } from './renderer/MyPluginSettings'

export const myPlugin: SidebarPlugin = {
  id: 'myPlugin',                              // unique, used in installedPlugins[]
  name: 'My Plugin',                            // display name in gallery
  description: 'Short description for gallery', // shown below name in gallery
  order: 3,                                  // sort order in sidebar
  PanelComponent: MyPluginPanel,
  SettingsComponent: MyPluginSettings,          // omit if no settings
}
```

### 5. Register in the plugin registry

```tsx
// src/plugins/registry.ts — add import and include in allPlugins array
import { myPlugin } from './<name>/manifest'

export const allPlugins: SidebarPlugin[] = [gitPlugin, claudeHistoryPlugin, fileBrowserPlugin, worktreePlugin, vimShortcutsPlugin, buttonsPlugin, myPlugin]
  .sort((a, b) => a.order - b.order)
```

### 6. Add to default installed plugins

In `src/renderer/store/useAppStore.ts`, add the plugin id to the default `installedPlugins` array so new users get it out of the box:

```tsx
installedPlugins: ['git', 'claudeHistory', 'fileBrowser', 'worktree', 'buttons', 'myPlugin'],
```

Also update the default in the `hydrate` fallback on the same file.

### 7. If the plugin needs IPC (main-process access)

For plugins that need to talk to the main process (filesystem, child processes, etc.):

**a. Define channel constants** in `src/plugins/<name>/shared/channels.ts`:
```tsx
export const MY_PLUGIN_IPC = {
  MY_ACTION: 'myPlugin:action',
} as const
```

**b. Write main-process handlers** in `src/plugins/<name>/main/<name>Handlers.ts`:
```tsx
import { ipcMain, type BrowserWindow } from 'electron'
import { MY_PLUGIN_IPC } from '../shared/channels'

export function registerMyPluginHandlers(getWindows: () => Set<BrowserWindow>) {
  ipcMain.handle(MY_PLUGIN_IPC.MY_ACTION, async (_event, args) => {
    // ...
  })
}

export function unregisterMyPluginHandlers() {
  ipcMain.removeHandler(MY_PLUGIN_IPC.MY_ACTION)
}
```

**c. Export a `PluginMainModule`** in `src/plugins/<name>/main/index.ts`:
```tsx
import type { PluginMainModule } from '../../plugin-main'
import { registerMyPluginHandlers, unregisterMyPluginHandlers } from './myPluginHandlers'

export const myPluginMainModule: PluginMainModule = {
  register(getWindows) {
    registerMyPluginHandlers(getWindows)
  },
  cleanup() {
    unregisterMyPluginHandlers()
  },
}
```

Then add to `src/plugins/registry-main.ts`:
```tsx
import { myPluginMainModule } from './<name>/main/index'
// Add to pluginMainModules array
```

**d. Write preload factory** in `src/plugins/<name>/preload/api.ts`:
```tsx
import type { PluginPreloadFactory } from '../../plugin-preload'
import { MY_PLUGIN_IPC } from '../shared/channels'

export const myPluginPreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  myAction: (arg: string): Promise<Result> =>
    ipcRenderer.invoke(MY_PLUGIN_IPC.MY_ACTION, arg),
})
```

Then add to `src/plugins/registry-preload.ts`:
```tsx
import { myPluginPreloadFactory } from './<name>/preload/api'
// Add to pluginPreloadFactories array
```

**e. Add types** to `TermAPI` interface in `src/renderer/electron.d.ts`:
```tsx
myAction(arg: string): Promise<Result>
```

## Important Notes

- `electron-vite` requires vite ^4 or ^5 (NOT vite 6 — peer dep conflict)
- `src/renderer/index.html` script src must be `./main.tsx` (relative path), not `/src/renderer/main.tsx`
- The `subscribeWithSelector` middleware on the Zustand store enables selective subscriptions for debounced saves
