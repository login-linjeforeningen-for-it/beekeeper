import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import debug from '#utils/debug.ts'
import { loadSQL } from '#utils/query/loadSQL.ts'
import roundToNearestMinute from '#utils/status/roundToNearestMinute.ts'

export default async function postStatusUpdate(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const { delay } = req.query as { delay?: string }

    try {
        const query = await loadSQL('fetchServiceWithBars.sql')
        const result = await run(query, [id])
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
            [id, service.expected_down, service.upside_down, true, delay ? Number(delay) : 0, service.note, timestamp]
        )

        return res.send({
            message: 'Status recieved.',
            id: Number(id),
            delay: !isNaN(Number(delay)) ? Number(delay) : 0
        })
    } catch (error) {
        debug({ basic: `Database error in postUpdate: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
