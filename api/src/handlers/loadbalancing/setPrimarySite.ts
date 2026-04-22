import type { FastifyReply, FastifyRequest } from 'fastify'
import { runInTransaction } from '#db'

export default async function setPrimarySite(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }

    try {
        const result = await runInTransaction(async (client) => {
            await client.query('UPDATE sites SET "primary" = FALSE WHERE "primary" = TRUE;')

            const updateResult = await client.query(
                `UPDATE sites
                SET "primary" = TRUE, updated_at = NOW()
                WHERE id = $1
                RETURNING *;`,
                [id]
            )

            if (updateResult.rowCount === 0) {
                throw new Error('404')
            }

            return updateResult.rows[0]
        })

        return res.send(result)
    } catch (error) {
        if ((error as Error).message === '404') {
            return res.status(404).send({ error: 'Site not found' })
        }

        throw error
    }
}
