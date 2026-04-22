import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'

export default async function getPrimarySite(_req: FastifyRequest,res: FastifyReply) {
    const result = await run('SELECT * FROM sites WHERE "primary" = TRUE LIMIT 1;')

    if (result.rowCount === 0) {
        return res.status(404).send({ error: 'No primary site set' })
    }

    return res.send(result.rows[0])
}
