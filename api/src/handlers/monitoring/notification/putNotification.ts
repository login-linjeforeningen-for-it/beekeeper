import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import debug from '#utils/debug.ts'

type PostStatusNotificationBody = {
    name: string
    message?: string
    webhook: string
}

export default async function putStatusNotification(
    req: FastifyRequest,
    res: FastifyReply
) {
    const { id } = req.params as { id: string }
    const { name, message, webhook } = req.body as PostStatusNotificationBody
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
            [id, name, message ?? '', webhook]
        )

        if (!result.rows.length) {
            return res.status(404).send({ error: `Notification with id ${id} not found.` })
        }

        return res.send({ message: `Successfully updated notification ${id} (${name}).` })
    } catch (error) {
        debug({ basic: `Database error in putNotification: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
