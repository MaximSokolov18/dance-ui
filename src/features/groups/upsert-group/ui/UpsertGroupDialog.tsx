import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {useAppStore} from '@/app/store/useAppStore';
import type {Group} from '@/entities/group';
import {ALL_DAYS, DAY_LABELS, type WeekDay} from '@/entities/group/config/weekDays';
import {api} from '@/shared/api';
import {useMobileKeyboardOffset} from '@/shared/hooks/useMobileKeyboardOffset';
import {db} from '@/shared/lib/db';
import {addToOutbox, getOutboxCount, isOfflineError} from '@/shared/lib/outbox';
import {Button} from '@/shared/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';

interface GroupForm {
    name: string;
    weekDays: WeekDay[];
    classTime: string;
    durationMin: string;
    maxCapacity: string;
    classesPerPeriod: string;
}

const emptyForm = (): GroupForm => ({
    name: '',
    weekDays: [],
    classTime: '',
    durationMin: '60',
    maxCapacity: '12',
    classesPerPeriod: '8',
});

const groupToForm = (g: Group): GroupForm => ({
    name: g.name ?? '',
    weekDays: (g.weekDays ?? []) as WeekDay[],
    classTime: g.classTime?.split(':').slice(0, 2).join(':') ?? '',
    durationMin: g.durationMin != null ? String(g.durationMin) : '',
    maxCapacity: g.maxCapacity != null ? String(g.maxCapacity) : '',
    classesPerPeriod: g.classesPerPeriod != null ? String(g.classesPerPeriod) : '8',
});

interface UpsertGroupDialogProps {
    open: boolean;
    group: Group | null;
    onClose: () => void;
    onSaved: (saved: Group, isNew: boolean) => void;
}

export function UpsertGroupDialog({open, group, onClose, onSaved}: UpsertGroupDialogProps) {
    const [form, setForm] = useState<GroupForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const {offset: keyboardOffset, vvHeight} = useMobileKeyboardOffset();

    useEffect(() => {
        if (open) setForm(group ? groupToForm(group) : emptyForm());
    }, [open, group]);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) onClose();
    };

    const toggleDay = (day: WeekDay) => {
        setForm(f => ({
            ...f,
            weekDays: f.weekDays.includes(day)
                ? f.weekDays.filter(d => d !== day)
                : [...f.weekDays, day],
        }));
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            name: form.name,
            weekDays: form.weekDays,
            classTime: form.classTime.split(':').slice(0, 2).join(':'),
            durationMin: Number(form.durationMin),
            maxCapacity: Number(form.maxCapacity),
            classesPerPeriod: Number(form.classesPerPeriod),
        };
        try {
            if (group) {
                const updated = await api.groups.update(group.id!, payload);
                await db.groups.put(updated);
                onSaved(updated, false);
                toast.success('Group updated');
            } else {
                const created = await api.groups.create(payload);
                await db.groups.put(created);
                onSaved(created, true);
                toast.success('Group added');
            }
            onClose();
        } catch (err: unknown) {
            if (isOfflineError(err) && group) {
                await addToOutbox('PATCH', `/groups/${group.id}`, payload as Record<string, unknown>);
                const optimistic = {...group, ...payload};
                await db.groups.put(optimistic);
                onSaved(optimistic, false);
                useAppStore.getState().setPendingMutations(await getOutboxCount());
                toast.info('Saved locally — will sync when back online');
                onClose();
            } else if (isOfflineError(err)) {
                const tempId = crypto.randomUUID()
                const optimistic: Group = {
                    id: tempId,
                    name: form.name,
                    weekDays: form.weekDays,
                    classTime: form.classTime.split(':').slice(0, 2).join(':'),
                    durationMin: Number(form.durationMin),
                    maxCapacity: Number(form.maxCapacity),
                    classesPerPeriod: Number(form.classesPerPeriod),
                }
                await db.groups.put(optimistic)
                await addToOutbox(
                    'POST',
                    '/groups/',
                    payload as Record<string, unknown>,
                    {tempId, entityType: 'groups'},
                )
                onSaved(optimistic, true)
                useAppStore.getState().setPendingMutations(await getOutboxCount())
                toast.info('Created locally — will sync when back online')
                onClose()
            } else {
                toast.error(err instanceof Error ? err.message : 'Request failed');
            }
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                style={keyboardOffset > 0 ? {bottom: keyboardOffset, maxHeight: vvHeight - 16} : undefined}
                className="left-0 bottom-0 top-auto translate-x-0 translate-y-0 max-w-full sm:left-[50%] sm:bottom-auto sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md rounded-t-2xl sm:rounded-lg max-h-[90dvh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle>{group ? 'Edit group' : 'Add group'}</DialogTitle>
                </DialogHeader>

                <form id="group-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="gf-name" className="text-sm font-medium">
                            Name <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="gf-name"
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm(f => ({...f, name: e.target.value}))}
                            className={inputClass}
                            placeholder="Group name"
                        />
                    </div>

                    {/* Week days */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium">Days <span className="text-destructive">*</span></span>
                        <div className="flex flex-wrap gap-2">
                            {ALL_DAYS.map(day => (
                                <label
                                    key={day}
                                    className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${form.weekDays.includes(day)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={form.weekDays.includes(day)}
                                        onChange={() => toggleDay(day)}
                                    />
                                    {DAY_LABELS[day]}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Class time */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="gf-time" className="text-sm font-medium">
                            Class time <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="gf-time"
                            type="time"
                            required
                            value={form.classTime}
                            onChange={e => setForm(f => ({...f, classTime: e.target.value}))}
                            className={inputClass}
                        />
                    </div>

                    {/* Duration + Capacity row */}
                    <div className="flex gap-4">
                        <div className="flex flex-1 flex-col gap-1.5">
                            <label htmlFor="gf-duration" className="text-sm font-medium">
                                Duration (min) <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="gf-duration"
                                type="number"
                                required
                                min={1}
                                value={form.durationMin}
                                onChange={e => setForm(f => ({...f, durationMin: e.target.value}))}
                                className={inputClass}
                                placeholder="60"
                            />
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5">
                            <label htmlFor="gf-capacity" className="text-sm font-medium">
                                Max capacity <span className="text-destructive">*</span>
                            </label>
                            <input
                                id="gf-capacity"
                                type="number"
                                required
                                min={1}
                                value={form.maxCapacity}
                                onChange={e => setForm(f => ({...f, maxCapacity: e.target.value}))}
                                className={inputClass}
                                placeholder="20"
                            />
                        </div>
                    </div>

                    {/* Classes per subscription */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="gf-classes" className="text-sm font-medium">
                            Classes per subscription <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="gf-classes"
                            type="number"
                            required
                            min={1}
                            value={form.classesPerPeriod}
                            onChange={e => setForm(f => ({...f, classesPerPeriod: e.target.value}))}
                            className={inputClass}
                            placeholder="8"
                        />
                        <p className="text-xs text-muted-foreground">
                            Number of classes included in one subscription period.
                        </p>
                    </div>
                </form>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" form="group-form" disabled={saving}>
                        {saving ? 'Saving…' : group ? 'Save changes' : 'Add group'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
