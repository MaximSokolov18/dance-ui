import Dexie, {type EntityTable} from 'dexie'

// ── Domain types ─────────────────────────────────────────────────────────────

export interface Client {
    id: string
    name: string
    phone?: string
    email?: string
    createdAt: string
    updatedAt: string
}

export interface Group {
    id: string
    name: string
    description?: string
    createdAt: string
    updatedAt: string
}

export interface Abonement {
    id: string
    clientId: string
    groupId: string
    totalSessions: number
    usedSessions: number
    purchaseDate: string
    expiryDate?: string
    createdAt: string
    updatedAt: string
}

export interface Session {
    id: string
    groupId: string
    scheduledAt: string
    durationMinutes: number
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface Attendance {
    id: string
    sessionId: string
    clientId: string
    abonementId?: string
    attended: boolean
    createdAt: string
    updatedAt: string
}

export interface Teacher {
    id: string
    name: string
    email: string
    createdAt: string
    updatedAt: string
}

export interface Tag {
    id: string
    name: string
    color?: string
}

export interface OutboxEntry {
    id?: number
    operation: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    payload: Record<string, unknown>
    createdAt: string
    retries: number
}

// ── Database ──────────────────────────────────────────────────────────────────

class DanceManagerDB extends Dexie {
    clients!: EntityTable<Client, 'id'>
    groups!: EntityTable<Group, 'id'>
    abonements!: EntityTable<Abonement, 'id'>
    sessions!: EntityTable<Session, 'id'>
    attendance!: EntityTable<Attendance, 'id'>
    teachers!: EntityTable<Teacher, 'id'>
    tags!: EntityTable<Tag, 'id'>
    outbox!: EntityTable<OutboxEntry, 'id'>

    constructor() {
        super('dance-manager-db')
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
    }
}

export const db = new DanceManagerDB()
