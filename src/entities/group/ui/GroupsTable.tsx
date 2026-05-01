import {Pencil, Trash2} from 'lucide-react'

import {Button} from '@/shared/ui/button'
import {Skeleton} from '@/shared/ui/skeleton'

import {DAY_LABELS, type WeekDay} from '../config/weekDays'
import type {Group} from '../model/types'

interface GroupsTableProps {
    groups: Group[]
    loading: boolean
    onEdit: (group: Group) => void
    onDelete: (group: Group) => void
}

export function GroupsTable({groups, loading, onEdit, onDelete}: GroupsTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Days</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Duration</th>
                        <th className="px-4 py-3 font-medium">Capacity</th>
                        <th className="px-4 py-3 font-medium" />
                    </tr>
                </thead>
                <tbody>
                    {loading
                        ? Array.from({length: 5}).map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <tr key={i} className="border-b last:border-0">
                                {Array.from({length: 6}).map((_, j) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <td key={j} className="px-4 py-3">
                                        <Skeleton className="h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : groups.map(group => (
                            <tr
                                key={group.id}
                                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3 font-medium">{group.name}</td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {group.weekDays?.map(d => DAY_LABELS[d as WeekDay]).join(', ') || '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {group.classTime ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {group.durationMin != null ? `${group.durationMin} min` : '—'}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {group.maxCapacity ?? '—'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => onEdit(group)}
                                            aria-label="Edit group"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => onDelete(group)}
                                            aria-label="Delete group"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    {!loading && groups.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-4 py-10 text-center text-muted-foreground"
                            >
                                No groups yet. Add your first one!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
