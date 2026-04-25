import type { FastifyReply, FastifyRequest } from 'fastify'
import { runWithoutRetry } from '#db'
import debug from '#utils/debug.ts'
import config from '#constants'
import trafficEmitter from '#utils/trafficEmitter.ts'

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

export default async function postTraffic(req: FastifyRequest, res: FastifyReply) {
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
