import {Plus, Search} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {type Group, GroupsTable} from '@/entities/group';
import {UpsertGroupDialog} from '@/features/groups/upsert-group';
import {useAppStore} from '@/app/store/useAppStore';
import {api} from '@/shared/api';
import {fetchWithFallback} from '@/shared/lib/cacheFirst';
import {db} from '@/shared/lib/db';
import {addToOutbox, getOutboxCount, isOfflineError} from '@/shared/lib/outbox';
import {Button} from '@/shared/ui/button';
import {ConfirmDialog} from '@/shared/ui/confirm-dialog';

export function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Group | null>(null);

    useEffect(() => {
        fetchWithFallback(api.groups.list, db.groups)
            .then(({data, fromCache}) => {
                setGroups(data);
                if (fromCache) toast.info("You're offline — showing cached data");
            })
            .catch(() => toast.error('Failed to load groups'))
            .finally(() => setLoading(false));
    }, []);

    const openAdd = () => {
        setEditingGroup(null);
        setDialogOpen(true);
    };

    const openEdit = (group: Group) => {
        setEditingGroup(group);
        setDialogOpen(true);
    };

    const handleSaved = (saved: Group, isNew: boolean) => {
        if (isNew) {
            setGroups(prev => [saved, ...prev]);
        } else {
            setGroups(prev => prev.map(g => (g.id === saved.id ? saved : g)));
        }
    };

    const handleDeleteRequest = (group: Group) => {
        setPendingDelete(group);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        setConfirmOpen(false);
        try {
            await api.groups.delete(pendingDelete.id!);
            await db.groups.delete(pendingDelete.id!);
            setGroups(prev => prev.filter(g => g.id !== pendingDelete.id));
            toast.success('Group deleted');
        } catch (err: unknown) {
            if (isOfflineError(err)) {
                await addToOutbox('DELETE', `/groups/${pendingDelete.id}`);
                await db.groups.delete(pendingDelete.id!);
                setGroups(prev => prev.filter(g => g.id !== pendingDelete.id));
                useAppStore.getState().setPendingMutations(await getOutboxCount());
                toast.info('Deleted locally — will sync when back online');
            } else {
                toast.error(err instanceof Error ? err.message : 'Request failed');
            }
        } finally {
            setPendingDelete(null);
        }
    };

    const filteredGroups = searchQuery
        ? groups.filter(g => g.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : groups;

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Groups</h1>
                <Button size="sm" onClick={openAdd} className="hidden sm:flex">
                    <Plus className="mr-2 h-4 w-4" />
                    Add group
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    placeholder="Search groups…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            <GroupsTable
                groups={filteredGroups}
                loading={loading}
                onEdit={openEdit}
                onDelete={handleDeleteRequest}
            />

            <UpsertGroupDialog
                open={dialogOpen}
                group={editingGroup}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={confirmOpen}
                title={`Delete "${pendingDelete?.name}"?`}
                description="Deleting a group removes all its sessions and attendance records."
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
                aria-label="Add group"
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
    );
}
