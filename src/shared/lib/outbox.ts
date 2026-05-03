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
): Promise<void> {
    await db.outbox.add({
        method,
        path,
        body: body ? JSON.stringify(body) : undefined,
        createdAt: new Date().toISOString(),
        retries: 0,
    })
}

export async function getOutboxCount(): Promise<number> {
    return db.outbox.count()
}

export async function processOutbox(): Promise<void> {
    const entries = await db.outbox.orderBy('createdAt').toArray()
    for (const entry of entries) {
        try {
            const res = await fetch(`${BASE_URL}${entry.path}`, {
                method: entry.method,
                headers: {'Content-Type': 'application/json'},
                body: entry.body,
            })
            if (res.ok || entry.retries >= 2) {
                await db.outbox.delete(entry.id!)
            } else {
                await db.outbox.put({...entry, retries: entry.retries + 1})
            }
        } catch {
            break // still offline — stop and try again later
        }
    }
}
