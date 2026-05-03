import {create} from 'zustand'

type SyncStatus = 'idle' | 'syncing' | 'error'

interface AppState {
    isOnline: boolean
    syncStatus: SyncStatus
    pendingMutations: number
    setOnline: (online: boolean) => void
    setSyncStatus: (status: SyncStatus) => void
    setPendingMutations: (count: number) => void
}

export const useAppStore = create<AppState>((set) => ({
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    pendingMutations: 0,
    setOnline: (online) => set({isOnline: online}),
    setSyncStatus: (syncStatus) => set({syncStatus}),
    setPendingMutations: (pendingMutations) => set({pendingMutations}),
}))
