import type {Table} from 'dexie'

export async function fetchWithFallback<T>(
    fetchFn: () => Promise<T[]>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: Table<T, any>,
): Promise<{data: T[]; fromCache: boolean}> {
    try {
        const data = await fetchFn()
        await table.bulkPut(data)
        return {data, fromCache: false}
    } catch {
        const data = await table.toArray()
        return {data, fromCache: true}
    }
}
