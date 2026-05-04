import {Badge} from '@/shared/ui/badge';

import type {Subscription} from '../model/types';

interface SubscriptionStatusBadgeProps {
    status: Subscription['status'];
}

export function SubscriptionStatusBadge({status}: SubscriptionStatusBadgeProps) {
    if (status === 'active') return <Badge>Active</Badge>;
    if (status === 'frozen') return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400">Frozen</Badge>;
    return <Badge variant="outline">Expired</Badge>;
}
