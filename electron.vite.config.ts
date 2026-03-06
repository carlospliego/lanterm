import { resolve } from 'path'
import { readFileSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'rollup-plugin-obfuscator'

const pkgJson = JSON.parse(readFileSync('./package.json', 'utf8'))
const defines = { __APP_VERSION__: JSON.stringify(pkgJson.version) }

const obfuscatorOptions = {
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.2,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    splitStrings: true,
    splitStringsChunkLength: 10,
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), obfuscator(obfuscatorOptions)],
    define: defines,
    build: {
      rollupOptions: {
        external: ['node-pty']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), obfuscator(obfuscatorOptions)],
    define: defines,
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared')
      }
    },
    define: defines,
    plugins: [react(), obfuscator(obfuscatorOptions)]
  }
})
