# /add-ipc — Add an IPC channel to an existing plugin

## Arguments
- `$0` — plugin name in kebab-case (e.g. `my-plugin`). **Required.**
- `$1` — channel action name in camelCase (e.g. `saveItem`). **Required.**

## Instructions

You are adding a new IPC channel to an existing sidebar plugin. The plugin MUST already exist under `src/plugins/$0/`.

### Derive naming from arguments

| Derived name | Rule | Example for plugin `my-plugin`, channel `saveItem` |
|---|---|---|
| pluginId | camelCase of `$0` | `myPlugin` |
| IPC constant key | UPPER_SNAKE of `$1` | `SAVE_ITEM` |
| IPC channel string | `'<pluginId>:<$1>'` | `'myPlugin:saveItem'` |
| IPC constant object | `<UPPER_SNAKE_OF_PLUGIN>_IPC` | `MY_PLUGIN_IPC` |
| TermAPI method name | `<pluginId><PascalCase of $1>` | `myPluginSaveItem` |
| Handler register fn | `register<PascalCase of plugin>Handlers` | `registerMyPluginHandlers` |

### Step 1 — Verify the plugin exists and has IPC infrastructure

Check that these files exist:
- `src/plugins/$0/shared/channels.ts`
- `src/plugins/$0/shared/termApi.ts`
- `src/plugins/$0/main/` (handlers file)
- `src/plugins/$0/preload/api.ts`

If any are missing, inform the user that this plugin doesn't have IPC set up yet and suggest running `/create-plugin $0 with-ipc` or manually adding the IPC infrastructure first.

### Step 2 — Add the channel constant

In `src/plugins/$0/shared/channels.ts`, add the new constant to the IPC object:
```ts
<UPPER_SNAKE_KEY>: '<pluginId>:<$1>',
```

### Step 3 — Add the TermAPI method signature

In `src/plugins/$0/shared/termApi.ts`, add the new method to the interface:
```ts
<pluginId><PascalCase of $1>(args: unknown): Promise<unknown>
```

Ask the user what argument and return types they want, or use `unknown` as a placeholder.

### Step 4 — Add the main-process handler

In the plugin's handlers file (e.g. `src/plugins/$0/main/<pluginId>Handlers.ts`):

Add to the register function:
```ts
ipcMain.handle(<IPC_OBJECT>.<UPPER_SNAKE_KEY>, async (_event, args) => {
  // TODO: implement
  return null
})
```

Add to the unregister function:
```ts
ipcMain.removeHandler(<IPC_OBJECT>.<UPPER_SNAKE_KEY>)
```

### Step 5 — Add the preload bridge method

In `src/plugins/$0/preload/api.ts`, add the new method to the factory return object:
```ts
<pluginId><PascalCase of $1>: (args: unknown): Promise<unknown> =>
  ipcRenderer.invoke(<IPC_OBJECT>.<UPPER_SNAKE_KEY>, args),
```

### Step 6 — Verify

Run `npm run build` and confirm it compiles without errors.
