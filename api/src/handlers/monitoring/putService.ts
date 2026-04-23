import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import debug from '#utils/debug.ts'

type PutStatusBody = {
    name: string
    type: MonitoredServiceType
    url: string
    interval: number
    status: boolean
    expectedDown: boolean
    upsideDown: boolean
    maxConsecutiveFailures: number
    note: string
    enabled: boolean
    notification?: number
    port?: number
    userAgent?: string
}

export default async function putService(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const {
        name, type, url, interval, expectedDown, upsideDown, userAgent, port,
        maxConsecutiveFailures, note, enabled, notification
    } = req.body as PutStatusBody || {}
    const { valid } = await tokenWrapper(req, res)
    if (!valid) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    if (
        !name || !type || (type === 'fetch' && !url) || !interval
        || typeof expectedDown !== 'boolean' || typeof upsideDown !== 'boolean'
        || typeof maxConsecutiveFailures !== 'number' || typeof enabled !== 'boolean'
    ) {
        return res.status(400).send({ error: 'Missing required field.' })
    }

    try {
        debug({
            detailed: `
            Updating service: id=${id}, name=${name}, type=${type}, url=${url}, 
            interval=${interval}, expected_down=${expectedDown}, 
            upside_down=${upsideDown}, port=${port},
            max_consecutive_failures=${maxConsecutiveFailures}, note=${note}, 
            enabled=${enabled}, notification=${notification}, user_agent=${userAgent}
        ` })

        const result = await run(
            `
            UPDATE status
            SET
                name = $1,
                type = $2,
                url = $3,
                interval = $4,
                expected_down = $5,
                upside_down = $6,
                max_consecutive_failures = $7,
                note = $8,
                enabled = $9,
                notification = $10,
                user_agent = $12,
                port = $13
            WHERE id = $11
            RETURNING id
            `,
            [
                name, type, url, interval, expectedDown, upsideDown,
                maxConsecutiveFailures, note, enabled,
                Number(notification) || null, id, userAgent || null, port || null
            ]
        )

        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Service not found.' })
        }

        return res.send({ message: `Successfully updated service ${name} (${id}).` })
    } catch (error) {
        debug({ basic: `Database error in putService: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
