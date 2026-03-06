import { create } from 'zustand'

export const useGitAvailability = create<{ available: boolean }>(() => ({ available: false }))
