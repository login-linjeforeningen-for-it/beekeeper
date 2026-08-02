import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import run, { loadSQL } from '#db'
import { tokenWrapper } from '#utils/auth.ts'
import debug from '#utils/debug.ts'

type ServiceBody = {
    name: string
    type: MonitoredServiceType
    url: string
    interval: number
    status: boolean
    expectedDown: boolean
    upsideDown: boolean
    userAgent?: string
    expectedStatus?: number | null
    maxConsecutiveFailures: number
    note: string
    enabled: boolean
    port?: number
    notification?: string | number
}

type PostTagBody = {
    name: string
    color: string
}

type StatusNotificationBody = {
    name: string
    message?: string
    webhook: string
}

export async function getStatus(
    this: FastifyInstance,
    _: FastifyRequest,
    res: FastifyReply
) {
    res.type('application/json').send(this.monitoring)
}

export async function getService(req: FastifyRequest, res: FastifyReply) {
    try {
        const { id } = req.params as { id: string }
        const serviceId = normalizeResourceId(id)
        if (serviceId === null) return res.status(400).send({ error: 'Invalid service id.' })
        const result = await run(
            `SELECT s.*, n.id AS notification_policy_id, n.name AS notification_policy_name,
                    n.message AS notification_policy_message, n.webhook AS notification_policy_webhook
             FROM status s
             LEFT JOIN status_notifications n ON s.notification = n.id
             WHERE s.id = $1;`,
            [serviceId]
        )
        if (!result.rowCount) {
            return res.status(404).send({ error: 'Service not found.' })
        }

        const row = result.rows[0] as MonitoredService
        const service = {
            id: row.id,
            name: row.name,
            type: row.type,
            url: row.url,
            notification: row.notification,
            port: row.port,
            notificationPolicy: row.notification_policy_id ? {
                id: row.notification_policy_id,
                name: row.notification_policy_name,
                message: row.notification_policy_message,
                webhook: row.notification_policy_webhook,
            } : null,
            interval: row.interval,
            expectedDown: row.expected_down,
            upsideDown: row.upside_down,
            userAgent: row.user_agent,
            expectedStatus: row.expected_status,
            maxConsecutiveFailures: row.max_consecutive_failures,
            note: row.note,
            notified: row.notified,
            tags: row.tags,
            enabled: row.enabled
        }

        return res.send(service)
    } catch (error) {
        debug({ basic: `Database error in getService: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function postService(req: FastifyRequest, res: FastifyReply) {
    const {
        name, type, url, interval, expectedDown, upsideDown, userAgent, port,
        expectedStatus, maxConsecutiveFailures, note, enabled, notification
    } = req.body as ServiceBody || {}
    const { valid } = await tokenWrapper(req, res)
    if (!valid) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    const notificationId = normalizeNotificationId(notification)
    const expectedStatusValue = normalizeExpectedStatus(expectedStatus)
    if (!isValidServiceBody({ name, type, url, interval, expectedDown, upsideDown, maxConsecutiveFailures, enabled, port, expectedStatus: expectedStatusValue })
        || notificationId === undefined
        || (expectedStatusValue === undefined && expectedStatus !== undefined && expectedStatus !== null && expectedStatus !== 0)) {
        return res.status(400).send({ error: 'Missing required field.' })
    }

    try {
        debug({
            detailed: `
            Adding service: name=${name}, type=${type}, url=${url}, 
            interval=${interval}, expected_down=${expectedDown},
            upside_down=${upsideDown}, port=${port},
            max_consecutive_failures=${maxConsecutiveFailures}, note=${note}, 
            enabled=${enabled}, notification=${notification}, user_agent=${userAgent},
            expected_status=${expectedStatus}
        ` })

        const result = await run(
            `INSERT INTO status (name, type, url, interval, expected_down, upside_down,
              max_consecutive_failures, note, enabled, notification, user_agent, port, expected_status)
             SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
             WHERE NOT EXISTS (SELECT 1 FROM status WHERE name = $1)
             RETURNING id, name;`,
            [
                name, type, url, interval, expectedDown, upsideDown,
                maxConsecutiveFailures, note || null, enabled,
                notificationId, userAgent || null, port || null,
                expectedStatusValue
            ]
        )

        if (!result.rowCount) {
            return res.status(409).send({ error: 'Service already exists. Update the existing one instead' })
        }

        await req.server.refreshMonitoring()

        return res.send({
            message: `Successfully added service ${name} to monitoring.`,
            ...result.rows[0]
        })
    } catch (error) {
        debug({ basic: `Database error in postService: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function putService(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const serviceId = normalizeResourceId(id)
    if (serviceId === null) return res.status(400).send({ error: 'Invalid service id.' })
    const {
        name, type, url, interval, expectedDown, upsideDown, userAgent, port,
        expectedStatus, maxConsecutiveFailures, note, enabled, notification
    } = req.body as ServiceBody || {}
    const { valid } = await tokenWrapper(req, res)
    if (!valid) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    const notificationId = normalizeNotificationId(notification)
    const expectedStatusValue = normalizeExpectedStatus(expectedStatus)
    if (!isValidServiceBody({ name, type, url, interval, expectedDown, upsideDown, maxConsecutiveFailures, enabled, port, expectedStatus: expectedStatusValue })
        || notificationId === undefined
        || (expectedStatusValue === undefined && expectedStatus !== undefined && expectedStatus !== null && expectedStatus !== 0)) {
        return res.status(400).send({ error: 'Missing required field.' })
    }

    try {
        debug({
            detailed: `
            Updating service: id=${id}, name=${name}, type=${type}, url=${url}, 
            interval=${interval}, expected_down=${expectedDown}, 
            upside_down=${upsideDown}, port=${port},
            max_consecutive_failures=${maxConsecutiveFailures}, note=${note}, 
            enabled=${enabled}, notification=${notification}, user_agent=${userAgent},
            expected_status=${expectedStatus}
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
                port = $13,
                expected_status = $14
            WHERE id = $11
            RETURNING id
            `,
            [
                name, type, url, interval, expectedDown, upsideDown,
                maxConsecutiveFailures, note, enabled,
                notificationId, serviceId, userAgent || null, port || null,
                expectedStatusValue
            ]
        )

        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Service not found.' })
        }

        await req.server.refreshMonitoring()
        return res.send({ message: `Successfully updated service ${name} (${id}).` })
    } catch (error) {
        debug({ basic: `Database error in putService: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function deleteStatus(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const serviceId = normalizeResourceId(id)
    if (serviceId === null) return res.status(400).send({ error: 'Invalid service id.' })
    try {
        const result = await run('DELETE from status WHERE id = $1;', [serviceId])
        if (!result.rowCount) {
            return res.status(404).send({ error: 'Service not found.' })
        }

        await req.server.refreshMonitoring()
        return res.send({ message: `Successfully deleted service ${id}` })
    } catch (error) {
        debug({ basic: `Database error in deleteStatus: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function postStatusUpdate(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const serviceId = normalizeResourceId(id)
    if (serviceId === null) return res.status(400).send({ error: 'Invalid service id.' })
    const { delay } = req.query as { delay?: string }
    const delayValue = delay === undefined ? 0 : Number(delay)
    if (!Number.isFinite(delayValue) || delayValue < 0) return res.status(400).send({ error: 'Invalid delay.' })

    try {
        const query = await loadSQL('fetchServicesWithBars.sql')
        const result = await run(query, [serviceId])
        if (!result.rowCount) {
            return res.status(404).send({ error: 'No active service found.' })
        }

        const timestamp = roundToNearestMinute(new Date())
        const service = result.rows[0]
        await run(
            `INSERT INTO status_details (service_id, expected_down, upside_down, status, delay, note, timestamp)
            SELECT $1, $2, $3, $4, $5, $6, $7
            WHERE NOT EXISTS (
                SELECT 1 FROM status_details
                WHERE service_id = $1 AND timestamp = $7
            )`,
            [serviceId, service.expected_down, service.upside_down, true, delayValue, service.note, timestamp]
        )

        return res.send({
            message: 'Status recieved.',
            id: serviceId,
            delay: delayValue
        })
    } catch (error) {
        debug({ basic: `Database error in postUpdate: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function getTags(_: FastifyRequest, res: FastifyReply) {
    try {
        const result = await run('SELECT * FROM status_tags ORDER BY name;')
        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in getTags: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function postTag(req: FastifyRequest, res: FastifyReply) {
    const { name, color } = req.body as PostTagBody || {}
    const { valid } = await tokenWrapper(req, res)
    if (!valid) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    if (!name || !color) {
        return res.status(400).send({ error: 'Missing required field.' })
    }

    try {
        debug({ detailed: `Posting tag: name=${name}, color=${color}` })
        await run('INSERT INTO status_tags (name, color) VALUES ($1, $2);', [name, color])
        await req.server.refreshMonitoring()
        return res.send({ message: `Successfully added tag ${name} with color ${color}.` })
    } catch (error) {
        debug({ basic: `Database error in postTag: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function deleteTag(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const tagId = normalizeResourceId(id)
    if (tagId === null) return res.status(400).send({ error: 'Invalid tag id.' })
    try {
        const result = await run('DELETE from status_tags WHERE id = $1;', [tagId])
        await req.server.refreshMonitoring()
        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in deleteTag: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function getStatusNotifications(_: FastifyRequest, res: FastifyReply) {
    try {
        const result = await run('SELECT * FROM status_notifications ORDER BY name;')
        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in getNotifications: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function postStatusNotification(
    req: FastifyRequest,
    res: FastifyReply
) {
    const { name, message, webhook } = req.body as StatusNotificationBody || {}
    const { valid } = await tokenWrapper(req, res)

    if (!valid) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    if (!name || !webhook) {
        return res.status(400).send({ error: 'Missing required field.' })
    }

    try {
        debug({
            detailed: `Adding status notification: name=${name}, message=${message}, webhook=${webhook}`
        })

        const result = await run(
            `INSERT INTO status_notifications (name, message, webhook)
             SELECT $1, $2, $3
             WHERE NOT EXISTS (SELECT 1 FROM status_notifications WHERE name = $1);`,
            [name, message ?? '', webhook]
        )

        if (!result.rowCount) {
            return res.status(409).send({ error: 'Notification already exists.' })
        }

        await req.server.refreshMonitoring()

        return res.send({ message: `Successfully added notification ${name}.` })
    } catch (error) {
        debug({ basic: `Database error in postNotification: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function putStatusNotification(
    req: FastifyRequest,
    res: FastifyReply
) {
    const { id } = req.params as { id: string }
    const notificationId = normalizeResourceId(id)
    if (notificationId === null) return res.status(400).send({ error: 'Invalid notification id.' })
    const { name, message, webhook } = req.body as StatusNotificationBody
    const { valid } = await tokenWrapper(req, res)

    if (!valid) {
        return res.status(401).send({ error: 'Unauthorized' })
    }

    if (!name || !webhook) {
        return res.status(400).send({ error: 'Missing required field.' })
    }

    try {
        debug({
            detailed: `Updating notification ${id}: name=${name}, message=${message}, webhook=${webhook}`
        })

        const result = await run(
            `UPDATE status_notifications
             SET name = $2,
                 message = $3,
                 webhook = $4
             WHERE id = $1
             RETURNING id, name;`,
            [notificationId, name, message ?? '', webhook]
        )

        if (!result.rows.length) {
            return res.status(404).send({ error: `Notification with id ${id} not found.` })
        }

        await req.server.refreshMonitoring()
        return res.send({ message: `Successfully updated notification ${id} (${name}).` })
    } catch (error) {
        debug({ basic: `Database error in putNotification: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function deleteStatusNotification(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const notificationId = normalizeResourceId(id)
    if (notificationId === null) return res.status(400).send({ error: 'Invalid notification id.' })
    try {
        const result = await run('DELETE from status_notifications WHERE id = $1;', [notificationId])
        if (!result.rowCount) {
            return res.status(404).send({ error: 'Notification not found.' })
        }

        await req.server.refreshMonitoring()
        return res.send({ message: `Successfully deleted notification ${id}` })
    } catch (error) {
        debug({ basic: `Database error in deleteNotification: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

function isValidServiceBody(body: {
    name: string
    type: MonitoredServiceType
    url: string
    interval: number
    expectedDown: boolean
    upsideDown: boolean
    maxConsecutiveFailures: number
    enabled: boolean
    port?: number
    expectedStatus?: number | null
}) {
    return Boolean(
        body.name && ['fetch', 'post', 'tcp'].includes(body.type) && (body.type === 'post' || body.url)
        && Number.isInteger(body.interval) && body.interval > 0
        && typeof body.expectedDown === 'boolean' && typeof body.upsideDown === 'boolean'
        && Number.isInteger(body.maxConsecutiveFailures) && body.maxConsecutiveFailures >= 0
        && typeof body.enabled === 'boolean'
        && (body.port === undefined || (Number.isInteger(body.port) && body.port >= 1 && body.port <= 65535))
        && (body.type !== 'tcp' || body.port !== undefined)
        && (body.expectedStatus === null || body.expectedStatus === undefined || Number.isInteger(body.expectedStatus))
    )
}

function normalizeExpectedStatus(value: number | null | undefined) {
    if (value === null || value === undefined || value === 0) {
        return null
    }

    const status = Number(value)
    if (!Number.isInteger(status) || status < 100 || status > 599) {
        return undefined
    }

    return status
}

function normalizeNotificationId(value: string | number | null | undefined) {
    if (value === undefined || value === null || value === '') return null
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : undefined
}

function normalizeResourceId(value: string) {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}

function roundToNearestMinute(date: Date) {
    const ms = 1000 * 60
    return new Date(Math.round(date.getTime() / ms) * ms)
}
