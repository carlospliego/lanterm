import type { FileEntry } from './types'

export interface FileBrowserTermAPI {
  fileList(dir: string): Promise<FileEntry[]>
  fileRead(path: string): Promise<string | null>
}
