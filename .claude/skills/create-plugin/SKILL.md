# /create-plugin — Scaffold a new sidebar plugin

## Arguments
- `$0` — plugin name in kebab-case (e.g. `my-plugin`). **Required.**
- `$1` — pass `with-ipc` to include main-process IPC scaffolding. Optional.

## Instructions

You are creating a new sidebar plugin for this Electron terminal emulator. Follow the plugin conventions in `CLAUDE.md` exactly.

### Derive naming from `$0`

| Derived name | Rule | Example for `my-plugin` |
|---|---|---|
| folder | `$0` as-is | `my-plugin/` |
| pluginId | camelCase | `myPlugin` |
| manifest export | `<camelCase>Plugin` | `myPluginPlugin` |
| Panel component | `<PascalCase>Panel` | `MyPluginPanel` |
| Settings component | `<PascalCase>Settings` | `MyPluginSettings` |
| IPC constant object | `<UPPER_SNAKE>_IPC` | `MY_PLUGIN_IPC` |
| IPC channel prefix | `'<camelCase>:'` | `'myPlugin:'` |
| Handler functions | `register<PascalCase>Handlers` / `unregister<PascalCase>Handlers` | `registerMyPluginHandlers` / `unregisterMyPluginHandlers` |
| Preload factory | `<camelCase>PreloadFactory` | `myPluginPreloadFactory` |
| TermAPI interface | `<PascalCase>TermAPI` | `MyPluginTermAPI` |
| Main module export | `<camelCase>MainModule` | `myPluginMainModule` |

### Step 1 — Determine the next `order` value

Read `src/plugins/registry.ts` and find the highest existing `order` value among registered plugins. Use that value + 1 for the new plugin.

### Step 2 — Create the base files

Create these files under `src/plugins/$0/`:

**`manifest.ts`** — Follow this pattern:
```ts
import type { SidebarPlugin } from '../registry'
import { <PascalCase>Panel } from './renderer/<PascalCase>Panel'
import { <PascalCase>Settings } from './renderer/<PascalCase>Settings'

export const <camelCase>Plugin: SidebarPlugin = {
  id: '<camelCase>',
  name: '<Human Readable Name>',
  description: '<Brief description>',
  order: <next order value>,
  PanelComponent: <PascalCase>Panel,
  SettingsComponent: <PascalCase>Settings,
  defaultInstalled: true,
}
```

**`renderer/<PascalCase>Panel.tsx`** — Use the collapsible header pattern:
```tsx
import React from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import { FONT_MONO, TYPE, panelHeaderStyle } from '../../../renderer/designTokens'

export function <PascalCase>Panel() {
  const collapsed = useAppStore(s => s.panelCollapsed.<camelCase>)
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
        onClick={() => setPanelCollapsed('<camelCase>', !collapsed)}
        style={{
          ...panelHeaderStyle,
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: 9, color: 'var(--text-faintest)' }}>
          {collapsed ? '\u25B6' : '\u25BC'}
        </span>
        <Human Readable Name>
      </div>
      {!collapsed && (
        <div style={{ padding: '6px 12px' }}>
          {/* TODO: Panel content */}
        </div>
      )}
    </div>
  )
}
```

**`renderer/<PascalCase>Settings.tsx`**:
```tsx
import React from 'react'

export function <PascalCase>Settings() {
  return (
    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
      Configure <Human Readable Name> settings.
    </div>
  )
}
```

### Step 3 — If `$1` is `with-ipc`, create IPC files

**`shared/channels.ts`**:
```ts
export const <UPPER_SNAKE>_IPC = {
  FETCH: '<camelCase>:fetch',
} as const
```

**`shared/termApi.ts`**:
```ts
export interface <PascalCase>TermAPI {
  <camelCase>Fetch(): Promise<unknown>
}
```

**`shared/types.ts`** — empty starter:
```ts
// Shared types for <Human Readable Name> plugin
```

**`main/<camelCase>Handlers.ts`**:
```ts
import { ipcMain, type BrowserWindow } from 'electron'
import { <UPPER_SNAKE>_IPC } from '../shared/channels'

export function register<PascalCase>Handlers(getWindows: () => Set<BrowserWindow>) {
  ipcMain.handle(<UPPER_SNAKE>_IPC.FETCH, async (_event) => {
    // TODO: implement
    return null
  })
}

export function unregister<PascalCase>Handlers() {
  ipcMain.removeHandler(<UPPER_SNAKE>_IPC.FETCH)
}
```

**`main/index.ts`**:
```ts
import type { PluginMainModule } from '../../plugin-main'
import { register<PascalCase>Handlers, unregister<PascalCase>Handlers } from './<camelCase>Handlers'

export const <camelCase>MainModule: PluginMainModule = {
  register(getWindows) {
    register<PascalCase>Handlers(getWindows)
  },
  cleanup() {
    unregister<PascalCase>Handlers()
  },
}
```

**`preload/api.ts`**:
```ts
import type { PluginPreloadFactory } from '../../plugin-preload'
import { <UPPER_SNAKE>_IPC } from '../shared/channels'

export const <camelCase>PreloadFactory: PluginPreloadFactory = (ipcRenderer) => ({
  <camelCase>Fetch: (): Promise<unknown> =>
    ipcRenderer.invoke(<UPPER_SNAKE>_IPC.FETCH),
})
```

### Step 4 — Register in all registry files

**`src/plugins/registry.ts`** — Add import and append to `allPlugins` array (before `.sort()`).

**If IPC (`$1` is `with-ipc`):**

**`src/plugins/registry-main.ts`** — Import the main module and add to `pluginMainModules` array.

**`src/plugins/registry-preload.ts`** — Import the preload factory and add to `pluginPreloadFactories` array.

**`src/plugins/registry-types.ts`** — Import the TermAPI interface and add to the `PluginTermAPI` intersection type.

### Step 5 — Add to store defaults

In `src/renderer/store/useAppStore.ts`:
- Add `'<camelCase>'` to the default `installedPlugins` array
- Also add it to the `installedPlugins` fallback in the `hydrate` action

### Step 6 — Verify

Run `npm run build` and confirm it compiles without errors.
