import {Ban, CalendarCheck, CheckCircle2, RotateCcw, Trash2, XCircle} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {toast} from 'sonner';

import type {AttendanceRecord, Client, Group, Session, Subscription} from '@/shared/api';
import {api} from '@/shared/api';
import {fetchWithFallback} from '@/shared/lib/cacheFirst';
import {db} from '@/shared/lib/db';
import {cn} from '@/shared/lib/utils';
import {Button} from '@/shared/ui/button';
import {ConfirmDialog} from '@/shared/ui/confirm-dialog';
import {SearchableSelect} from '@/shared/ui/searchable-select';
import {Skeleton} from '@/shared/ui/skeleton';

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

function formatSessionLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', {weekday: 'short', day: '2-digit', month: 'short'});
}

const SESSION_GROUP_KEY = 'sessions_groupId';

export function SessionsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [allSubs, setAllSubs] = useState<Subscription[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState(
        () => sessionStorage.getItem(SESSION_GROUP_KEY) ?? '',
    );
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [attendanceMap, setAttendanceMap] = useState<Map<string, boolean>>(new Map());
    const [noteMap, setNoteMap] = useState<Map<string, string>>(new Map());
    const [initialAttendanceMap, setInitialAttendanceMap] = useState<Map<string, boolean>>(new Map());
    const [initialLoading, setInitialLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Session | null>(null);
    const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
    const [attendanceSavedFromServer, setAttendanceSavedFromServer] = useState(false);
    const [savedRecords, setSavedRecords] = useState<AttendanceRecord[]>([]);
    const prefetchedRef = useRef(new Set<string>());

    const defaultDateFrom = formatDate(addDays(new Date(), -14));
    const defaultDateTo = formatDate(addDays(new Date(), 14));
    const [dateFrom, setDateFrom] = useState(defaultDateFrom);
    const [dateTo, setDateTo] = useState(defaultDateTo);

    const todayStr = formatDate(new Date());

    useEffect(() => {
        Promise.all([
            fetchWithFallback(api.groups.list, db.groups),
            fetchWithFallback(api.clients.list, db.clients),
            fetchWithFallback(() => api.subscriptions.list({status: 'active'}), db.subscriptions),
        ])
            .then(([grps, cls, subs]) => {
                setGroups(grps.data);
                setClients(cls.data);
                setAllSubs(subs.data);
                if (grps.fromCache || cls.fromCache || subs.fromCache) {
                    toast.info('You\'re offline — showing cached data');
                }
            })
            .catch(() => toast.error('Failed to load'))
            .finally(() => setInitialLoading(false));
    }, []);

    // Persist selected group
    const handleGroupChange = (v: string) => {
        setSelectedGroupId(v);
        if (v) {
            sessionStorage.setItem(SESSION_GROUP_KEY, v);
        } else {
            sessionStorage.removeItem(SESSION_GROUP_KEY);
        }
    };

    useEffect(() => {
        if (!selectedGroupId) {
            setSessions([]);
            setSelectedSessionId('');
            prefetchedRef.current = new Set();
            setSavedSet(new Set());
            return;
        }
        prefetchedRef.current = new Set();
        setSavedSet(new Set());
        setSessionsLoading(true);
        api.sessions
            .list({group_id: selectedGroupId})
            .then(async s => {
                await db.sessions.bulkPut(s);
                return {data: s, fromCache: false};
            })
            .catch(async () => {
                const data = await db.sessions.where('groupId').equals(selectedGroupId).toArray();
                return {data, fromCache: true};
            })
            .then(({data, fromCache}) => {
                setSessions(
                    [...data].sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? '')),
                );
                if (fromCache) toast.info('You\'re offline — showing cached sessions');
            })
            .finally(() => setSessionsLoading(false));
        setSelectedSessionId('');
    }, [selectedGroupId]);

    const filteredSessions = useMemo(
        () =>
            sessions.filter(
                s => (s.sessionDate ?? '') >= dateFrom && (s.sessionDate ?? '') <= dateTo,
            ),
        [sessions, dateFrom, dateTo],
    );

    // Auto-select nearest non-cancelled session to today
    useEffect(() => {
        if (filteredSessions.length === 0) {
            setSelectedSessionId('');
            return;
        }
        const best =
            filteredSessions.find(s => !s.cancelled && (s.sessionDate ?? '') <= todayStr) ??
            filteredSessions[0];
        setSelectedSessionId(best.id!);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredSessions]);

    // Prefetch saved-state indicators for all visible sessions
    useEffect(() => {
        const toFetch = filteredSessions.filter(s => !prefetchedRef.current.has(s.id!));
        if (toFetch.length === 0) return;
        toFetch.forEach(s => prefetchedRef.current.add(s.id!));
        void Promise.allSettled(toFetch.map(s => api.attendance.get(s.id!))).then(results => {
            const ids: string[] = [];
            results.forEach((r, i) => {
                if (r.status === 'fulfilled' && r.value.length > 0) ids.push(toFetch[i].id!);
            });
            if (ids.length > 0) setSavedSet(prev => new Set([...prev, ...ids]));
        });
    }, [filteredSessions]);

    const groupSubs = useMemo(
        () => allSubs.filter(s => s.groupId === selectedGroupId),
        [allSubs, selectedGroupId],
    );

    useEffect(() => {
        if (!selectedSessionId) {
            setAttendanceMap(new Map());
            setNoteMap(new Map());
            setInitialAttendanceMap(new Map());
            setAttendanceSavedFromServer(false);
            setSavedRecords([]);
            return;
        }
        setAttendanceLoading(true);
        api.attendance
            .get(selectedSessionId)
            .then((records: AttendanceRecord[]) => {
                const map = new Map<string, boolean>();
                const notes = new Map<string, string>();
                groupSubs.forEach(s => map.set(s.clientId!, true));
                records.forEach(r => {
                    if (r.clientId) {
                        map.set(r.clientId, r.present ?? true);
                        if (r.note) notes.set(r.clientId, r.note);
                    }
                });
                setAttendanceMap(map);
                setNoteMap(notes);
                setInitialAttendanceMap(new Map(map));
                setSavedRecords(records);
                const hasSaved = records.length > 0;
                setAttendanceSavedFromServer(hasSaved);
                if (hasSaved) {
                    setSavedSet(prev => new Set([...prev, selectedSessionId]));
                }
            })
            .catch((err: Error) => toast.error(err.message))
            .finally(() => setAttendanceLoading(false));
    }, [selectedSessionId, groupSubs]);

    const clientMap = useMemo(
        () => new Map(clients.map(c => [c.id!, c.name ?? ''])),
        [clients],
    );

    const groupSubClientIds = useMemo(
        () => new Set(groupSubs.map(s => s.clientId!)),
        [groupSubs],
    );

    const extraClientIds = useMemo(
        () =>
            attendanceSavedFromServer
                ? [...new Set(savedRecords.map(r => r.clientId!).filter(id => !groupSubClientIds.has(id)))]
                : [],
        [savedRecords, groupSubClientIds, attendanceSavedFromServer],
    );

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const newSessions = await api.sessions.generate({groupId: selectedGroupId, weeks: 4});
            const s = await api.sessions.list({group_id: selectedGroupId});
            setSessions(
                [...s].sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? '')),
            );
            toast.success(
                newSessions.length > 0
                    ? `${newSessions.length} sessions generated`
                    : 'Sessions already up to date',
            );
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleDeleteRequest = (s: Session) => {
        setConfirmDelete(s);
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        const session = confirmDelete;
        setConfirmDelete(null);
        try {
            await api.sessions.delete(session.id!);
            setSessions(prev => prev.filter(x => x.id !== session.id));
            if (selectedSessionId === session.id) setSelectedSessionId('');
            toast.success('Session deleted');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        }
    };

    const handleToggleCancel = async (s: Session) => {
        setCancellingId(s.id!);
        try {
            const updated = await api.sessions.update(s.id!, {cancelled: !s.cancelled});
            setSessions(prev => prev.map(x => (x.id === updated.id ? updated : x)));
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setCancellingId(null);
        }
    };

    const handleToggle = (clientId: string) => {
        setAttendanceMap(prev => {
            const next = new Map(prev);
            next.set(clientId, !next.get(clientId));
            return next;
        });
        // Clear note when toggling back to present
        setNoteMap(prev => {
            const next = new Map(prev);
            if (attendanceMap.get(clientId)) {
                // was present, now going absent — keep note if exists
            } else {
                // was absent, now going present — clear note
                next.delete(clientId);
            }
            return next;
        });
    };

    const handleNoteChange = (clientId: string, note: string) => {
        setNoteMap(prev => {
            const next = new Map(prev);
            if (note) {
                next.set(clientId, note);
            } else {
                next.delete(clientId);
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedSessionId || groupSubs.length === 0) return;
        setSaving(true);
        try {
            const items = groupSubs.map(sub => ({
                clientId: sub.clientId!,
                subscriptionId: sub.id!,
                present: attendanceMap.get(sub.clientId!) ?? true,
                note: noteMap.get(sub.clientId!) || undefined,
            }));
            await api.attendance.mark(selectedSessionId, items);

            // Update client illness counts for changed attendance
            const illnessUpdates: Promise<unknown>[] = [];
            let updatedClients = [...clients];
            for (const sub of groupSubs) {
                const clientId = sub.clientId!;
                const wasPresent = initialAttendanceMap.get(clientId) ?? true;
                const isPresent = attendanceMap.get(clientId) ?? true;
                if (wasPresent === isPresent) continue;
                const client = updatedClients.find(c => c.id === clientId);
                if (!client) continue;
                const delta = isPresent ? -1 : 1;
                const newCount = Math.max(0, (client.illnesses ?? 0) + delta);
                illnessUpdates.push(
                    api.clients.update(clientId, {illnesses: newCount}).then(updated => {
                        updatedClients = updatedClients.map(c => (c.id === clientId ? updated : c));
                    }),
                );
            }
            await Promise.all(illnessUpdates);
            if (illnessUpdates.length > 0) setClients(updatedClients);

            const updated = await api.subscriptions.list({status: 'active'});
            setAllSubs(updated);
            setInitialAttendanceMap(new Map(attendanceMap));
            setAttendanceSavedFromServer(true);
            setSavedSet(prev => new Set([...prev, selectedSessionId]));
            toast.success('Attendance saved');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setSaving(false);
        }
    };

    const handleResetDates = () => {
        setDateFrom(defaultDateFrom);
        setDateTo(defaultDateTo);
    };

    if (initialLoading) {
        return (
            <div className="flex flex-col gap-4 p-4">
                {Array.from({length: 3}).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-xl font-semibold">Attendance</h1>
            </div>

            {/* Group selector */}
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Group</label>
                <SearchableSelect
                    options={groups.map(g => ({value: g.id!, label: g.name ?? ''}))}
                    value={selectedGroupId}
                    onChange={handleGroupChange}
                    placeholder="Select group…"
                />
            </div>

            {/* Date range filter */}
            {selectedGroupId && (
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                        <label className="text-xs text-muted-foreground">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo}
                            onChange={e => setDateFrom(e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                        <label className="text-xs text-muted-foreground">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom}
                            onChange={e => setDateTo(e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-transparent select-none">Reset</label>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleResetDates}
                            className="h-9 px-3 text-xs text-muted-foreground"
                        >
                            Reset
                        </Button>
                    </div>
                </div>
            )}

            {/* Sessions list */}
            {selectedGroupId && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                            Session
                            {filteredSessions.length > 0 && (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                    ({filteredSessions.length})
                                </span>
                            )}
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGenerate}
                            disabled={generating || sessionsLoading}
                        >
                            {generating ? 'Generating…' : 'Generate 4 weeks'}
                        </Button>
                    </div>
                    {sessionsLoading ? (
                        Array.from({length: 3}).map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <Skeleton key={i} className="h-10 w-full" />
                        ))
                    ) : filteredSessions.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            {sessions.length === 0
                                ? 'No sessions for this group yet'
                                : 'No sessions in this date range — widen the filter or reset it.'}
                        </p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border">
                            {filteredSessions.map(s => {
                                const isToday = s.sessionDate === todayStr;
                                return (
                                    <div
                                        key={s.id}
                                        className={cn(
                                            'flex items-center border-b last:border-0',
                                            s.cancelled && 'opacity-50',
                                        )}
                                    >
                                        <button
                                            onClick={() => setSelectedSessionId(s.id!)}
                                            className={cn(
                                                'flex flex-1 items-center gap-2 px-4 py-3 text-left text-sm transition-colors',
                                                selectedSessionId === s.id
                                                    ? 'bg-primary/10 font-medium text-primary'
                                                    : 'hover:bg-muted/30',
                                            )}
                                        >
                                            <span>
                                                {s.sessionDate
                                                    ? formatSessionLabel(s.sessionDate)
                                                    : '—'}
                                                {s.sessionTime && (
                                                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                        · {s.sessionTime}
                                                    </span>
                                                )}
                                            </span>
                                            {savedSet.has(s.id!) && (
                                                <span className="h-2 w-2 rounded-full bg-green-500" title="Attendance saved" />
                                            )}
                                            {isToday && !s.cancelled && (
                                                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                                                    Today
                                                </span>
                                            )}
                                            {s.cancelled && (
                                                <span className="text-xs text-destructive">Cancelled</span>
                                            )}
                                        </button>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                void handleToggleCancel(s);
                                            }}
                                            disabled={cancellingId === s.id}
                                            className="flex items-center px-3 py-3 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                                            title={s.cancelled ? 'Restore session' : 'Cancel session'}
                                        >
                                            {s.cancelled ? (
                                                <RotateCcw className="h-4 w-4" />
                                            ) : (
                                                <Ban className="h-4 w-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleDeleteRequest(s);
                                            }}
                                            className="flex items-center px-3 py-3 text-muted-foreground transition-colors hover:text-destructive"
                                            title="Delete session"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Attendance list */}
            {selectedSessionId && (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium">Mark attendance</p>
                    {attendanceSavedFromServer && (
                        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                            Attendance already saved — showing saved data. Edit and save again to update.
                        </div>
                    )}
                    {attendanceLoading ? (
                        Array.from({length: 3}).map((_, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <Skeleton key={i} className="h-14 w-full" />
                        ))
                    ) : groupSubs.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            No active subscriptions for this group
                        </p>
                    ) : (
                        <>
                            <div className="overflow-hidden rounded-lg border">
                                {groupSubs.map(sub => {
                                    const isPresent = attendanceMap.get(sub.clientId!) ?? true;
                                    const left =
                                        sub.classesTotal != null && sub.classesUsed != null
                                            ? sub.classesTotal - sub.classesUsed
                                            : null;
                                    return (
                                        <div
                                            key={sub.clientId}
                                            className="flex flex-col border-b px-4 py-3 last:border-0"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {clientMap.get(sub.clientId!) ?? '—'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {sub.classesUsed ?? 0}&nbsp;/&nbsp;
                                                        {sub.classesTotal ?? '?'} classes
                                                        {left != null && ` · ${left} left`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleToggle(sub.clientId!)}
                                                    className={cn(
                                                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                                                        isPresent
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                                    )}
                                                >
                                                    {isPresent ? (
                                                        <>
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            Present
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            Absent
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            {/* Absence note — shown only when absent */}
                                            {!isPresent && (
                                                <input
                                                    type="text"
                                                    placeholder="Reason (optional)"
                                                    value={noteMap.get(sub.clientId!) ?? ''}
                                                    onChange={e => handleNoteChange(sub.clientId!, e.target.value)}
                                                    className="mt-2 h-8 w-full rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {extraClientIds.length > 0 && (
                                <div className="mt-2 overflow-hidden rounded-lg border border-dashed">
                                    <p className="px-4 py-1.5 text-xs text-muted-foreground">
                                        Past attendees (subscription ended)
                                    </p>
                                    {extraClientIds.map(clientId => {
                                        const isPresent = attendanceMap.get(clientId) ?? true;
                                        const note = noteMap.get(clientId);
                                        return (
                                            <div
                                                key={clientId}
                                                className="flex flex-col border-t px-4 py-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium">
                                                        {clientMap.get(clientId) ?? '—'}
                                                    </p>
                                                    <span
                                                        className={cn(
                                                            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                                                            isPresent
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                                        )}
                                                    >
                                                        {isPresent ? (
                                                            <>
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Present
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Absent
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                {note && (
                                                    <p className="mt-1 text-xs text-muted-foreground">{note}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <Button
                                onClick={handleSave}
                                disabled={saving || groupSubs.length === 0}
                                className="w-full"
                            >
                                {saving ? 'Saving…' : 'Save attendance'}
                            </Button>
                        </>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirmDelete !== null}
                title={`Delete session ${confirmDelete?.sessionDate ? formatSessionLabel(confirmDelete.sessionDate) : ''}?`}
                description="This also removes all attendance records for this session."
                confirmLabel="Delete"
                destructive
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}
