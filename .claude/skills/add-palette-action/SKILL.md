# /add-palette-action — Add a command palette action to an existing plugin

## Arguments
- `$0` — plugin name in kebab-case (e.g. `my-plugin`). **Required.**
- `$1` — action name in camelCase (e.g. `refresh`). **Required.**

## Instructions

You are adding a command palette action to an existing sidebar plugin. The action will appear in the unified command palette (Cmd+K).

### Derive naming from arguments

| Derived name | Rule | Example for plugin `my-plugin`, action `refresh` |
|---|---|---|
| pluginId | camelCase of `$0` | `myPlugin` |
| Action ID | `'<pluginId>:<$1>'` | `'myPlugin:refresh'` |
| Action label | `'<Plugin Name>: <Human Readable>'` | `'My Plugin: Refresh'` |
| Group | Plugin's display name | `'My Plugin'` |

### Step 1 — Verify the plugin exists

Check that `src/plugins/$0/manifest.ts` exists. Read it to get the plugin's `name` field for the action label and group.

### Step 2 — Check if plugin already has actions

Read the manifest file. If it already has an `actions()` method, you'll add to it. If not, you'll create one.

### Step 3 — Determine action behavior

Ask the user what the action should do. Common patterns in this project:

**a. Call a termAPI method (IPC)**
```ts
execute: async () => {
  const result = await window.termAPI.myPluginRefresh()
  // handle result
}
```

**b. Update store state**
```ts
execute: async () => {
  useAppStore.getState().someAction()
}
```

**c. Show an input dialog then act**
```ts
execute: async () => {
  const value = await showInput('Title', 'Placeholder…')
  if (value === null) return
  await window.termAPI.myPluginAction(value)
}
```

### Step 4 — Add the action

**If the manifest already has `actions()`:**

Add the new action object to the returned array:
```ts
{
  id: '<pluginId>:<$1>',
  label: '<Plugin Name>: <Human Readable>',
  group: '<Plugin Name>',
  execute: async () => {
    // implementation
  },
},
```

**If the manifest does NOT have `actions()`:**

Add the `actions()` method to the plugin object and import `PaletteAction` from `../../shared/types`:
```ts
import type { PaletteAction } from '../../shared/types'

// In the plugin object:
actions(): PaletteAction[] {
  return [
    {
      id: '<pluginId>:<$1>',
      label: '<Plugin Name>: <Human Readable>',
      group: '<Plugin Name>',
      execute: async () => {
        // implementation
      },
    },
  ]
},
```

### Step 5 — Add imports if needed

If the action uses `showInput`, add:
```ts
import { showInput } from '../../renderer/components/InputDialog'
```

If the action uses `showToast`, add:
```ts
import { showToast } from '../../renderer/components/Toast'
```

If the action uses `useAppStore`, add:
```ts
import { useAppStore } from '../../renderer/store/useAppStore'
```

### Step 6 — Verify

Run `npm run build` and confirm it compiles without errors.
