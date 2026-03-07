import { describe, it, expect } from 'vitest'
import { shellEscape } from '../shellEscape'

describe('shellEscape', () => {
  it('escapes spaces', () => {
    expect(shellEscape('/Users/carlos/my file.txt')).toBe('/Users/carlos/my\\ file.txt')
  })

  it('escapes multiple spaces in a path', () => {
    expect(shellEscape('/Users/carlos/Downloads/Screenshot 2026-03-07 at 11.05.02 AM.png'))
      .toBe('/Users/carlos/Downloads/Screenshot\\ 2026-03-07\\ at\\ 11.05.02\\ AM.png')
  })

  it('escapes parentheses', () => {
    expect(shellEscape('/path/to/file (copy).txt')).toBe('/path/to/file\\ \\(copy\\).txt')
  })

  it('escapes single quotes', () => {
    expect(shellEscape("/path/it's here")).toBe("/path/it\\'s\\ here")
  })

  it('escapes double quotes', () => {
    expect(shellEscape('/path/"quoted"')).toBe('/path/\\"quoted\\"')
  })

  it('escapes ampersand, semicolon, pipe', () => {
    expect(shellEscape('/path/a&b;c|d')).toBe('/path/a\\&b\\;c\\|d')
  })

  it('escapes dollar sign and backtick', () => {
    expect(shellEscape('/path/$HOME/`cmd`')).toBe('/path/\\$HOME/\\`cmd\\`')
  })

  it('escapes glob characters', () => {
    expect(shellEscape('/path/*.txt')).toBe('/path/\\*.txt')
    expect(shellEscape('/path/file?.txt')).toBe('/path/file\\?.txt')
  })

  it('escapes brackets and braces', () => {
    expect(shellEscape('/path/[a]/file{1,2}')).toBe('/path/\\[a\\]/file\\{1,2\\}')
  })

  it('escapes hash, tilde, backslash', () => {
    expect(shellEscape('/path/#readme')).toBe('/path/\\#readme')
    expect(shellEscape('~/file')).toBe('\\~/file')
    expect(shellEscape('/path/back\\slash')).toBe('/path/back\\\\slash')
  })

  it('escapes redirects', () => {
    expect(shellEscape('/path/a<b>c')).toBe('/path/a\\<b\\>c')
  })

  it('escapes exclamation mark', () => {
    expect(shellEscape('/path/wow!')).toBe('/path/wow\\!')
  })

  it('leaves simple paths unchanged', () => {
    expect(shellEscape('/Users/carlos/src/lanterm')).toBe('/Users/carlos/src/lanterm')
    expect(shellEscape('/usr/local/bin/node')).toBe('/usr/local/bin/node')
  })
})
