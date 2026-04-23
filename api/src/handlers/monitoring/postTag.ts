import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import tokenWrapper from '#utils/auth/tokenWrapper.ts'
import debug from '#utils/debug.ts'

type PostTagBody = {
    name: string
    color: string
}

export default async function postTag(req: FastifyRequest, res: FastifyReply) {
    const { name, color } = req.body as PostTagBody || {}
    const { valid } = await tokenWrapper(req, res)
    if (!valid) {
        return res.status(400).send({ error: 'Unauthorized' })
    }

    try {
        debug({ detailed: `Posting tag: name=${name}, color=${color}` })
        await run('INSERT INTO status_tags (name, color) VALUES ($1, $2);', [name, color])
        return res.send({ message: `Successfully added tag ${name} with color ${color}.` })
    } catch (error) {
        debug({ basic: `Database error in postTag: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
