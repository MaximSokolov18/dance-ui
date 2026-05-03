import {useOnlineStatus} from '@/shared/hooks/useOnlineStatus'
import {useOutboxSync} from '@/shared/hooks/useOutboxSync'
import {Toaster} from '@/shared/ui/sonner'

import Router from './router'

export default function App() {
    useOnlineStatus()
    useOutboxSync()

    return (
        <>
            <Router />
            <Toaster position="top-center" richColors />
        </>
    )
}
