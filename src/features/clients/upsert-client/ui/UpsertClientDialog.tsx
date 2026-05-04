import {useState} from 'react'
import {toast} from 'sonner'

import {useAppStore} from '@/app/store/useAppStore'
import type {Client} from '@/entities/client'
import {api} from '@/shared/api'
import {useMobileKeyboardOffset} from '@/shared/hooks/useMobileKeyboardOffset'
import {db} from '@/shared/lib/db'
import {addToOutbox, getOutboxCount, isOfflineError} from '@/shared/lib/outbox'
import {Button} from '@/shared/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog'

interface ClientForm {
    name: string
    telegram: string
    active: boolean
}

const emptyForm = (): ClientForm => ({
    name: '',
    telegram: '',
    active: true,
})

const clientToForm = (c: Client): ClientForm => ({
    name: c.name ?? '',
    telegram: c.telegram ?? '',
    active: c.active ?? true,
})

function validateTelegram(value: string): string | null {
    if (!value) return null
    if (!/^@[a-zA-Z0-9_]{3,}$/.test(value)) {
        return 'Must start with @ followed by letters, numbers, or underscores (min 3 chars)'
    }
    return null
}

interface UpsertClientDialogProps {
    open: boolean
    client: Client | null
    onClose: () => void
    onSaved: (saved: Client, isNew: boolean) => void
}

export function UpsertClientDialog({open, client, onClose, onSaved}: UpsertClientDialogProps) {
    const [form, setForm] = useState<ClientForm>(() =>
        client ? clientToForm(client) : emptyForm(),
    )
    const [saving, setSaving] = useState(false)
    const [telegramError, setTelegramError] = useState<string | null>(null)
    const {offset: keyboardOffset, vvHeight} = useMobileKeyboardOffset()

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setForm(client ? clientToForm(client) : emptyForm())
            setTelegramError(null)
        } else {
            onClose()
        }
    }

    const handleTelegramChange = (value: string) => {
        setForm(f => ({...f, telegram: value}))
        setTelegramError(validateTelegram(value))
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        const tgErr = validateTelegram(form.telegram)
        if (tgErr) {
            setTelegramError(tgErr)
            return
        }
        setSaving(true)
        const payload = {
            name: form.name,
            telegram: form.telegram || undefined,
            active: form.active,
        }
        try {
            if (client) {
                const updated = await api.clients.update(client.id!, payload)
                await db.clients.put(updated)
                onSaved(updated, false)
                toast.success('Client updated')
            } else {
                const created = await api.clients.create(payload)
                await db.clients.put(created)
                onSaved(created, true)
                toast.success('Client added')
            }
            onClose()
        } catch (err: unknown) {
            if (isOfflineError(err) && client) {
                await addToOutbox('PATCH', `/clients/${client.id}`, payload as Record<string, unknown>)
                const optimistic = {...client, ...payload}
                await db.clients.put(optimistic)
                onSaved(optimistic, false)
                useAppStore.getState().setPendingMutations(await getOutboxCount())
                toast.info('Saved locally — will sync when back online')
                onClose()
            } else if (isOfflineError(err)) {
                const tempId = crypto.randomUUID()
                const optimistic: Client = {
                    id: tempId,
                    name: form.name,
                    telegram: form.telegram || null,
                    active: form.active,
                    illnesses: null,
                    createdAt: new Date().toISOString(),
                }
                await db.clients.put(optimistic)
                await addToOutbox(
                    'POST',
                    '/clients/',
                    payload as Record<string, unknown>,
                    {tempId, entityType: 'clients'},
                )
                onSaved(optimistic, true)
                useAppStore.getState().setPendingMutations(await getOutboxCount())
                toast.info('Created locally — will sync when back online')
                onClose()
            } else {
                toast.error(err instanceof Error ? err.message : 'Request failed')
            }
        } finally {
            setSaving(false)
        }
    }

    const inputClass =
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                style={keyboardOffset > 0 ? {bottom: keyboardOffset, maxHeight: vvHeight - 16} : undefined}
                className="left-0 bottom-0 top-auto translate-x-0 translate-y-0 max-w-full sm:left-[50%] sm:bottom-auto sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md rounded-t-2xl sm:rounded-lg max-h-[90dvh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle>{client ? 'Edit client' : 'Add client'}</DialogTitle>
                </DialogHeader>

                <form id="client-form" onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cf-name" className="text-sm font-medium">
                            Name <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="cf-name"
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm(f => ({...f, name: e.target.value}))}
                            className={inputClass}
                            placeholder="Full name"
                        />
                    </div>

                    {/* Telegram */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cf-telegram" className="text-sm font-medium">
                            Telegram
                        </label>
                        <input
                            id="cf-telegram"
                            type="text"
                            value={form.telegram}
                            onChange={e => handleTelegramChange(e.target.value)}
                            className={inputClass}
                            placeholder="@username"
                            inputMode="text"
                        />
                        {telegramError && (
                            <p className="text-xs text-destructive">{telegramError}</p>
                        )}
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-2">
                        <input
                            id="cf-active"
                            type="checkbox"
                            checked={form.active}
                            onChange={e => setForm(f => ({...f, active: e.target.checked}))}
                            className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <label htmlFor="cf-active" className="text-sm font-medium">
                            Active
                        </label>
                    </div>
                </form>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit" form="client-form" disabled={saving || telegramError !== null}>
                        {saving ? 'Saving…' : client ? 'Save changes' : 'Add client'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
