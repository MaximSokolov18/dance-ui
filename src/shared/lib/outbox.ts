import type {Client, Group, Subscription} from '@/shared/api'
import {db, type OutboxEntry} from './db'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export function isOfflineError(err: unknown): boolean {
    if (!navigator.onLine) return true
    return err instanceof TypeError && /fetch|network|load failed/i.test(err.message)
}

export async function addToOutbox(
    method: OutboxEntry['method'],
    path: string,
    body?: Record<string, unknown>,
    meta?: {tempId?: string; entityType?: string},
): Promise<void> {
    await db.outbox.add({
        method,
        path,
        body: body ? JSON.stringify(body) : undefined,
        createdAt: new Date().toISOString(),
        retries: 0,
        tempId: meta?.tempId,
        entityType: meta?.entityType,
    })
}

export async function getOutboxCount(): Promise<number> {
    return db.outbox.count()
}

async function applyServerEntity(
    entityType: string,
    tempId: string,
    serverEntity: Record<string, unknown>,
): Promise<void> {
    switch (entityType) {
        case 'clients':
            await db.clients.delete(tempId)
            await db.clients.put(serverEntity as unknown as Client)
            break
        case 'groups':
            await db.groups.delete(tempId)
            await db.groups.put(serverEntity as unknown as Group)
            break
        case 'subscriptions':
            await db.subscriptions.delete(tempId)
            await db.subscriptions.put(serverEntity as unknown as Subscription)
            break
    }
}

export async function processOutbox(): Promise<void> {
    const entries = await db.outbox.orderBy('createdAt').toArray()
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!
        try {
            const res = await fetch(`${BASE_URL}${entry.path}`, {
                method: entry.method,
                headers: {'Content-Type': 'application/json'},
                body: entry.body,
            })
            if (res.ok) {
                if (entry.method === 'POST' && entry.tempId && entry.entityType) {
                    const serverEntity = (await res.json()) as Record<string, unknown>
                    const serverId = serverEntity.id as string
                    await applyServerEntity(entry.entityType, entry.tempId, serverEntity)
                    for (let j = i + 1; j < entries.length; j++) {
                        const later = entries[j]!
                        const newPath = later.path.replaceAll(entry.tempId, serverId)
                        const newBody = later.body?.replaceAll(entry.tempId, serverId)
                        if (newPath !== later.path || newBody !== later.body) {
                            entries[j] = {...later, path: newPath, body: newBody}
                            await db.outbox.update(later.id!, {path: newPath, body: newBody})
                        }
                    }
                }
                await db.outbox.delete(entry.id!)
            } else if (entry.retries >= 2) {
                await db.outbox.delete(entry.id!)
            } else {
                await db.outbox.put({...entry, retries: entry.retries + 1})
            }
        } catch {
            break
        }
    }
}
