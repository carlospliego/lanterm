import { create } from 'zustand'

// null = not yet determined (treat as available until first fetch resolves)
export const useWorktreeAvailability = create<{ available: boolean | null }>(() => ({ available: null }))
