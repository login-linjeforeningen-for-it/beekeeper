import type { FastifyReply, FastifyRequest } from 'fastify'
import { runInTransaction } from '#db'

type PostSiteProps = {
    name: string
    ip: string
    primary: boolean
    operational: boolean
    addedBy: string
    note: string
    maintenance: boolean
}

export default async function postSite(req: FastifyRequest, res: FastifyReply) {
    const {
        name,
        ip,
        primary = false,
        operational = false,
        addedBy,
        note,
        maintenance
    } = req.body as PostSiteProps

    const result = await runInTransaction(async (client) => {
        if (primary) {
            await client.query('UPDATE sites SET "primary" = FALSE WHERE "primary" = TRUE;')
        }

        const insertResult = await client.query(
            `INSERT INTO sites (name, ip, "primary", operational, added_by, updated_by, note, maintenance)
            VALUES ($1, $2, $3, $4, $5, $5, $6, $7)
            RETURNING *;`,
            [name, ip, primary, operational, addedBy, note || null, maintenance]
        )

        return insertResult.rows[0]
    })

    return res.status(201).send(result)
}
