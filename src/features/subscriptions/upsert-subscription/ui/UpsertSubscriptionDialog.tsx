import {useEffect, useMemo, useState} from 'react';

import {useMobileKeyboardOffset} from '@/shared/hooks/useMobileKeyboardOffset';
import {toast} from 'sonner';

import type {Client} from '@/entities/client';
import type {Group} from '@/entities/group';
import type {Subscription} from '@/entities/subscription';
import {useAppStore} from '@/app/store/useAppStore';
import {SearchableSelect} from '@/shared/ui/searchable-select';
import {api} from '@/shared/api';
import type {Holiday} from '@/shared/api';
import {db} from '@/shared/lib/db';
import {addToOutbox, getOutboxCount, isOfflineError} from '@/shared/lib/outbox';
import {calcPeriodEnd} from '@/shared/lib/calcPeriodEnd';
import {formatDate} from '@/shared/lib/formatDate';
import type {WeekDay} from '@/entities/group/config/weekDays';
import {Button} from '@/shared/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';

interface SubForm {
    clientId: string;
    groupId: string;
    periodStart: string;
    amountPaid: string;
    status: 'active' | 'expired' | 'frozen';
    paymentMethod: 'card' | 'cash' | 'ua_card' | '';
}

const emptyForm = (): SubForm => ({
    clientId: '',
    groupId: '',
    periodStart: '',
    amountPaid: '',
    status: 'active',
    paymentMethod: '',
});

const subToForm = (s: Subscription): SubForm => ({
    clientId: s.clientId ?? '',
    groupId: s.groupId ?? '',
    periodStart: s.periodStart ?? '',
    amountPaid: s.amountPaid ?? '',
    status: s.status ?? 'active',
    paymentMethod: (s.paymentMethod as SubForm['paymentMethod']) ?? '',
});

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

interface UpsertSubscriptionDialogProps {
    open: boolean;
    subscription: Subscription | null;
    clients: Client[];
    groups: Group[];
    onClose: () => void;
    onSaved: (saved: Subscription, isNew: boolean) => void;
}

export function UpsertSubscriptionDialog({
    open,
    subscription,
    clients,
    groups,
    onClose,
    onSaved,
}: UpsertSubscriptionDialogProps) {
    const isEdit = subscription !== null;

    const [form, setForm] = useState<SubForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [amountError, setAmountError] = useState<string | null>(null);
    const keyboardOffset = useMobileKeyboardOffset();

    useEffect(() => {
        if (open) {
            setForm(subscription ? subToForm(subscription) : emptyForm());
            setAmountError(null);
            api.holidays.list().then(setHolidays).catch(() => setHolidays([]));
        }
    }, [open, subscription]);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) onClose();
    };

    const selectedGroup = useMemo(
        () => groups.find(g => g.id === form.groupId) ?? null,
        [groups, form.groupId],
    );

    const selectedClient = useMemo(
        () => clients.find(c => c.id === form.clientId) ?? null,
        [clients, form.clientId],
    );

    const previewPeriodEnd = useMemo(() => {
        if (!selectedGroup || !form.periodStart) return null;
        return calcPeriodEnd(
            form.periodStart,
            (selectedGroup.weekDays ?? []) as WeekDay[],
            selectedGroup.classesPerPeriod ?? 0,
            selectedClient?.illnesses ?? 0,
            holidays,
        );
    }, [selectedGroup, selectedClient, form.periodStart, holidays]);

    const handleAmountChange = (value: string) => {
        setForm(f => ({...f, amountPaid: value}));
        if (value && !AMOUNT_RE.test(value)) {
            setAmountError('Enter a number, e.g. 2000 or 2000.00');
        } else {
            setAmountError(null);
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (form.amountPaid && !AMOUNT_RE.test(form.amountPaid)) {
            setAmountError('Enter a number, e.g. 2000 or 2000.00');
            return;
        }
        setSaving(true);
        const updatePayload = {
            clientId: form.clientId,
            groupId: form.groupId,
            periodStart: form.periodStart,
            amountPaid: form.amountPaid,
            status: form.status,
            paymentMethod: form.paymentMethod || undefined,
        };
        try {
            if (isEdit) {
                const updated = await api.subscriptions.update(subscription.id!, updatePayload);
                await db.subscriptions.put(updated);
                onSaved(updated, false);
                toast.success('Subscription updated');
            } else {
                const created = await api.subscriptions.create({
                    clientId: form.clientId,
                    groupId: form.groupId,
                    periodStart: form.periodStart,
                    amountPaid: form.amountPaid,
                    paymentMethod: form.paymentMethod || undefined,
                });
                await db.subscriptions.put(created);
                await api.enrollments.create({
                    clientId: form.clientId,
                    groupId: form.groupId,
                    enrolledAt: form.periodStart,
                });
                onSaved(created, true);
                // Success toast is shown by parent after session generation
            }
            onClose();
        } catch (err: unknown) {
            if (isOfflineError(err) && isEdit) {
                await addToOutbox('PATCH', `/subscriptions/${subscription.id}`, updatePayload as Record<string, unknown>);
                const optimistic = {...subscription, ...updatePayload};
                await db.subscriptions.put(optimistic);
                onSaved(optimistic, false);
                useAppStore.getState().setPendingMutations(await getOutboxCount());
                toast.info('Saved locally — will sync when back online');
                onClose();
            } else if (isOfflineError(err)) {
                toast.error("You're offline — cannot create new subscriptions");
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
                style={keyboardOffset > 0 ? {bottom: keyboardOffset} : undefined}
                className="left-0 bottom-0 top-auto translate-x-0 translate-y-0 max-w-full sm:left-[50%] sm:bottom-auto sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md rounded-t-2xl sm:rounded-lg max-h-[90dvh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'Edit subscription' : 'Add subscription'}
                    </DialogTitle>
                </DialogHeader>

                <form id="sub-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
                    {/* Client */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="sf-client" className="text-sm font-medium">
                            Client <span className="text-destructive">*</span>
                        </label>
                        <SearchableSelect
                            id="sf-client"
                            required
                            options={clients.map(c => ({value: c.id!, label: c.name ?? ''}))}
                            value={form.clientId}
                            onChange={v => setForm(f => ({...f, clientId: v}))}
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
                            value={form.groupId}
                            onChange={v => setForm(f => ({...f, groupId: v}))}
                            placeholder="Select group…"
                        />
                        {selectedGroup && (
                            <p className="text-xs text-muted-foreground">
                                {selectedGroup.classesPerPeriod} classes · {selectedGroup.weekDays?.join(', ')}
                            </p>
                        )}
                    </div>

                    {/* Period start */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="sf-period-start" className="text-sm font-medium">
                            Period start <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="sf-period-start"
                            type="date"
                            required
                            value={form.periodStart}
                            onChange={e => setForm(f => ({...f, periodStart: e.target.value}))}
                            className={inputClass}
                        />
                        {/* Period end preview */}
                        {previewPeriodEnd && (
                            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                Period ends: <span className="font-medium text-foreground">{formatDate(previewPeriodEnd)}</span>
                                {' '}· {selectedGroup?.classesPerPeriod} classes
                                {selectedClient?.illnesses ? ` + ${selectedClient.illnesses} makeup` : ''}
                            </div>
                        )}
                    </div>

                    {/* Amount paid */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="sf-amount" className="text-sm font-medium">
                            Amount paid <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                                €
                            </span>
                            <input
                                id="sf-amount"
                                type="text"
                                inputMode="decimal"
                                required
                                value={form.amountPaid}
                                onChange={e => handleAmountChange(e.target.value)}
                                className={`${inputClass} pl-7`}
                                placeholder="2000"
                            />
                        </div>
                        {amountError && (
                            <p className="text-xs text-destructive">{amountError}</p>
                        )}
                    </div>

                    {/* Payment method */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="sf-payment-method" className="text-sm font-medium">
                            Paid by
                        </label>
                        <select
                            id="sf-payment-method"
                            value={form.paymentMethod}
                            onChange={e =>
                                setForm(f => ({
                                    ...f,
                                    paymentMethod: e.target.value as SubForm['paymentMethod'],
                                }))
                            }
                            className={inputClass}
                        >
                            <option value="">— Not specified —</option>
                            <option value="card">Card</option>
                            <option value="cash">Cash</option>
                            <option value="ua_card">UA Card</option>
                        </select>
                    </div>

                    {/* Status — only on edit */}
                    {isEdit && (
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="sf-status" className="text-sm font-medium">
                                Status
                            </label>
                            <select
                                id="sf-status"
                                value={form.status}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        status: e.target.value as SubForm['status'],
                                    }))
                                }
                                className={inputClass}
                            >
                                <option value="active">Active</option>
                                <option value="frozen">Frozen</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    )}
                </form>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={saving}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" form="sub-form" disabled={saving || amountError !== null}>
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add subscription'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
