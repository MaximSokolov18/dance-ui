import {Plus, Search, UserPlus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {type Client, ClientsTable} from '@/entities/client';
import {UpsertClientDialog} from '@/features/clients/upsert-client';
import {useAppStore} from '@/app/store/useAppStore';
import {api} from '@/shared/api';
import {fetchWithFallback} from '@/shared/lib/cacheFirst';
import {db} from '@/shared/lib/db';
import {addToOutbox, getOutboxCount, isOfflineError} from '@/shared/lib/outbox';
import {Button} from '@/shared/ui/button';
import {ConfirmDialog} from '@/shared/ui/confirm-dialog';

export function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

    useEffect(() => {
        fetchWithFallback(api.clients.list, db.clients)
            .then(({data, fromCache}) => {
                setClients(data);
                if (fromCache) toast.info("You're offline — showing cached data");
            })
            .catch(() => toast.error('Failed to load clients'))
            .finally(() => setLoading(false));
    }, []);

    const openAdd = () => {
        setEditingClient(null);
        setDialogOpen(true);
    };

    const openEdit = (client: Client) => {
        setEditingClient(client);
        setDialogOpen(true);
    };

    const handleSaved = (saved: Client, isNew: boolean) => {
        if (isNew) {
            setClients(prev => [saved, ...prev]);
        } else {
            setClients(prev => prev.map(c => (c.id === saved.id ? saved : c)));
        }
    };

    const handleDeleteRequest = (client: Client) => {
        setPendingDelete(client);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        setConfirmOpen(false);
        try {
            await api.clients.delete(pendingDelete.id!);
            await db.clients.delete(pendingDelete.id!);
            setClients(prev => prev.filter(c => c.id !== pendingDelete.id));
            toast.success('Client deleted');
        } catch (err: unknown) {
            if (isOfflineError(err)) {
                await addToOutbox('DELETE', `/clients/${pendingDelete.id}`);
                await db.clients.delete(pendingDelete.id!);
                setClients(prev => prev.filter(c => c.id !== pendingDelete.id));
                useAppStore.getState().setPendingMutations(await getOutboxCount());
                toast.info('Deleted locally — will sync when back online');
            } else {
                toast.error(err instanceof Error ? err.message : 'Request failed');
            }
        } finally {
            setPendingDelete(null);
        }
    };

    const filteredClients = searchQuery
        ? clients.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : clients;

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Clients</h1>
                <Button size="sm" onClick={openAdd} className="hidden sm:flex">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add client
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    placeholder="Search clients…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            <ClientsTable
                clients={filteredClients}
                loading={loading}
                onEdit={openEdit}
                onDelete={handleDeleteRequest}
            />

            <UpsertClientDialog
                open={dialogOpen}
                client={editingClient}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={confirmOpen}
                title={`Delete "${pendingDelete?.name}"?`}
                description="This will remove the client. The action cannot be undone."
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
                aria-label="Add client"
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
    );
}
