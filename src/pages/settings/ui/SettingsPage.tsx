import {CalendarX, Plus, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {api} from '@/shared/api';
import {formatDate} from '@/shared/lib/formatDate';
import type {Holiday} from '@/shared/api';
import {Button} from '@/shared/ui/button';
import {ConfirmDialog} from '@/shared/ui/confirm-dialog';
import {Skeleton} from '@/shared/ui/skeleton';

export function SettingsPage() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<Holiday | null>(null);
    const [form, setForm] = useState({date: '', name: ''});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.holidays
            .list()
            .then(setHolidays)
            .catch((err: Error) => toast.error(err.message))
            .finally(() => setLoading(false));
    }, []);

    const handleAdd = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const created = await api.holidays.create({
                date: form.date,
                name: form.name,
                affectsAllGroups: true,
            });
            setHolidays(prev => [...prev, created].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')));
            setForm({date: '', name: ''});
            setAddOpen(false);
            toast.success('Holiday added · sessions on this date cancelled');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        const holiday = confirmDelete;
        setConfirmDelete(null);
        try {
            await api.holidays.delete(holiday.id!);
            setHolidays(prev => prev.filter(h => h.id !== holiday.id));
            toast.success('Holiday removed · sessions restored');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        }
    };

    const inputClass =
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

    return (
        <div className="flex flex-col gap-6 p-4">
            <h1 className="text-xl font-semibold">Settings</h1>

            {/* Holidays section */}
            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarX className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Holidays</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setAddOpen(v => !v)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                    Holidays automatically cancel all sessions on that date and extend subscription periods.
                </p>

                {/* Add holiday form */}
                {addOpen && (
                    <form
                        onSubmit={handleAdd}
                        className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                    >
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="h-date" className="text-sm font-medium">
                                Date <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="h-date"
                                type="date"
                                required
                                value={form.date}
                                onChange={e => setForm(f => ({...f, date: e.target.value}))}
                                className={inputClass}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="h-name" className="text-sm font-medium">
                                Name <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="h-name"
                                type="text"
                                required
                                value={form.name}
                                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                                className={inputClass}
                                placeholder="e.g. New Year"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setAddOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" className="flex-1" disabled={saving}>
                                {saving ? 'Saving…' : 'Add holiday'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Holiday list */}
                <div className="rounded-xl border bg-card">
                    {loading ? (
                        <div className="flex flex-col gap-3 px-4 py-4">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : holidays.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted-foreground">
                            No holidays configured yet.
                        </p>
                    ) : (
                        holidays.map(h => (
                            <div
                                key={h.id}
                                className="flex items-center justify-between border-b px-4 py-3 last:border-0"
                            >
                                <div>
                                    <p className="text-sm font-medium">{h.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-11 w-11 text-destructive hover:text-destructive"
                                    onClick={() => setConfirmDelete(h)}
                                    aria-label="Delete holiday"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <ConfirmDialog
                open={confirmDelete !== null}
                title={`Remove "${confirmDelete?.name}"?`}
                description="Sessions on this date will be restored."
                confirmLabel="Remove"
                destructive
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
