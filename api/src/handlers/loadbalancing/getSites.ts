import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import debug from '#utils/debug.ts'

export default async function getSites(req: FastifyRequest, res: FastifyReply) {
    try {
        const result = await run('SELECT * FROM sites ORDER BY primary DESC, operational DESC, name ASC;')
        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in getSites: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
