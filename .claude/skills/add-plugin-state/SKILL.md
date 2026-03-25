# /add-plugin-state — Add persistent state to a plugin

## Arguments
- `$0` — plugin name in kebab-case (e.g. `my-plugin`). **Required.**

## Instructions

You are adding persistent state (hydrate/serialize) to an existing sidebar plugin that doesn't have it yet. This allows the plugin to save and restore data across app restarts via the main-process state manager.

### Derive naming

| Derived name | Rule | Example for `my-plugin` |
|---|---|---|
| pluginId | camelCase of `$0` | `myPlugin` |
| Store file | `use<PascalCase>Store.ts` | `useMyPluginStore.ts` |
| Store hook | `use<PascalCase>Store` | `useMyPluginStore` |
| State key | kebab-case or camelCase string | `'myPlugin'` |

### Step 1 — Verify plugin exists and has no state

Read `src/plugins/$0/manifest.ts`. Confirm the plugin exists and does NOT already have a `state` property. If it does, inform the user and stop.

### Step 2 — Create a Zustand store for the plugin

Create `src/plugins/$0/renderer/use<PascalCase>Store.ts`:

```ts
import { create } from 'zustand'

interface <PascalCase>State {
  // TODO: define state shape
  items: unknown[]
  hydrate: (data: unknown) => void
}

export const use<PascalCase>Store = create<<PascalCase>State>((set) => ({
  items: [],
  hydrate: (data: unknown) => {
    if (Array.isArray(data)) {
      set({ items: data })
    }
  },
}))
```

Ask the user what state shape they want. The `hydrate` method must accept `unknown` and validate the shape defensively before setting state.

### Step 3 — Add state to the manifest

Edit `src/plugins/$0/manifest.ts` to add the `state` property:

```ts
import { use<PascalCase>Store } from './renderer/use<PascalCase>Store'

// In the plugin object:
state: {
  stateKey: '<pluginId>',
  hydrate: (data: unknown) => {
    use<PascalCase>Store.getState().hydrate(data)
  },
  serialize: () => {
    return use<PascalCase>Store.getState().items
  },
},
```

The `stateKey` is used as the key in the persisted JSON file. The `hydrate` function is called on app launch with the saved data. The `serialize` function is called when saving state.

### Step 4 — Wire into panel component

If the panel component needs to read from the store, update `src/plugins/$0/renderer/<PascalCase>Panel.tsx` to import and use the store:

```ts
import { use<PascalCase>Store } from './use<PascalCase>Store'

// Inside the component:
const items = use<PascalCase>Store(s => s.items)
```

### Step 5 — Verify

Run `npm run build` and confirm it compiles without errors.

### Reference: How state persistence works

The app's state manager (`src/main/stateManager.ts`) saves a JSON file to `userData/appState.json`. Each plugin with a `state` property gets its own key in this file. On launch, the hydration system calls each plugin's `hydrate(data)` with the saved value. On save, it calls `serialize()` and stores the result.

The existing plugins `buttons` and `worktree` use this pattern — reference them for real-world examples:
- `src/plugins/buttons/manifest.ts` — hydrates a Zustand store with buttons/folders
- `src/plugins/worktree/manifest.ts` — hydrates a Zustand store with tasks by worktree
