import config from '#constants'
import run from '#db'
import { loadSQL } from '#utils/loadSQL.ts'
import notify from './notify.ts'
import checkTcpService from './tcp.ts'

export default async function monitor() {
    const servicesQuery = await loadSQL('fetchServicesWithBars.sql')
    const servicesResult = await run(servicesQuery)
    const active: (DetailedService & { bars: Bar[] })[] = []
    const passive: (DetailedService & { bars: Bar[] })[] = []
    const tcp: (DetailedService & { bars: Bar[] })[] = []

    for (const row of servicesResult.rows as (DetailedService & { bars: Bar[] })[]) {
        switch (row.type) {
            case 'fetch': active.push(row); break
            case 'post': passive.push(row); break
            case 'tcp': tcp.push(row); break
        }
    }

    await runInParallel(active, async (service) => {
        if (
            !Array.isArray(service.bars)
            || !service.bars.length
            || (new Date().getTime() - new Date(service.bars[0].timestamp).getTime() > service.interval * 1000)
        ) {
            const check = await recheck(service)

            await run(`
                INSERT INTO status_details (service_id, status, expected_down, upside_down, delay, note)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [service.id, check.status, service.expected_down, service.upside_down, check.delay, service.note ?? null])
        }
    })

    await runInParallel(tcp, async (service) => {
        if (
            !Array.isArray(service.bars)
            || !service.bars.length
            || (new Date().getTime() - new Date(service.bars[0].timestamp).getTime() > service.interval * 1000)
        ) {
            const check = await recheckTCP(service)

            await run(`
                    INSERT INTO status_details (service_id, status, expected_down, upside_down, delay, note)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [service.id, check.status, service.expected_down, service.upside_down, check.delay, service.note ?? null])
        }
    })

    await runInParallel(passive, async (service) => {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
        if (!service.bars.length) {
            await run(`
                INSERT INTO status_details (service_id, status, expected_down, upside_down, delay, note, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [service.id, false, service.expected_down, service.upside_down, 0, service.note ?? null, oneMinuteAgo.toISOString()])

            await run(`
                INSERT INTO status_details (service_id, status, expected_down, upside_down, delay, note)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [service.id, false, service.expected_down, service.upside_down, 0, service.note ?? null])
        }
    })

    const query = await loadSQL('fetchServiceStatus.sql')
    const result = await run(query)
    const services: CheckedServiceStatus[] = result.rows

    for (const service of services) {
        if (!service.notification_webhook) {
            continue
        }

        if (!service.bars[0].status && !service.max_consecutive_failures && !service.notified) {
            await notify(service)
            await run('UPDATE status SET notified = NOW() WHERE id = $1', [service.id])
            continue
        }

        if (service.bars[0].status && service.notified) {
            await notify(service)
            await run('UPDATE status SET notified = NULL WHERE id = $1', [service.id])
            continue
        }

        if (!service.notified && service.max_consecutive_failures > 0 && !service.bars[0].status) {
            const recentBars = service.bars.slice(0, service.max_consecutive_failures)
            let downCount = 0
            for (const bar of recentBars) {
                if (!bar.status) {
                    downCount++
                } else {
                    break
                }
            }

            if (downCount >= service.max_consecutive_failures) {
                await notify(service)
                await run('UPDATE status SET notified = NOW() WHERE id = $1', [service.id])
            }

            continue
        }
    }
}

async function recheck(service: DetailedService): Promise<{ status: boolean, delay: number }> {
    const start = Date.now()

    for (let i = 0; i < config.max.attempts; i++) {
        const check = await fetchService(service)

        if (check.status) {
            return {
                status: check.status,
                delay: Date.now() - start
            }
        }

        if (i < config.max.attempts - 1) {
            const jitter = 1000 + Math.random() * 1000
            await new Promise(r => setTimeout(r, jitter))
        }
    }

    return { status: false, delay: Date.now() - start }
}

async function recheckTCP(service: DetailedService): Promise<{ status: boolean, delay: number }> {
    const start = Date.now()

    for (let i = 0; i < config.max.attempts; i++) {
        const check = await checkTcpService(service)

        if (check.status) {
            return {
                status: check.status,
                delay: Date.now() - start
            }
        }

        if (i < config.max.attempts - 1) {
            const jitter = 1000 + Math.random() * 1000
            await new Promise(r => setTimeout(r, jitter))
        }
    }

    return { status: false, delay: Date.now() - start }
}

async function runInParallel<T>(
    items: T[],
    worker: (item: T) => Promise<void>
) {
    const queue = [...items]

    const workers = Array.from({ length: config.max.concurrency }, async () => {
        while (true) {
            const item = queue.shift()
            if (!item) {
                break
            }

            try {
                await worker(item)
            } catch (error) {
                console.error(`Worker error: ${error}`)
            }
        }
    })

    await Promise.all(workers)
}

async function fetchService(service: DetailedService): Promise<{ status: boolean, delay: number }> {
    const start = new Date().getTime()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
        const headers: HeadersInit = {}

        if (service.user_agent) {
            headers['User-Agent'] = service.user_agent
        }

        const response = await fetch(service.url, {
            signal: controller.signal,
            headers
        })

        if (!response.ok) {
            return { status: false, delay: new Date().getTime() - start }
        }

        return { status: true, delay: new Date().getTime() - start }
    } catch (error) {
        console.log(`Monitor error for service ${service.name}: ${error}`)
        return { status: false, delay: new Date().getTime() - start }
    } finally {
        clearTimeout(timeout)
    }
}
