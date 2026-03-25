# /audit-plugin — Validate a plugin against project conventions

## Arguments
- `$0` — plugin ID in camelCase (e.g. `myPlugin`). **Required.**

## Instructions

You are auditing an existing sidebar plugin for compliance with the project's plugin conventions defined in `CLAUDE.md`. Read each file and report issues, then fix them.

### Step 1 — Locate the plugin

Read `src/plugins/registry.ts` to find the import for plugin ID `$0`. Derive the kebab-case folder name from the import path. If the plugin is not registered, report it and stop.

### Step 2 — Check naming conventions

Verify all naming matches the rules in CLAUDE.md:

| Entity | Expected |
|---|---|
| Folder | kebab-case |
| Plugin ID | camelCase |
| Manifest export | `<camelCase>Plugin` |
| Panel component | `<PascalCase>Panel.tsx` |
| Settings component | `<PascalCase>Settings.tsx` (if exists) |
| IPC constant object | `<UPPER_SNAKE>_IPC` (if has IPC) |
| IPC channel strings | `'<camelCase>:<action>'` (if has IPC) |
| Handler functions | `register<PascalCase>Handlers` / `unregister<PascalCase>Handlers` (if has IPC) |
| Preload factory | `<camelCase>PreloadFactory` (if has IPC) |
| TermAPI interface | `<PascalCase>TermAPI` (if has IPC) |
| Main module export | `<camelCase>MainModule` (if has IPC) |

### Step 3 — Check registration

Verify the plugin is correctly wired in all required files:

- [ ] `src/plugins/registry.ts` — imported and in `allPlugins` array
- [ ] `src/renderer/store/useAppStore.ts` — ID in default `installedPlugins`
- [ ] `src/renderer/store/useAppStore.ts` — ID in `hydrate` fallback `installedPlugins`

If the plugin has IPC, also check:
- [ ] `src/plugins/registry-main.ts` — main module imported and in `pluginMainModules`
- [ ] `src/plugins/registry-preload.ts` — preload factory imported and in `pluginPreloadFactories`
- [ ] `src/plugins/registry-types.ts` — TermAPI interface imported and in `PluginTermAPI` intersection

### Step 4 — Check panel component

Read the panel component and verify:
- [ ] Uses `useAppStore(s => s.panelCollapsed.<pluginId>)` for collapse state
- [ ] Uses `panelHeaderStyle` from `designTokens.ts`
- [ ] Has collapse arrow (`▶`/`▼`) with correct toggle
- [ ] Uses inline styles with CSS custom properties (`var(--bg)`, `var(--text-primary)`, etc.)
- [ ] Does NOT use CSS modules or external CSS
- [ ] Uses `FONT_MONO`, `TYPE`, or other design tokens from `designTokens.ts`

### Step 5 — Check IPC compliance (if applicable)

If the plugin has `shared/channels.ts`:
- [ ] Channel constants use `as const`
- [ ] Channel strings follow `'<pluginId>:<action>'` pattern
- [ ] Every `ipcMain.handle()` in the register function has a matching `ipcMain.removeHandler()` in the cleanup function
- [ ] Preload factory uses `ipcRenderer.invoke()` (not direct ipcRenderer access)
- [ ] Renderer code uses `window.termAPI.*` (never `ipcRenderer` directly)

### Step 6 — Check manifest

Read the manifest and verify:
- [ ] Has all required fields: `id`, `name`, `description`, `order`, `PanelComponent`
- [ ] `id` matches the camelCase plugin ID
- [ ] `defaultInstalled` is set (should be `true` for built-in plugins)
- [ ] If plugin has settings component, `SettingsComponent` is set
- [ ] If plugin has state, `state.stateKey`, `state.hydrate`, and `state.serialize` are all present

### Step 7 — Report and fix

Output a summary table:

| Check | Status | Issue |
|---|---|---|
| Naming | PASS/FAIL | description |
| Registration | PASS/FAIL | description |
| Panel | PASS/FAIL | description |
| IPC | PASS/FAIL/N/A | description |
| Manifest | PASS/FAIL | description |

Then fix all FAIL items automatically. After fixing, run `npm run build` to verify compilation.
