import run from '#db'
import config from '#constants'
import { internalHeaders } from '#utils/proxyInternal.ts'

export async function getAlerts(): Promise<number> {
    try {
        const response = await fetch(`${config.workerbee}/alerts`)
        if (!response.ok) {
            throw new Error(await response.text())
        }

        const data = await response.json()
        if (!isObject(data) || !('total_count' in data)) {
            throw new Error(`Missing total count: ${JSON.stringify(data)}`)
        }

        return Number(data.total_count)
    } catch (error) {
        console.log(error)
        return 0
    }
}

export async function getDatabaseOverview(): Promise<DatabaseOverviewResponse | null> {
    try {
        return await fetchInternal<DatabaseOverviewResponse>('db')
    } catch (error) {
        console.log(error)
        return null
    }
}

export async function getDatabases(): Promise<number> {
    try {
        const data = await fetchInternal<{
            databaseCount?: number
        }>('db')

        if (typeof data.databaseCount !== 'number') {
            throw new Error('Missing databaseCount')
        }

        return data.databaseCount
    } catch (error) {
        console.log(error)
        return 0
    }
}

export async function getDocker(): Promise<Docker> {
    try {
        return await fetchInternal<Docker>('docker')
    } catch (error) {
        console.log(error)
        return {
            status: 'unavailable',
            count: 0,
            containers: [],
            error: error instanceof Error ? error.message : 'Failed to load docker',
        }
    }
}

export async function getMetrics(): Promise<Stats> {
    try {
        return await fetchInternal<Stats>('stats')
    } catch (error) {
        console.log(error)
        return {
            system: {
                load: [],
                memory: {
                    used: 0,
                    total: 0,
                    percent: '0',
                },
                swap: '0',
                disk: 'N/A',
                temperature: 'N/A',
                powerUsage: 'N/A',
                processes: 0,
                ipv4: [],
                ipv6: [],
                os: 'Unknown',
            }
        }
    }
}

export async function getPrimarySite(): Promise<PrimarySite> {
    const result = await run('SELECT * FROM sites WHERE "primary" = TRUE LIMIT 1')
    return result.rows[0] || {
        id: 0,
        name: 'No sites found.',
        ip: '0.0.0.0',
        primary: false
    }
}

export async function getRequestsToday(): Promise<number> {
    try {
        const result = await run(
            `SELECT COUNT(*) AS count
             FROM traffic
             WHERE timestamp >= date_trunc('day', NOW());`
        )

        return Number(result.rows[0]?.count)
    } catch (error) {
        console.log(error)
        return 0
    }
}

export async function getSystem(): Promise<System> {
    try {
        return await fetchInternal<System>('stats/dashboard')
    } catch (error) {
        console.log(error)

        return {
            ram: 'No RAM',
            processes: 0,
            disk: 'No Disk',
            load: 'No load',
            containers: 0
        }
    }
}

export async function countRows(table: 'sites' | 'status') {
    const result = await run(`SELECT * FROM ${table}`)
    return result.rowCount || 0
}

async function fetchInternal<T>(path: string): Promise<T> {
    const response = await fetch(`${config.internal}/${path.replace(/^\/+/, '')}`, {
        headers: internalHeaders(),
    })

    if (!response.ok) {
        throw new Error(await response.text())
    }

    return await response.json() as T
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
