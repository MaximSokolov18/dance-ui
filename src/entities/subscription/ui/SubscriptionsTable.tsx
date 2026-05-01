import {Pencil, Trash2} from 'lucide-react';

import {Button} from '@/shared/ui/button';
import {Skeleton} from '@/shared/ui/skeleton';

import type {Subscription} from '../model/types';
import {SubscriptionStatusBadge} from './SubscriptionStatusBadge';

interface SubscriptionsTableProps {
    subscriptions: Subscription[];
    loading: boolean;
    clientMap: Map<string, string>;
    groupMap: Map<string, string>;
    onEdit: (subscription: Subscription) => void;
    onDelete: (subscription: Subscription) => void;
}

export function SubscriptionsTable({
    subscriptions,
    loading,
    clientMap,
    groupMap,
    onEdit,
    onDelete,
}: SubscriptionsTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Client</th>
                        <th className="px-4 py-3 font-medium">Group</th>
                        <th className="px-4 py-3 font-medium">Start</th>
                        <th className="px-4 py-3 font-medium">End</th>
                        <th className="px-4 py-3 font-medium">Classes</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium" />
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array.from({length: 5}).map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <tr key={i} className="border-b last:border-0">
                                {Array.from({length: 8}).map((_, j) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <td key={j} className="px-4 py-3">
                                        <Skeleton className="h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : subscriptions.map(sub => (
                            <tr
                                key={sub.id}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3 font-medium">
                                    {clientMap.get(sub.clientId ?? '') ?? sub.clientId ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {groupMap.get(sub.groupId ?? '') ?? sub.groupId ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                    {sub.periodStart ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                    {sub.periodEnd ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {sub.classesUsed != null && sub.classesTotal != null
                                        ? `${sub.classesUsed} / ${sub.classesTotal}`
                                        : sub.classesTotal ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {sub.amountPaid ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    <SubscriptionStatusBadge status={sub.status} />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => onEdit(sub)}
                                            aria-label="Edit subscription"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => onDelete(sub)}
                                            aria-label="Delete subscription"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    {!loading && subscriptions.length === 0 && (
                        <tr>
                            <td
                                colSpan={7}
                                className="px-4 py-10 text-center text-muted-foreground"
                            >
                                No subscriptions yet. Add your first one!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
