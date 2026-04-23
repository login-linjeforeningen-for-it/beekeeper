import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import debug from '#utils/debug.ts'

type PostStatusNotificationBody = {
    name: string
    message?: string
    webhook: string
}

export default async function postStatusNotification(
    req: FastifyRequest,
    res: FastifyReply
) {
    const { name, message, webhook } = req.body as PostStatusNotificationBody || {}
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

        await run(
            `INSERT INTO status_notifications (name, message, webhook)
             SELECT $1, $2, $3
             WHERE NOT EXISTS (SELECT 1 FROM status_notifications WHERE name = $1);`,
            [name, message ?? '', webhook]
        )

        return res.send({ message: `Successfully added notification ${name}.` })
    } catch (error) {
        debug({ basic: `Database error in postNotification: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
