import config from '#constants'
import run, { loadSQL } from '#db'
import debug from '#utils/debug.ts'
import net from 'net'
import { getCertificateDetails } from './getCertificateDetails'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let domainInfo: Map<string, any> = new Map()
let domainInfoLastRefreshed = 0
const CERT_REFRESH_INTERVAL_MS = 60 * 60 * 1000

type CertState = 'valid' | 'invalid' | 'self-signed' | 'expiring'

const certAlerted = new Map<number, CertState>()
let certPrimed = false
let lastCertCheckMs = 0
const CERT_ALERT_INTERVAL_MS = 60 * 60 * 1000

function evalCert(cert: Certificate | InvalidCertificate): CertState {
    if (!cert.valid) return 'invalid'
    if (cert.issuer.cn === cert.subjectCN) return 'self-signed'
    const daysLeft = (new Date(cert.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysLeft < 30) return 'expiring'
    return 'valid'
}

function httpStatusText(code: number): string {
    const texts: Record<number, string> = {
        301: 'Moved Permanently',
        302: 'Found',
        304: 'Not Modified',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        408: 'Request Timeout',
        409: 'Conflict',
        410: 'Gone',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Timeout',
    }
    return texts[code] ?? 'Unknown'
}

export async function preloadStatus(): Promise<Monitoring[]> {
    try {
        const query = await loadSQL('fetchService.sql')
        const result = await run(query)

        const httpsServices = result.rows.filter((row) => row.url && row.url.startsWith('https://'))
        const stale = Date.now() - domainInfoLastRefreshed > CERT_REFRESH_INTERVAL_MS
        if (domainInfo.size !== httpsServices.length || stale) {
            const temp = new Map()
            for (const service of httpsServices) {
                const cert = await getCertificateDetails(service)
                temp.set(service.url, cert.valid ? {
                    valid: cert.valid,
                    subjectCN: cert.subjectCN,
                    issuer: cert.issuer,
                    validFrom: cert.validFrom,
                    validTo: cert.validTo,
                    keyType: cert.keyType,
                    dnsNames: cert.dnsNames,
                } : { ...cert })
            }

            domainInfo = temp
            domainInfoLastRefreshed = Date.now()
        }

        const merged = await Promise.all(result.rows.map(async (service) => ({
            ...service,
            certificate: domainInfo.get(service.url),
            checks: service.name === 'Spaces' ? await checkSpacesProbes() : undefined
        })))

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
            `, [service.id, check.status, service.expected_down, service.upside_down, check.delay, check.note ?? service.note ?? null])
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

    if (Date.now() - lastCertCheckMs >= CERT_ALERT_INTERVAL_MS) {
        lastCertCheckMs = Date.now()
        await checkCertAlerts(services)
    }
}

async function recheck(service: DetailedService): Promise<{ status: boolean, delay: number, note?: string }> {
    if (service.name === 'Spaces') {
        return checkCompositeSpacesService()
    }

    const start = Date.now()
    let lastNote: string | undefined

    for (let i = 0; i < config.max.attempts; i++) {
        const check = await fetchService(service)

        if (check.status) {
            return {
                status: check.status,
                delay: Date.now() - start
            }
        }

        lastNote = check.note

        if (i < config.max.attempts - 1) {
            const jitter = 1000 + Math.random() * 1000
            await new Promise(r => setTimeout(r, jitter))
        }
    }

    return { status: false, delay: Date.now() - start, note: lastNote }
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
    const bar = Array.isArray(service.bars) && service.bars.length ? service.bars[0] : null
    const delay = bar?.delay ?? 0
    const isUp = bar?.status ?? false
    const note = bar?.note

    try {
        const fields: { name: string; value: string; inline?: boolean }[] = [
            { name: 'Type', value: service.type, inline: true },
        ]

        if (!isUp && note) {
            fields.push({ name: 'Reason', value: note, inline: true })
        }

        const data: { content?: string; embeds: object[] } = {
            embeds: [
                {
                    title: `🐝 ${service.name} ${isUp ? 'is up.' : 'went down!'}`,
                    url: service.url.length ? service.url : undefined,
                    description: service.url.length ? service.url : undefined,
                    color: isUp ? 0x48a860 : 0xff0000,
                    fields,
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
            headers: { 'Content-Type': 'application/json' },
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

async function checkCertAlerts(services: CheckedServiceStatus[]) {
    const httpsServices = services.filter(s => s.notification_webhook && s.url?.startsWith('https://'))

    for (const service of httpsServices) {
        try {
            const cert = await getCertificateDetails({ url: service.url } as MonitoredService)
            const state = evalCert(cert)
            const prev = certAlerted.get(service.id)

            if (!certPrimed) {
                if (state !== 'valid') certAlerted.set(service.id, state)
                continue
            }

            if (state !== 'valid' && state !== prev) {
                certAlerted.set(service.id, state)
                await notifyCert(service, cert, state)
            } else if (state === 'valid' && prev) {
                certAlerted.delete(service.id)
                await notifyCert(service, cert, 'valid')
            }
        } catch (error) {
            debug({ basic: `Cert check failed for ${service.name}: ${error}` })
        }
    }

    certPrimed = true
}

async function notifyCert(service: CheckedServiceStatus, cert: Certificate | InvalidCertificate, state: CertState) {
    const meta: Record<CertState, { title: string; color: number }> = {
        invalid:       { title: 'Invalid Certificate',      color: 0xff0000 },
        'self-signed': { title: 'Self-signed Certificate',  color: 0xff8c00 },
        expiring:      { title: 'Certificate Expiring Soon', color: 0xff0000 },
        valid:         { title: 'Certificate Recovered',    color: 0x48a860 },
    }

    const fields: { name: string; value: string; inline?: boolean }[] = []

    if (!cert.valid) {
        fields.push({ name: 'Reason', value: cert.message, inline: true })
        if (cert.code) fields.push({ name: 'Code', value: cert.code, inline: true })
        if (cert.reason) fields.push({ name: 'Detail', value: cert.reason, inline: false })
    } else if (state === 'expiring') {
        const daysLeft = Math.floor((new Date(cert.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        fields.push({ name: 'Expires', value: `${cert.validTo} (${daysLeft} days remaining)`, inline: true })
    } else if (state === 'self-signed') {
        fields.push({ name: 'Issued to', value: cert.subjectCN, inline: true })
    }

    const { title, color } = meta[state]

    try {
        const data: { content?: string; embeds: object[] } = {
            embeds: [
                {
                    title: `🐝 ${service.name} — ${title}`,
                    url: service.url.length ? service.url : undefined,
                    description: service.url.length ? service.url : undefined,
                    color,
                    fields,
                    timestamp: new Date().toISOString(),
                }
            ]
        }

        if (service.notification_message) {
            data.content = service.notification_message
        }

        const response = await fetch(service.notification_webhook ?? '', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error(await response.text())
        }
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

async function checkCompositeSpacesService(): Promise<{ status: boolean, delay: number, note: string }> {
    const start = Date.now()
    const checks = await checkSpacesProbes()
    const status = checks.every(check => check.status)
    const summary = checks
        .map(check => `${check.name}: ${check.status ? 'ok' : 'failed'}${check.actualStatus ? ` (${check.actualStatus})` : ''}`)
        .join('; ')

    return {
        status,
        delay: Date.now() - start,
        note: summary
    }
}

async function checkSpacesProbes(): Promise<MonitoringProbe[]> {
    const [redirect, consolePort, containerHealth] = await Promise.all([
        fetchProbe({
            name: 'External Authentik redirect',
            url: 'https://spaces.login.no/',
            expectedStatus: 302,
            redirect: 'manual',
            note: 'Unauthenticated requests should redirect to Authentik.'
        }),
        fetchProbe({
            name: 'Container console port',
            url: 'http://172.17.0.1:9101/',
            expectedStatus: 403,
            note: 'RustFS console responds from the host-published container port.'
        }),
        fetchProbe({
            name: 'Container health',
            url: 'http://172.17.0.1:9100/health',
            expectedStatus: 200,
            bodyIncludes: '"ready":true',
            note: 'RustFS health endpoint reports the service is ready.'
        })
    ])

    return [redirect, consolePort, containerHealth]
}

async function fetchProbe({
    name,
    url,
    expectedStatus,
    redirect = 'follow',
    bodyIncludes,
    note
}: {
    name: string
    url: string
    expectedStatus: number
    redirect?: RequestRedirect
    bodyIncludes?: string
    note: string
}): Promise<MonitoringProbe> {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            redirect
        })
        const bodyMatches = bodyIncludes ? (await response.text()).includes(bodyIncludes) : true
        const status = response.status === expectedStatus && bodyMatches

        return {
            name,
            url,
            status,
            delay: getMonitorDelay(response) ?? Date.now() - start,
            expectedStatus,
            actualStatus: response.status,
            note
        }
    } catch (error) {
        return {
            name,
            url,
            status: false,
            delay: Date.now() - start,
            expectedStatus,
            note: `${note} ${error instanceof Error ? error.message : 'Probe failed.'}`
        }
    } finally {
        clearTimeout(timeout)
    }
}

async function fetchService(service: DetailedService): Promise<{ status: boolean, delay: number, note?: string }> {
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

        const delay = getMonitorDelay(response) ?? new Date().getTime() - start
        const expectedStatus = service.expected_status

        if (expectedStatus) {
            const ok = response.status === expectedStatus
            return {
                status: ok,
                delay,
                note: ok ? undefined : `HTTP ${response.status} ${httpStatusText(response.status)} (expected ${expectedStatus})`
            }
        }

        if (!response.ok) {
            return {
                status: false,
                delay,
                note: `HTTP ${response.status} ${httpStatusText(response.status)}`
            }
        }

        return { status: true, delay }
    } catch (error) {
        if (!isAbortError(error)) {
            console.warn(`Monitor error for service ${service.name}: ${error instanceof Error ? error.message : String(error)}`)
        }
        const note = isAbortError(error) ? 'Connection timed out' : `Connection failed: ${error instanceof Error ? error.message : String(error)}`
        return { status: false, delay: new Date().getTime() - start, note }
    } finally {
        clearTimeout(timeout)
    }
}

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError'
}

function getMonitorDelay(response: Response) {
    const value = response.headers.get('x-monitor-delay-ms')
    if (!value) {
        return null
    }

    const delay = Number(value)
    if (!Number.isFinite(delay) || delay < 0) {
        return null
    }

    return Math.round(delay)
}
