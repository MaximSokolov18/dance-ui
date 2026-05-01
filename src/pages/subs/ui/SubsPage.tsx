import {Plus} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';

import type {Client} from '@/entities/client';
import type {Group} from '@/entities/group';
import {type Subscription, SubscriptionsTable} from '@/entities/subscription';
import {UpsertSubscriptionDialog} from '@/features/subscriptions/upsert-subscription';
import {api} from '@/shared/api';
import type {Holiday} from '@/shared/api';
import {Button} from '@/shared/ui/button';

export function SubsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<Subscription | null>(null);

    useEffect(() => {
        Promise.all([
            api.subscriptions.list(),
            api.clients.list(),
            api.groups.list(),
            api.holidays.list(),
        ])
            .then(([subs, cls, grps, hols]) => {
                setSubscriptions(subs);
                setClients(cls);
                setGroups(grps);
                setHolidays(hols);
            })
            .catch((err: Error) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, []);

    const clientMap = useMemo(
        () => new Map(clients.map(c => [c.id ?? '', c.name ?? ''])),
        [clients],
    );

    const groupMap = useMemo(
        () => new Map(groups.map(g => [g.id ?? '', g.name ?? ''])),
        [groups],
    );

    const openAdd = () => {
        setEditingSub(null);
        setDialogOpen(true);
    };

    const openEdit = (sub: Subscription) => {
        setEditingSub(sub);
        setDialogOpen(true);
    };

    const handleSaved = (saved: Subscription, isNew: boolean) => {
        if (isNew) {
            setSubscriptions(prev => [saved, ...prev]);
        } else {
            setSubscriptions(prev => prev.map(s => (s.id === saved.id ? saved : s)));
        }
    };

    const handleDelete = async (sub: Subscription) => {
        if (!window.confirm(`Delete this subscription?`)) return;
        try {
            await api.subscriptions.delete(sub.id!);
            setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
            toast.success('Subscription deleted');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Subscriptions</h1>
                <Button size="sm" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add subscription
                </Button>
            </div>

            <SubscriptionsTable
                subscriptions={subscriptions}
                loading={loading}
                clientMap={clientMap}
                groupMap={groupMap}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            <UpsertSubscriptionDialog
                open={dialogOpen}
                subscription={editingSub}
                clients={clients}
                groups={groups}
                holidays={holidays}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />
        </div>
    );
}
