import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

export default function globalSetup() {
  const outFile = path.resolve(__dirname, '../out/main/index.js')
  if (fs.existsSync(outFile)) {
    const outMtime = fs.statSync(outFile).mtimeMs
    // Skip if build output is less than 5 min old
    if (Date.now() - outMtime < 5 * 60 * 1000) {
      console.log('[global-setup] Skipping build (recent output exists)')
      return
    }
  }

  console.log('[global-setup] Building app...')
  execSync('npm run build', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  })
  console.log('[global-setup] Build complete.')
}
