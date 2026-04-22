import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import debug from '#utils/debug.ts'

export default async function deleteSite(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }

    try {
        const check = await run('SELECT "primary" FROM sites WHERE id = $1;', [id])

        if (check.rowCount === 0) {
            return res.status(404).send({ error: 'Site not found' })
        }

        if (check.rows[0].primary) {
            return res.status(400).send({ error: 'Primary site cannot be deleted' })
        }

        const result = await run('DELETE FROM sites WHERE id = $1 AND "primary" = FALSE RETURNING *;', [id])
        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in deleteSite: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
