import {useState} from 'react';
import {toast} from 'sonner';

import type {Group} from '@/entities/group';
import {ALL_DAYS, DAY_LABELS, type WeekDay} from '@/entities/group/config/weekDays';
import {api} from '@/shared/api';
import {Button} from '@/shared/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';

// ── Form state ────────────────────────────────────────────────────────────────

interface GroupForm {
    name: string;
    weekDays: WeekDay[];
    classTime: string;
    durationMin: string;
    maxCapacity: string;
}

const emptyForm = (): GroupForm => ({
    name: '',
    weekDays: [],
    classTime: '',
    durationMin: '60',
    maxCapacity: '12',
});

const groupToForm = (g: Group): GroupForm => ({
    name: g.name ?? '',
    weekDays: (g.weekDays ?? []) as WeekDay[],
    classTime: g.classTime ?? '',
    durationMin: g.durationMin != null ? String(g.durationMin) : '',
    maxCapacity: g.maxCapacity != null ? String(g.maxCapacity) : '',
});

// ── Component ─────────────────────────────────────────────────────────────────

interface UpsertGroupDialogProps {
    open: boolean;
    group: Group | null;
    onClose: () => void;
    onSaved: (saved: Group, isNew: boolean) => void;
}

export function UpsertGroupDialog({open, group, onClose, onSaved}: UpsertGroupDialogProps) {
    const [form, setForm] = useState<GroupForm>(() =>
        group ? groupToForm(group) : emptyForm(),
    );
    const [saving, setSaving] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setForm(group ? groupToForm(group) : emptyForm());
        } else {
            onClose();
        }
    };

    const toggleDay = (day: WeekDay) => {
        setForm(f => ({
            ...f,
            weekDays: f.weekDays.includes(day)
                ? f.weekDays.filter(d => d !== day)
                : [...f.weekDays, day],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            name: form.name,
            weekDays: form.weekDays,
            classTime: form.classTime,
            durationMin: Number(form.durationMin),
            maxCapacity: Number(form.maxCapacity),
        };
        try {
            if (group) {
                const updated = await api.groups.update(group.id!, payload);
                onSaved(updated, false);
                toast.success('Group updated');
            } else {
                const created = await api.groups.create(payload);
                onSaved(created, true);
                toast.success('Group added');
            }
            onClose();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="20"
                            />
                        </div>
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
