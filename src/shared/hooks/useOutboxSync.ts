import {useEffect, useRef} from 'react'

import {useAppStore} from '@/app/store/useAppStore'
import {getOutboxCount, processOutbox} from '@/shared/lib/outbox'

export function useOutboxSync(): void {
    const isOnline = useAppStore(s => s.isOnline)
    const setSyncStatus = useAppStore(s => s.setSyncStatus)
    const setPendingMutations = useAppStore(s => s.setPendingMutations)
    const wasOnlineRef = useRef(isOnline)

    // Refresh pending count on mount
    useEffect(() => {
        getOutboxCount().then(setPendingMutations)
    }, [setPendingMutations])

    // Replay outbox when coming back online
    useEffect(() => {
        if (isOnline && !wasOnlineRef.current) {
            setSyncStatus('syncing')
            processOutbox()
                .then(() => getOutboxCount())
                .then(count => {
                    setPendingMutations(count)
                    setSyncStatus('idle')
                })
                .catch(() => setSyncStatus('error'))
        }
        wasOnlineRef.current = isOnline
    }, [isOnline, setSyncStatus, setPendingMutations])
}
