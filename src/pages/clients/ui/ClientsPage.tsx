import {UserPlus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {type Client, ClientsTable} from '@/entities/client';
import {UpsertClientDialog} from '@/features/clients/upsert-client';
import {api} from '@/shared/api';
import {Button} from '@/shared/ui/button';

export function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        api.clients
            .list()
            .then(setClients)
            .catch((err: Error) => toast.error(err.message))
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

    const handleDelete = async (client: Client) => {
        if (!window.confirm(`Delete "${client.name}"?`)) return;
        try {
            await api.clients.delete(client.id!);
            setClients(prev => prev.filter(c => c.id !== client.id));
            toast.success('Client deleted');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Clients</h1>
                <Button size="sm" onClick={openAdd}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add client
                </Button>
            </div>

            <ClientsTable
                clients={clients}
                loading={loading}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            <UpsertClientDialog
                open={dialogOpen}
                client={editingClient}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />
        </div>
    );
}
