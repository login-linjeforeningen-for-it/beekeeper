import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { on } from 'events'
import run, { runWithoutRetry } from '#db'
import config from '#constants'
import debug from '#utils/debug.ts'
import trafficEmitter from '#utils/trafficEmitter.ts'

type GetMetricsParams = {
    time_start?: string
    time_end?: string
    domain?: string
}

type GetRecordsParams = GetMetricsParams & {
    limit?: string | number
    page?: string | number
}

type PostTrafficBody = {
    user_agent: string
    domain: string
    path: string
    method: string
    referer: string
    timestamp: number
    request_time: number
    status: number
    country_iso?: string
}

type TrafficRecord = {
    userAgent: string
    domain: string
    path: string
    method: string
    referer: string
    requestTime: number
    status: number
    timestamp: string
    countryIso: string | null
}

const TRAFFIC_BATCH_SIZE = 250
const TRAFFIC_QUEUE_LIMIT = 10000
const TRAFFIC_RETRY_MS = 1000

let trafficQueue: TrafficRecord[] = []
let isFlushingTraffic = false
let droppedTrafficRows = 0

export async function getDomains(
    this: FastifyInstance,
    _: FastifyRequest,
    res: FastifyReply
) {
    res.type('application/json').send(this.domains)
}

export async function getLive(_req: FastifyRequest, res: FastifyReply) {
    res.sse.keepAlive()
    await res.sse.send({ data: 'connected' })

    const ac = new AbortController()
    const countMap = new Map<string, { count: number, minTimestamp: number }>()
    const batchInterval = 5000

    function flushBatch() {
        if (countMap.size > 0) {
            const aggregated = Array.from(countMap.entries()).map(([iso, { count, minTimestamp }]) => ({ iso, count, timestamp: new Date(minTimestamp).toISOString() }))
            countMap.clear()
            res.sse.send({ event: 'traffic', data: aggregated }).catch(() => {})
        }
    }

    const flushTimer = setInterval(flushBatch, batchInterval)

    function cleanup() {
        clearInterval(flushTimer)
        ac.abort()
    }

    res.sse.onClose(cleanup)

    try {
        for await (const [data] of on(trafficEmitter, 'traffic', { signal: ac.signal })) {
            const { country_iso, timestamp } = data as { country_iso?: string, timestamp: number }
            const iso = country_iso || 'unknown'
            const current = countMap.get(iso) || { count: 0, minTimestamp: Infinity }
            countMap.set(iso, { count: current.count + 1, minTimestamp: Math.min(current.minTimestamp, timestamp) })
        }
    } catch (err: unknown) {
        if (err && (err as Error).name !== 'AbortError') {
            throw err
        }
    } finally {
        cleanup()
    }
}

export async function getMetrics(this: FastifyInstance, req: FastifyRequest, res: FastifyReply) {
    if (!Object.keys(req.query as GetMetricsParams || {}).length) {
        return this.metrics
    }

    const { time_start, time_end, domain } = req.query as GetMetricsParams || {}
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    let startDate = time_start ? new Date(String(time_start)) : new Date(Date.now() - oneWeekMs)
    let endDate = time_end ? new Date(String(time_end)) : new Date()

    if (Number.isNaN(startDate.getTime())) {
        startDate = new Date(Date.now() - oneWeekMs)
    }

    if (Number.isNaN(endDate.getTime())) {
        endDate = new Date()
    }

    const durationMs = endDate.getTime() - startDate.getTime()
    const isHourly = durationMs < 24 * 60 * 60 * 1000

    try {
        const params = [startDate.toISOString(), endDate.toISOString()]
        let whereClause = 'WHERE timestamp BETWEEN $1 AND $2'
        if (domain) {
            whereClause += ' AND domain = $3'
            params.push(domain)
        }

        const result = await run(
            `WITH period_traffic AS (
                SELECT user_agent, domain, path, method, request_time, status, timestamp
                FROM traffic
                ${whereClause}
            ),
            path_stats AS (
                SELECT 
                    path, 
                    COUNT(*) as count, 
                    AVG(request_time) as avg_time, 
                    COUNT(*) FILTER (WHERE status >= 400) as error_count
                FROM period_traffic
                GROUP BY 1
            ),
            ua_counts AS (
                SELECT user_agent, COUNT(*) as count
                FROM period_traffic
                GROUP BY 1
            ),
            main_stats AS (
                SELECT 
                    COUNT(*) AS total_requests,
                    AVG(request_time) AS avg_request_time,
                    COALESCE(SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0), 0) AS error_rate
                FROM period_traffic
            )
            SELECT 
                total_requests,
                avg_request_time,
                error_rate,
                (SELECT jsonb_agg(jsonb_build_object('key', status, 'count', count) ORDER BY count DESC) FROM (
                    SELECT status, COUNT(*) AS count FROM period_traffic GROUP BY 1 ORDER BY 2 DESC LIMIT 5
                ) AS t) AS top_status_codes,
                (SELECT jsonb_agg(jsonb_build_object('key', method, 'count', count) ORDER BY count DESC) FROM (
                    SELECT method, COUNT(*) AS count FROM period_traffic GROUP BY 1 ORDER BY 2 DESC LIMIT 5
                ) AS t) AS top_methods,
                (SELECT jsonb_agg(jsonb_build_object('key', domain, 'count', count) ORDER BY count DESC) FROM (
                    SELECT domain, COUNT(*) AS count FROM period_traffic GROUP BY 1 ORDER BY 2 DESC LIMIT 5
                ) AS t) AS top_domains,
                (SELECT jsonb_agg(jsonb_build_object('key', path, 'count', count) ORDER BY count DESC) FROM (
                    SELECT path, count FROM path_stats ORDER BY 2 DESC LIMIT 5
                ) AS t) AS top_paths,
                (SELECT jsonb_agg(jsonb_build_object('key', path, 'avg_time', avg_time) ORDER BY avg_time DESC) FROM (
                    SELECT path, avg_time FROM path_stats ORDER BY 2 DESC LIMIT 5
                ) AS t) AS top_slow_paths,
                (SELECT jsonb_agg(jsonb_build_object('key', path, 'count', error_count) ORDER BY error_count DESC) FROM (
                    SELECT path, error_count FROM path_stats ORDER BY 2 DESC LIMIT 5
                ) AS t) AS top_error_paths,
                (SELECT jsonb_agg(jsonb_build_object('key', os, 'count', count) ORDER BY count DESC) FROM (
                    SELECT 
                        CASE
                            WHEN user_agent ILIKE '%Windows%' THEN 'Windows'
                            WHEN user_agent ILIKE '%Macintosh%' OR user_agent ILIKE '%macOS%' THEN 'MacOS'
                            WHEN user_agent ILIKE '%Linux%' THEN 'Linux'
                            WHEN user_agent ILIKE '%Android%' THEN 'Android'
                            WHEN user_agent ILIKE '%iPhone%' OR user_agent ILIKE '%iPad%' THEN 'iOS'
                            WHEN user_agent ILIKE '%Postman%' THEN 'Postman'
                            WHEN user_agent ILIKE '%Thunder Client%' THEN 'Thunder Client'
                            WHEN user_agent ILIKE '%node%' THEN 'Node.js'
                            ELSE 'Other'
                        END AS os,
                        SUM(count) AS count
                    FROM ua_counts
                    GROUP BY 1
                    ORDER BY 2 DESC
                    LIMIT 5
                ) AS t) AS top_os,
                (SELECT jsonb_agg(jsonb_build_object('key', browser, 'count', count) ORDER BY count DESC) FROM (
                    SELECT 
                        CASE
                            WHEN user_agent ILIKE '%Chrome%' AND user_agent NOT ILIKE '%Edg%' THEN 'Chrome'
                            WHEN user_agent ILIKE '%Firefox%' THEN 'Firefox'
                            WHEN user_agent ILIKE '%Safari%' AND user_agent NOT ILIKE '%Chrome%' THEN 'Safari'
                            WHEN user_agent ILIKE '%Edg%' THEN 'Edge'
                            ELSE 'Other'
                        END AS browser,
                        SUM(count) AS count
                    FROM ua_counts
                    GROUP BY 1
                    ORDER BY 2 DESC
                    LIMIT 5
                ) AS t) AS top_browsers,
                (SELECT jsonb_agg(jsonb_build_object('key', time_bucket::text, 'count', count) ORDER BY time_bucket) FROM (
                    SELECT date_trunc('${isHourly ? 'hour' : 'day'}', timestamp) AS time_bucket, COUNT(*) AS count
                    FROM period_traffic
                    GROUP BY 1
                ) AS t) AS requests_over_time
            FROM main_stats`,
            params
        )

        return res.status(200).send(result.rows[0])
    } catch (error) {
        console.log(error)
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function getRecords(req: FastifyRequest, res: FastifyReply) {
    const { time_start, time_end, limit, page, domain } = req.query as GetRecordsParams || {}
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000

    try {
        const startDate = time_start && !Number.isNaN(new Date(String(time_start)).getTime())
            ? new Date(String(time_start))
            : new Date(Date.now() - oneWeekMs)
        const endDate = time_end && !Number.isNaN(new Date(String(time_end)).getTime())
            ? new Date(String(time_end))
            : new Date()

        const pageNumber = Math.max(Number(page) || 1, 1)
        const limitValue = Math.min(Math.max(Number(limit) || 50, 1), 1000)
        const offset = (pageNumber - 1) * limitValue

        const params: (string | number)[] = [startDate.toISOString(), endDate.toISOString()]
        let whereClause = 'WHERE timestamp BETWEEN $1 AND $2'
        if (domain) {
            whereClause += ' AND domain = $3'
            params.push(domain)
        }

        const countQuery = run(
            `SELECT COUNT(*) AS c FROM traffic ${whereClause}`,
            params
        )

        const dataParams = [...params, limitValue, offset]
        const limitIndex = params.length + 1
        const offsetIndex = params.length + 2

        const dataQuery = run(
            `SELECT * FROM traffic
             ${whereClause}
             ORDER BY timestamp DESC
             LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
            dataParams
        )

        const [result, total] = await Promise.all([dataQuery, countQuery])

        const totalCount = Number(total.rows[0]?.c || 0)
        return res.status(200).send({ result: result.rows, total: totalCount })

    } catch (error) {
        console.log(error)
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function postTraffic(req: FastifyRequest, res: FastifyReply) {
    const allowedIPs = ['127.0.0.1']
    const secret = config.TRAFFIC_SECRET || ''
    const providedSecret = req.headers['x-traffic-secret']
    const realIP = req.headers['x-real-ip']

    if (!allowedIPs.includes(realIP as string) || providedSecret !== secret) {
        return res.status(403).send({ error: 'Forbidden' })
    }

    const { user_agent, domain, path, method, referer, timestamp, request_time, status, country_iso } = req.body as PostTrafficBody || {}

    if (!user_agent || !domain || !path || !method || !referer || request_time === undefined || timestamp === undefined || status === undefined) {
        return res.status(400).send({ error: 'Missing required fields.' })
    }

    try {
        const ts = new Date(timestamp).toISOString()

        enqueueTraffic({
            userAgent: user_agent,
            domain,
            path,
            method,
            referer,
            requestTime: request_time,
            status,
            timestamp: ts,
            countryIso: country_iso || null,
        })
        trafficEmitter.emit('traffic', { country_iso, timestamp })

        return res.status(202).send({ message: 'Traffic accepted.' })
    } catch (error) {
        debug({ basic: `Failed to enqueue traffic in postTraffic: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

function insertTrafficBatch(records: TrafficRecord[]) {
    const params: (string | number | null | boolean)[] = []
    const values = records.map((record, rowIndex) => {
        const offset = rowIndex * 9
        params.push(
            record.userAgent,
            record.domain,
            record.path,
            record.method,
            record.referer,
            record.requestTime,
            record.status,
            record.timestamp,
            record.countryIso
        )

        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
    }).join(', ')

    return runWithoutRetry(
        `INSERT INTO traffic (user_agent, domain, path, method, referer, request_time, status, timestamp, country_iso)
         VALUES ${values};`,
        params
    )
}

function scheduleTrafficFlush() {
    const timer = setTimeout(() => {
        void flushTrafficQueue()
    }, TRAFFIC_RETRY_MS)
    timer.unref?.()
}

async function flushTrafficQueue() {
    if (isFlushingTraffic || trafficQueue.length === 0) {
        return
    }

    isFlushingTraffic = true

    try {
        while (trafficQueue.length > 0) {
            const batch = trafficQueue.splice(0, TRAFFIC_BATCH_SIZE)

            try {
                await insertTrafficBatch(batch)
                if (droppedTrafficRows > 0) {
                    debug({ basic: `Dropped ${droppedTrafficRows} traffic rows while the queue was full.` })
                    droppedTrafficRows = 0
                }
            } catch (error) {
                trafficQueue = [...batch, ...trafficQueue].slice(0, TRAFFIC_QUEUE_LIMIT)
                debug({ basic: `Database error while flushing traffic queue: ${JSON.stringify(error)}` })
                scheduleTrafficFlush()
                return
            }
        }
    } finally {
        isFlushingTraffic = false
    }
}

function enqueueTraffic(record: TrafficRecord) {
    if (trafficQueue.length >= TRAFFIC_QUEUE_LIMIT) {
        const overflow = trafficQueue.length - TRAFFIC_QUEUE_LIMIT + 1
        trafficQueue.splice(0, overflow)
        droppedTrafficRows += overflow
    }

    trafficQueue.push(record)
    void flushTrafficQueue()
}
