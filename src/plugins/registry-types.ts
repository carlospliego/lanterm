import type { GitTermAPI } from './git/shared/termApi'
import type { ClaudeTermAPI } from './claude-history/shared/termApi'
import type { FileBrowserTermAPI } from './file-browser/shared/termApi'
import type { WorktreeTermAPI } from './worktree/shared/termApi'

export type PluginTermAPI = GitTermAPI & ClaudeTermAPI & FileBrowserTermAPI & WorktreeTermAPI