import fs from 'fs'
import path from 'path'

/** Read the persisted app state from the temp userData directory */
export function readPersistedState(userDataDir: string): any {
  const statePath = path.join(userDataDir, 'appState.json')
  if (!fs.existsSync(statePath)) return null
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
}
