import {Badge} from '@/shared/ui/badge'

import type {Client} from '../model/types'

interface ClientStatusBadgeProps {
    client: Client
}

export function ClientStatusBadge({client}: ClientStatusBadgeProps) {
    return client.active ? (
        <Badge>Active</Badge>
    ) : (
        <Badge variant="outline">Inactive</Badge>
    )
}
