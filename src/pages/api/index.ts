import createClient from 'openapi-fetch';

import type {paths} from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

// ── Error ─────────────────────────────────────────────────────────────────────

export interface ApiError {
    error: string;
    code: string;
}

export class ApiResponseError extends Error {
    readonly body: ApiError;
    constructor(body: ApiError) {
        super(body.error);
        this.name = 'ApiResponseError';
        this.body = body;
    }
}

// ── Type helpers ──────────────────────────────────────────────────────────────

/** Request body type extracted from generated paths */
type Body<P extends keyof paths, M extends keyof paths[P]> =
    paths[P][M] extends {requestBody: {content: {'application/json': infer B;};};} ? B : never;

/** Query params type extracted from generated paths */
type Query<P extends keyof paths, M extends keyof paths[P]> =
    paths[P][M] extends {parameters: {query?: infer Q;};} ? Q : never;

/** 200/201 response body type extracted from generated paths */
type Ok200<P extends keyof paths, M extends keyof paths[P]> =
    paths[P][M] extends {responses: {200: {content: {'application/json': infer R;};};};} ? R :
        paths[P][M] extends {responses: {201: {content: {'application/json': infer R;};};};} ? R : never;

// ── Exported domain types (derived from generated paths) ─────────────────────

export type Client = NonNullable<Ok200<'/clients/{id}', 'get'>>;
export type Group = NonNullable<Ok200<'/groups/{id}', 'get'>>;
export type Enrollment = NonNullable<Ok200<'/enrollments/{id}', 'patch'>>;
export type Subscription = NonNullable<Ok200<'/subscriptions/{id}', 'patch'>>;
export type Session = NonNullable<Ok200<'/sessions/{id}', 'patch'>>;
export type AttendanceRecord = NonNullable<Ok200<'/attendance/{session_id}', 'get'>>[number];
export type Holiday = NonNullable<Ok200<'/holidays/{id}', 'delete'>>;

// ── HTTP client ───────────────────────────────────────────────────────────────

const http = createClient<paths>({baseUrl: BASE_URL});

async function unwrap<T>(
    promise: Promise<{data?: T; error?: unknown;}>,
): Promise<T> {
    const {data, error} = await promise;
    if (error !== undefined) {
        const e = error as Partial<ApiError>;
        throw new ApiResponseError({
            error: e.error ?? 'Request failed',
            code: e.code ?? 'UNKNOWN',
        });
    }
    return data as T;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {

    // clients ──────────────────────────────────────────────────────────────────
    clients: {
        list: () =>
            unwrap(http.GET('/clients/')),

        create: (body: Body<'/clients/', 'post'>) =>
            unwrap(http.POST('/clients/', {body})),

        get: (id: string) =>
            unwrap(http.GET('/clients/{id}', {params: {path: {id}}})),

        update: (id: string, body: Body<'/clients/{id}', 'patch'>) =>
            unwrap(http.PATCH('/clients/{id}', {params: {path: {id}}, body})),

        delete: (id: string) =>
            unwrap(http.DELETE('/clients/{id}', {params: {path: {id}}})),
    },

    // groups ───────────────────────────────────────────────────────────────────
    groups: {
        list: () =>
            unwrap(http.GET('/groups/')),

        create: (body: Body<'/groups/', 'post'>) =>
            unwrap(http.POST('/groups/', {body})),

        get: (id: string) =>
            unwrap(http.GET('/groups/{id}', {params: {path: {id}}})),

        update: (id: string, body: Body<'/groups/{id}', 'patch'>) =>
            unwrap(http.PATCH('/groups/{id}', {params: {path: {id}}, body})),

        delete: (id: string) =>
            unwrap(http.DELETE('/groups/{id}', {params: {path: {id}}})),
    },

    // enrollments ──────────────────────────────────────────────────────────────
    enrollments: {
        create: (body: Body<'/enrollments/', 'post'>) =>
            unwrap(http.POST('/enrollments/', {body})),

        unenroll: (id: string, body: Body<'/enrollments/{id}', 'patch'>) =>
            unwrap(http.PATCH('/enrollments/{id}', {params: {path: {id}}, body})),
    },

    // subscriptions ────────────────────────────────────────────────────────────
    subscriptions: {
        list: (query?: Query<'/subscriptions/', 'get'>) =>
            unwrap(http.GET('/subscriptions/', {params: {query}})),

        create: (body: Body<'/subscriptions/', 'post'>) =>
            unwrap(http.POST('/subscriptions/', {body})),

        update: (id: string, body: Body<'/subscriptions/{id}', 'patch'>) =>
            unwrap(http.PATCH('/subscriptions/{id}', {params: {path: {id}}, body})),

        delete: (id: string) =>
            unwrap(http.DELETE('/subscriptions/{id}', {params: {path: {id}}})),
    },

    // sessions ─────────────────────────────────────────────────────────────────
    sessions: {
        list: (query?: Query<'/sessions/', 'get'>) =>
            unwrap(http.GET('/sessions/', {params: {query}})),

        generate: (body: Body<'/sessions/generate', 'post'>) =>
            unwrap(http.POST('/sessions/generate', {body})),

        update: (id: string, body: Body<'/sessions/{id}', 'patch'>) =>
            unwrap(http.PATCH('/sessions/{id}', {params: {path: {id}}, body})),

        delete: (id: string) =>
            unwrap(http.DELETE('/sessions/{id}', {params: {path: {id}}})),
    },

    // attendance ───────────────────────────────────────────────────────────────
    attendance: {
        get: (session_id: string) =>
            unwrap(http.GET('/attendance/{session_id}', {params: {path: {session_id}}})),

        mark: (session_id: string, body: Body<'/attendance/{session_id}/mark', 'post'>) =>
            unwrap(http.POST('/attendance/{session_id}/mark', {params: {path: {session_id}}, body})),
    },

    // holidays ─────────────────────────────────────────────────────────────────
    holidays: {
        list: () =>
            unwrap(http.GET('/holidays/')),

        create: (body: Body<'/holidays/', 'post'>) =>
            unwrap(http.POST('/holidays/', {body})),

        delete: (id: string) =>
            unwrap(http.DELETE('/holidays/{id}', {params: {path: {id}}})),
    },

    // dashboard ────────────────────────────────────────────────────────────────
    dashboard: {
        stats: () =>
            unwrap(http.GET('/dashboard/')),
    },
};
