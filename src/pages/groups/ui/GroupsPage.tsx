import {Plus} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {type Group, GroupsTable} from '@/entities/group';
import {UpsertGroupDialog} from '@/features/groups/upsert-group';
import {api} from '@/shared/api';
import {Button} from '@/shared/ui/button';

export function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);

    useEffect(() => {
        api.groups
            .list()
            .then(setGroups)
            .catch((err: Error) => toast.error(err.message))
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

    const handleDelete = async (group: Group) => {
        if (!window.confirm(`Delete "${group.name}"?`)) return;
        try {
            await api.groups.delete(group.id!);
            setGroups(prev => prev.filter(g => g.id !== group.id));
            toast.success('Group deleted');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        }
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Groups</h1>
                <Button size="sm" onClick={openAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add group
                </Button>
            </div>

            <GroupsTable
                groups={groups}
                loading={loading}
                onEdit={openEdit}
                onDelete={handleDelete}
            />

            <UpsertGroupDialog
                open={dialogOpen}
                group={editingGroup}
                onClose={() => setDialogOpen(false)}
                onSaved={handleSaved}
            />
        </div>
    );
}
