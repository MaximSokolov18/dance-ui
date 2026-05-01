import {useMemo, useState} from 'react';
import {toast} from 'sonner';

import type {Client} from '@/entities/client';
import type {Group} from '@/entities/group';
import type {WeekDay} from '@/entities/group';
import {SearchableSelect} from '@/shared/ui/searchable-select';
import type {Subscription} from '@/entities/subscription';
import {api} from '@/shared/api';
import type {Holiday} from '@/shared/api';
import {calcPeriodEnd} from '@/shared/lib/calcPeriodEnd';
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

interface CreateForm {
    clientId: string;
    groupId: string;
    periodStart: string;
    classesTotal: string;
    amountPaid: string;
}

interface EditForm {
    status: 'active' | 'expired' | 'frozen';
    classesUsed: string;
    periodEnd: string;
}

const emptyCreateForm = (): CreateForm => ({
    clientId: '',
    groupId: '',
    periodStart: '',
    classesTotal: '',
    amountPaid: '',
});

const subToEditForm = (s: Subscription): EditForm => ({
    status: s.status ?? 'active',
    classesUsed: s.classesUsed != null ? String(s.classesUsed) : '',
    periodEnd: s.periodEnd ?? '',
});

// ── Component ─────────────────────────────────────────────────────────────────

interface UpsertSubscriptionDialogProps {
    open: boolean;
    subscription: Subscription | null;
    clients: Client[];
    groups: Group[];
    holidays: Holiday[];
    onClose: () => void;
    onSaved: (saved: Subscription, isNew: boolean) => void;
}

export function UpsertSubscriptionDialog({
    open,
    subscription,
    clients,
    groups,
    holidays,
    onClose,
    onSaved,
}: UpsertSubscriptionDialogProps) {
    const isEdit = subscription !== null;

    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
    const [editForm, setEditForm] = useState<EditForm>(() =>
        subscription ? subToEditForm(subscription) : {status: 'active', classesUsed: '', periodEnd: ''},
    );
    const [saving, setSaving] = useState(false);

    const calculatedPeriodEnd = useMemo<string | null>(() => {
        if (isEdit) return null;
        if (!createForm.periodStart || !createForm.groupId || !createForm.classesTotal) return null;
        const group = groups.find(g => g.id === createForm.groupId);
        const client = clients.find(c => c.id === createForm.clientId);
        const weekDays = group?.weekDays;
        if (!weekDays || weekDays.length === 0) return null;
        const classesTotal = Number(createForm.classesTotal);
        if (isNaN(classesTotal) || classesTotal <= 0) return null;
        const illnesses = client?.illnesses ?? 0;
        return calcPeriodEnd(
            createForm.periodStart,
            weekDays as WeekDay[],
            classesTotal,
            illnesses,
            holidays,
        );
    }, [isEdit, createForm.periodStart, createForm.groupId, createForm.clientId, createForm.classesTotal, clients, groups, holidays]);

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            if (subscription) {
                setEditForm(subToEditForm(subscription));
            } else {
                setCreateForm(emptyCreateForm());
            }
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEdit) {
                const payload = {
                    status: editForm.status,
                    classesUsed: editForm.classesUsed !== '' ? Number(editForm.classesUsed) : undefined,
                    periodEnd: editForm.periodEnd || undefined,
                };
                const updated = await api.subscriptions.update(subscription.id!, payload);
                onSaved(updated, false);
                toast.success('Subscription updated');
            } else {
                const payload = {
                    clientId: createForm.clientId,
                    groupId: createForm.groupId,
                    periodStart: createForm.periodStart,
                    periodEnd: calculatedPeriodEnd!,
                    classesTotal: Number(createForm.classesTotal),
                    amountPaid: createForm.amountPaid,
                };
                const created = await api.subscriptions.create(payload);
                onSaved(created, true);
                toast.success('Subscription added');
            }
            onClose();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Edit subscription' : 'Add subscription'}
                    </DialogTitle>
                </DialogHeader>

                <form id="sub-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
                    {isEdit ? (
                        <>
                            {/* Status */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="sf-status" className="text-sm font-medium">
                                    Status
                                </label>
                                <select
                                    id="sf-status"
                                    value={editForm.status}
                                    onChange={e =>
                                        setEditForm(f => ({
                                            ...f,
                                            status: e.target.value as EditForm['status'],
                                        }))
                                    }
                                    className={inputClass}
                                >
                                    <option value="active">Active</option>
                                    <option value="frozen">Frozen</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>

                            {/* Classes Used */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="sf-used" className="text-sm font-medium">
                                    Classes used
                                </label>
                                <input
                                    id="sf-used"
                                    type="number"
                                    min={0}
                                    value={editForm.classesUsed}
                                    onChange={e =>
                                        setEditForm(f => ({...f, classesUsed: e.target.value}))
                                    }
                                    className={inputClass}
                                    placeholder="0"
                                />
                            </div>

                            {/* Period End */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="sf-period-end-edit" className="text-sm font-medium">
                                    Period end
                                </label>
                                <input
                                    id="sf-period-end-edit"
                                    type="date"
                                    value={editForm.periodEnd}
                                    onChange={e =>
                                        setEditForm(f => ({...f, periodEnd: e.target.value}))
                                    }
                                    className={inputClass}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Client */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="sf-client" className="text-sm font-medium">
                                    Client <span className="text-destructive">*</span>
                                </label>
                                <SearchableSelect
                                    id="sf-client"
                                    required
                                    options={clients.map(c => ({value: c.id!, label: c.name ?? ''}))}
                                    value={createForm.clientId}
                                    onChange={v => setCreateForm(f => ({...f, clientId: v}))}
                                    placeholder="Select client…"
                                />
                            </div>

                            {/* Group */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="sf-group" className="text-sm font-medium">
                                    Group <span className="text-destructive">*</span>
                                </label>
                                <SearchableSelect
                                    id="sf-group"
                                    required
                                    options={groups.map(g => ({value: g.id!, label: g.name ?? ''}))}
                                    value={createForm.groupId}
                                    onChange={v => setCreateForm(f => ({...f, groupId: v}))}
                                    placeholder="Select group…"
                                />
                            </div>

                            {/* Period start / end */}
                            <div className="flex gap-4">
                                <div className="flex flex-1 flex-col gap-1.5">
                                    <label htmlFor="sf-period-start" className="text-sm font-medium">
                                        Period start <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="sf-period-start"
                                        type="date"
                                        required
                                        value={createForm.periodStart}
                                        onChange={e =>
                                            setCreateForm(f => ({...f, periodStart: e.target.value}))
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                <div className="flex flex-1 flex-col gap-1.5">
                                    <label htmlFor="sf-period-end" className="text-sm font-medium">
                                        Period end
                                    </label>
                                    <input
                                        id="sf-period-end"
                                        type="text"
                                        readOnly
                                        value={calculatedPeriodEnd ?? ''}
                                        placeholder="Auto-calculated"
                                        className={`${inputClass} bg-muted/50 cursor-default`}
                                    />
                                </div>
                            </div>

                            {/* Classes total + Amount paid */}
                            <div className="flex gap-4">
                                <div className="flex flex-1 flex-col gap-1.5">
                                    <label htmlFor="sf-classes" className="text-sm font-medium">
                                        Classes total <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="sf-classes"
                                        type="number"
                                        required
                                        min={1}
                                        value={createForm.classesTotal}
                                        onChange={e =>
                                            setCreateForm(f => ({...f, classesTotal: e.target.value}))
                                        }
                                        className={inputClass}
                                        placeholder="8"
                                    />
                                </div>
                                <div className="flex flex-1 flex-col gap-1.5">
                                    <label htmlFor="sf-amount" className="text-sm font-medium">
                                        Amount paid <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="sf-amount"
                                        type="text"
                                        required
                                        value={createForm.amountPaid}
                                        onChange={e =>
                                            setCreateForm(f => ({...f, amountPaid: e.target.value}))
                                        }
                                        className={inputClass}
                                        placeholder="2000"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </form>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={saving}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" form="sub-form" disabled={saving || (!isEdit && !calculatedPeriodEnd)}>
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add subscription'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
