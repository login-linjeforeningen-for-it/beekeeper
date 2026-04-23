import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import debug from '#utils/debug.ts'

type PostStatusBody = {
    name: string
    type: MonitoredServiceType
    url: string
    interval: number
    status: boolean
    expectedDown: boolean
    upsideDown: boolean
    userAgent?: string
    maxConsecutiveFailures: number
    note: string
    enabled: boolean
    port?: number
    notification?: string
}

export default async function postService(req: FastifyRequest, res: FastifyReply) {
    const {
        name, type, url, interval, expectedDown, upsideDown, userAgent, port,
        maxConsecutiveFailures, note, enabled, notification
    } = req.body as PostStatusBody || {}
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
            Adding service: name=${name}, type=${type}, url=${url}, 
            interval=${interval}, expected_down=${expectedDown},
            upside_down=${upsideDown}, port=${port},
            max_consecutive_failures=${maxConsecutiveFailures}, note=${note}, 
            enabled=${enabled}, notification=${notification}, user_agent=${userAgent}
        ` })

        const result = await run(
            `INSERT INTO status (name, type, url, interval, expected_down, upside_down, max_consecutive_failures, note, enabled, notification, user_agent, port) 
             SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
             WHERE NOT EXISTS (SELECT 1 FROM status WHERE name = $1)
             RETURNING id, name;`,
            [
                name, type, url, interval, expectedDown, upsideDown,
                maxConsecutiveFailures, note || null, enabled,
                Number(notification) || null, userAgent || null, port || null
            ]
        )

        if (!result.rowCount) {
            return res.status(409).send({ error: 'Service already exists. Update the existing one instead' })
        }

        return res.send({
            message: `Successfully added service ${name} to monitoring.`,
            ...result.rows[0]
        })
    } catch (error) {
        debug({ basic: `Database error in postService: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
