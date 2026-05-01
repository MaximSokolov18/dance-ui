import {useOnlineStatus} from '@/shared/hooks/useOnlineStatus'
import {Toaster} from '@/shared/ui/sonner'

import Router from './router'

export default function App() {
    useOnlineStatus()

    return (
        <>
            <Router />
            <Toaster position="top-center" richColors />
        </>
    )
}
