import Dexie, {type EntityTable} from 'dexie'

import type {AttendanceRecord, Client, Group, Holiday, Session, Subscription} from '@/shared/api'

export interface OutboxEntry {
    id?: number
    method: 'POST' | 'PATCH' | 'DELETE'
    path: string
    body?: string
    createdAt: string
    retries: number
    tempId?: string
    entityType?: string
}

class DanceManagerDB extends Dexie {
    clients!: EntityTable<Client, 'id'>
    groups!: EntityTable<Group, 'id'>
    subscriptions!: EntityTable<Subscription, 'id'>
    sessions!: EntityTable<Session, 'id'>
    attendance!: EntityTable<AttendanceRecord, 'id'>
    holidays!: EntityTable<Holiday, 'id'>
    outbox!: EntityTable<OutboxEntry, 'id'>

    constructor() {
        super('dance-manager-db')
        // v1 kept for migration — drops unused tables, renames abonements→subscriptions
        this.version(1).stores({
            clients: '&id, name, createdAt',
            groups: '&id, name',
            abonements: '&id, clientId, groupId, expiryDate',
            sessions: '&id, groupId, scheduledAt',
            attendance: '&id, sessionId, clientId',
            teachers: '&id, email',
            tags: '&id, name',
            outbox: '++id, table, createdAt',
        })
        this.version(2).stores({
            clients: '&id, name',
            groups: '&id, name',
            abonements: null,
            subscriptions: '&id, clientId, groupId',
            sessions: '&id, groupId, scheduledAt',
            attendance: '&id, sessionId',
            teachers: null,
            tags: null,
            holidays: '&id',
            outbox: '++id, createdAt',
        })
    }
}

export const db = new DanceManagerDB()
