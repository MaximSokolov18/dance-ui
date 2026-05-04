import {Pencil, Trash2} from 'lucide-react'

import {formatDate} from '@/shared/lib/formatDate'
import {Button} from '@/shared/ui/button'
import {Skeleton} from '@/shared/ui/skeleton'

import type {Client} from '../model/types'
import {ClientStatusBadge} from './ClientStatusBadge'

interface ClientsTableProps {
    clients: Client[]
    loading: boolean
    onEdit: (client: Client) => void
    onDelete: (client: Client) => void
}

export function ClientsTable({clients, loading, onEdit, onDelete}: ClientsTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Telegram</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                        <th className="px-4 py-3 font-medium" />
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array.from({length: 5}).map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <tr key={i} className="border-b last:border-0">
                                {Array.from({length: 5}).map((_, j) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <td key={j} className="px-4 py-3">
                                        <Skeleton className="h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : clients.map(client => (
                            <tr
                                key={client.id}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3 font-medium">{client.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {client.telegram ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    <ClientStatusBadge client={client} />
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {formatDate(client.createdAt)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-11 w-11"
                                            onClick={() => onEdit(client)}
                                            aria-label="Edit client"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-11 w-11 text-destructive hover:text-destructive"
                                            onClick={() => onDelete(client)}
                                            aria-label="Delete client"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    {!loading && clients.length === 0 && (
                        <tr>
                            <td
                                colSpan={5}
                                className="px-4 py-10 text-center text-muted-foreground"
                            >
                                No clients yet. Add your first one!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
