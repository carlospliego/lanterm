import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../../renderer/store/useAppStore'
import type { BadgeData } from '../../registry'

export function useGitBadge(): BadgeData | null {
  const activeTerminalId = useAppStore(s => s.activeTerminalId)
  const focusedPaneId = useAppStore(s => s.focusedPaneId)
  const splitLayouts = useAppStore(s => s.splitLayouts)
  const terminals = useAppStore(s => s.terminals)

  const split = splitLayouts.find(sl => sl.leftId === activeTerminalId || sl.rightId === activeTerminalId)
  const effectiveId = (split && focusedPaneId) ? focusedPaneId : activeTerminalId
  const cwd = terminals.find(t => t.id === effectiveId)?.cwd ?? ''

  const [badge, setBadge] = useState<BadgeData | null>(null)

  const updateBadge = useCallback((info: { dirty: boolean; ahead: number; files: string[] } | null) => {
    if (!info) { setBadge(null); return }
    const count = info.files.length + info.ahead
    setBadge(count > 0 ? { count } : null)
  }, [])

  useEffect(() => {
    if (!effectiveId || !cwd) { setBadge(null); return }
    window.termAPI.gitBranch(effectiveId, cwd).then(updateBadge)
  }, [effectiveId, cwd, updateBadge])

  useEffect(() => {
    return window.termAPI.onGitUpdate((id, info) => {
      if (id === effectiveId) updateBadge(info)
    })
  }, [effectiveId, updateBadge])

  return badge
}
