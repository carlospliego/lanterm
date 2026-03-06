# /remove-plugin — Remove a plugin completely

## Arguments
- `$ARGUMENTS` — one or more plugin IDs in camelCase (e.g. `myPlugin`), space-separated.

## Instructions

You are removing sidebar plugin(s) from this Electron terminal emulator. For each plugin ID provided:

### Step 1 — Identify the plugin folder

Read `src/plugins/registry.ts` to find the import path for this plugin's manifest. The folder name is the kebab-case directory under `src/plugins/`.

### Step 2 — Remove from registry files

**`src/plugins/registry.ts`:**
- Remove the manifest import line
- Remove the manifest variable from the `allPlugins` array

**`src/plugins/registry-main.ts`** (if the plugin has a main module entry):
- Remove the import line
- Remove from `pluginMainModules` array

**`src/plugins/registry-preload.ts`** (if the plugin has a preload factory entry):
- Remove the import line
- Remove from `pluginPreloadFactories` array

**`src/plugins/registry-types.ts`** (if the plugin has a TermAPI entry):
- Remove the import line
- Remove from the `PluginTermAPI` intersection type
- If removing the last type, set `PluginTermAPI = Record<string, never>`

### Step 3 — Remove from store defaults

In `src/renderer/store/useAppStore.ts`:
- Remove the plugin ID from the default `installedPlugins` array
- Remove the plugin ID from the `installedPlugins` fallback in the `hydrate` action
- Remove any `pluginSettings.<pluginId>` defaults in `DEFAULT_PLUGIN_SETTINGS` if present

### Step 4 — Delete the plugin directory

Delete the entire `src/plugins/<kebab-case-folder>/` directory.

### Step 5 — Check for stale references

Search the codebase for any remaining references to:
- The plugin ID (camelCase form)
- The plugin folder name (kebab-case form)
- Any IPC channel prefixes (e.g. `'myPlugin:'`)
- Any TermAPI method names

Fix or remove any stale references found.

### Step 6 — Verify

Run `npm run build` and confirm it compiles without errors.
