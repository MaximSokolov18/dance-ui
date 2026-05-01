import {useState} from 'react'
import {toast} from 'sonner'

import type {Client} from '@/entities/client'
import {api} from '@/shared/api'
import {Button} from '@/shared/ui/button'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog'

// ── Form state ────────────────────────────────────────────────────────────────

interface ClientForm {
    name: string
    telegram: string
    illnesses: string
    active: boolean
}

const emptyForm = (): ClientForm => ({
    name: '',
    telegram: '',
    illnesses: '',
    active: true,
})

const clientToForm = (c: Client): ClientForm => ({
    name: c.name ?? '',
    telegram: c.telegram ?? '',
    illnesses: c.illnesses != null ? String(c.illnesses) : '',
    active: c.active ?? true,
})

// ── Component ─────────────────────────────────────────────────────────────────

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

    // Sync form when dialog opens with new context
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setForm(client ? clientToForm(client) : emptyForm())
        } else {
            onClose()
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const payload = {
            name: form.name,
            telegram: form.telegram || undefined,
            illnesses: form.illnesses !== '' ? Number(form.illnesses) : undefined,
            active: form.active,
        }
        try {
            if (client) {
                const updated = await api.clients.update(client.id!, payload)
                onSaved(updated, false)
                toast.success('Client updated')
            } else {
                const created = await api.clients.create(payload)
                onSaved(created, true)
                toast.success('Client added')
            }
            onClose()
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
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
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                            onChange={e => setForm(f => ({...f, telegram: e.target.value}))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="@username"
                        />
                    </div>

                    {/* Illnesses */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="cf-illnesses" className="text-sm font-medium">
                            Illnesses
                        </label>
                        <input
                            id="cf-illnesses"
                            type="number"
                            min={0}
                            value={form.illnesses}
                            onChange={e => setForm(f => ({...f, illnesses: e.target.value}))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="0"
                        />
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
                    <Button type="submit" form="client-form" disabled={saving}>
                        {saving ? 'Saving…' : client ? 'Save changes' : 'Add client'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
