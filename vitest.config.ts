import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'out/**'],
  },
})
