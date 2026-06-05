import {Plus, Search} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';

import {useAppStore} from '@/app/store/useAppStore';
import type {Client} from '@/entities/client';
import type {Group} from '@/entities/group';
import {type Subscription, SubscriptionsTable} from '@/entities/subscription';
import {UpsertSubscriptionDialog} from '@/features/subscriptions/upsert-subscription';
import {api} from '@/shared/api';
import {fetchWithFallback} from '@/shared/lib/cacheFirst';
import {db} from '@/shared/lib/db';
import {addToOutbox, getOutboxCount, isOfflineError} from '@/shared/lib/outbox';
import {cn} from '@/shared/lib/utils';
import {Button} from '@/shared/ui/button';
import {ConfirmDialog} from '@/shared/ui/confirm-dialog';

type StatusFilter = 'all' | 'active' | 'frozen' | 'expired';

const STATUS_TABS: {value: StatusFilter; label: string}[] = [
    {value: 'all', label: 'All'},
    {value: 'active', label: 'Active'},
    {value: 'frozen', label: 'Frozen'},
    {value: 'expired', label: 'Expired'},
];

export function SubsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<Subscription | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);

    useEffect(() => {
        Promise.all([
            fetchWithFallback(() => api.subscriptions.list(), db.subscriptions),
            fetchWithFallback(api.clients.list, db.clients),
            fetchWithFallback(api.groups.list, db.groups),
        ])
            .then(([subs, cls, grps]) => {
                setSubscriptions(subs.data);
                setClients(cls.data);
                setGroups(grps.data);
                if (subs.fromCache || cls.fromCache || grps.fromCache) {
                    toast.info('You\'re offline — showing cached data');
                }
            })
            .catch(() => toast.error('Failed to load subscriptions'))
            .finally(() => setLoading(false));
    }, []);

    const clientMap = useMemo(
        () => new Map(clients.map(c => [c.id ?? '', c.name ?? ''])),
        [clients],
    );

    const clientIllnessesMap = useMemo(
        () => new Map(clients.map(c => [c.id ?? '', c.illnesses ?? null])),
        [clients],
    );

    const groupMap = useMemo(
        () => new Map(groups.map(g => [g.id ?? '', g.name ?? ''])),
        [groups],
    );

    const filteredSubscriptions = useMemo(() => {
        const byStatus = statusFilter === 'all'
            ? subscriptions
            : subscriptions.filter(s => s.status === statusFilter);
        if (!searchQuery) return byStatus;
        const q = searchQuery.toLowerCase();
        return byStatus.filter(s => {
            const name = clientMap.get(s.clientId ?? '') ?? '';
            return name.toLowerCase().includes(q);
        });
    }, [subscriptions, statusFilter, searchQuery, clientMap]);

    const openAdd = () => {
        setEditingSub(null);
        setDialogOpen(true);
    };

    const openEdit = (sub: Subscription) => {
        setEditingSub(sub);
        setDialogOpen(true);
    };

    const handleSaved = async (saved: Subscription, isNew: boolean) => {
        if (isNew) {
            setSubscriptions(prev => [saved, ...prev]);
            if (saved.groupId && saved.periodStart) {
                const fromDate = saved.periodStart;
                const endTarget = new Date();
                endTarget.setDate(endTarget.getDate() + 14);
                const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                const weeks = Math.max(2, Math.ceil((endTarget.getTime() - new Date(fromDate).getTime()) / msPerWeek));
                if (!useAppStore.getState().isOnline) {
                    await addToOutbox('POST', '/sessions/generate', {groupId: saved.groupId, fromDate, weeks});
                    toast.info('Created locally — sessions will generate when back online');
                    return;
                }
                try {
                    const generated = await api.sessions.generate({groupId: saved.groupId, fromDate, weeks});
                    const group = groups.find(g => g.id === saved.groupId);
                    const dayStr = group?.weekDays?.map(d => d.slice(0, 3)).join('/') ?? '';
                    const sessionNote = generated.length > 0
                        ? `${generated.length} sessions generated${dayStr ? ` (${dayStr})` : ''}`
                        : 'sessions already up to date';
                    toast.success(`Subscription created · ${sessionNote}`);
                } catch (err: unknown) {
                    toast.warning(`Subscription created, but session generation failed: ${err instanceof Error ? err.message : 'unknown error'}`);
                }
            } else {
                toast.success('Subscription created');
            }
        } else {
            setSubscriptions(prev => prev.map(s => (s.id === saved.id ? saved : s)));
        }
    };

    const handleDeleteRequest = (sub: Subscription) => {
        setPendingDelete(sub);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        setConfirmOpen(false);
        try {
            await api.subscriptions.delete(pendingDelete.id!);
            await db.subscriptions.delete(pendingDelete.id!);
            setSubscriptions(prev => prev.filter(s => s.id !== pendingDelete.id));
            toast.success('Subscription deleted');
        } catch (err: unknown) {
            if (isOfflineError(err)) {
                await addToOutbox('DELETE', `/subscriptions/${pendingDelete.id}`);
                await db.subscriptions.delete(pendingDelete.id!);
                setSubscriptions(prev => prev.filter(s => s.id !== pendingDelete.id));
                useAppStore.getState().setPendingMutations(await getOutboxCount());
                toast.info('Deleted locally — will sync when back online');
            } else {
                toast.error(err instanceof Error ? err.message : 'Request failed');
            }
        } finally {
            setPendingDelete(null);
        }
    };

    const pendingClientName = pendingDelete
        ? (clientMap.get(pendingDelete.clientId ?? '') ?? 'this client')
        : '';

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Subscriptions</h1>
                <Button size="sm" onClick={openAdd} className="hidden sm:flex">
                    <Plus className="mr-2 h-4 w-4" />
                    Add subscription
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    placeholder="Search by client name…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        className={cn(
                            'rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                            statusFilter === tab.value
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80',
                        )}
                    >
                        {tab.label}
                        {tab.value !== 'all' && (
                            <span className="ml-1 text-xs opacity-70">
                                {subscriptions.filter(s => s.status === tab.value).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <SubscriptionsTable
                subscriptions={filteredSubscriptions}
                loading={loading}
                clientMap={clientMap}
                clientIllnessesMap={clientIllnessesMap}
                groupMap={groupMap}
                onEdit={openEdit}
                onDelete={handleDeleteRequest}
            />

            <UpsertSubscriptionDialog
                open={dialogOpen}
                subscription={editingSub}
                clients={clients}
                groups={groups}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={confirmOpen}
                title={`Delete ${pendingClientName}'s subscription?`}
                description="This removes the subscription record. Sessions and attendance are kept."
                confirmLabel="Delete"
                destructive
                onConfirm={handleConfirmDelete}
                onCancel={() => {
                    setConfirmOpen(false);
                    setPendingDelete(null);
                }}
            />

            {/* FAB for mobile */}
            <button
                onClick={openAdd}
                className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg sm:hidden"
                aria-label="Add subscription"
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
    );
}
