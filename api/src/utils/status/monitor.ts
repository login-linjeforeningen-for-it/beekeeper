import config from '#constants'
import run, { loadSQL } from '#db'
import debug from '#utils/debug.ts'
import net from 'net'
import { getCertificateDetails } from './getCertificateDetails'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let domainInfo: any[] = []

export async function preloadStatus(): Promise<Monitoring[]> {
    try {
        const query = await loadSQL('fetchService.sql')
        const result = await run(query)

        const domainsLength = result.rows.filter((row) => row.url && row.url.startsWith('https://')).length
        if (domainInfo.length !== domainsLength) {
            const temp = []
            for (const service of result.rows) {
                if (service.url && service.url.startsWith('https://')) {
                    const cert = await getCertificateDetails(service)
                    temp.push(cert.valid ? {
                        valid: cert.valid,
                        subjectCN: cert.subjectCN,
                        issuer: cert.issuer,
                        validFrom: cert.validFrom,
                        validTo: cert.validTo,
                        keyType: cert.keyType,
                        dnsNames: cert.dnsNames,
                    } : { ...cert })
                }
            }

            domainInfo = temp
        }

        const merged = result.rows.map((service, index) => ({
            ...service,
            certificate: domainInfo[index]
        }))

        return merged
    } catch (error) {
        debug({ basic: `Database error in getStatus: ${JSON.stringify(error)}` })
        return []
    }
}

export default async function monitor() {
    const servicesQuery = await loadSQL('fetchServicesWithBars.sql')
    const servicesResult = await run(servicesQuery, [null])
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

async function checkTcpService(service: DetailedService): Promise<{ status: boolean, delay: number }> {
    const start = Date.now()

    return new Promise((resolve) => {
        const socket = new net.Socket()
        let finished = false

        const timeout = setTimeout(() => {
            if (!finished) {
                finished = true
                socket.destroy()
                resolve({ status: false, delay: Date.now() - start })
            }
        }, 10000)

        if (service.port) {
            socket.connect(service.port, service.url, () => {
                if (!finished) {
                    finished = true
                    clearTimeout(timeout)
                    socket.end()
                    resolve({ status: true, delay: Date.now() - start })
                }
            })

            socket.on('error', () => {
                if (!finished) {
                    finished = true
                    clearTimeout(timeout)
                    resolve({ status: false, delay: Date.now() - start })
                }
            })
        } else {
            resolve({ status: false, delay: Date.now() - start })
        }
    })
}

async function notify(service: CheckedServiceStatus) {
    const delay = Array.isArray(service.bars) && service.bars.length ? service.bars[0].delay : 0
    try {
        const data: { content?: string; embeds: object[] } = {
            embeds: [
                {
                    title: `🐝 ${service.name} ${service.bars[0].status ? 'is up.' : 'went down!'}`,
                    description: `**Service Name**\n${service.name}\n\n${service.url.length ? `**Service URL**\n${service.url}\n\n` : ''}**Service Type**\n${service.type}`,
                    color: service.bars[0].status ? 0x48a860 : 0xff0000,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Ping ${delay}ms`
                    }
                }
            ]
        }

        if (service.notification_message) {
            data.content = service.notification_message
        }

        const response = await fetch(service.notification_webhook ?? '', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error(await response.text())
        }

        return response.status
    } catch (error) {
        debug({ basic: (error as Error) })
    }
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
