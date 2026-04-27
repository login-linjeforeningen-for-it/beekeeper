import type { FastifyReply, FastifyRequest } from 'fastify'
import run, { runInTransaction } from '#db'
import debug from '#utils/debug.ts'

type PostSiteProps = {
    name: string
    ip: string
    primary: boolean
    operational: boolean
    addedBy: string
    note: string
    maintenance: boolean
}

type PutSiteProps = {
    name: string
    ip: string
    primary: boolean
    operational: boolean
    maintenance: boolean
    note: string
    updatedBy: string
}

export async function getSites(_: FastifyRequest, res: FastifyReply) {
    try {
        const result = await run('SELECT * FROM sites ORDER BY "primary" DESC, operational DESC, name ASC;')
        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in getSites: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function getPrimarySite(_req: FastifyRequest, res: FastifyReply) {
    const result = await run('SELECT * FROM sites WHERE "primary" = TRUE LIMIT 1;')

    if (result.rowCount === 0) {
        return res.status(404).send({ error: 'No primary site set' })
    }

    return res.send(result.rows[0])
}

export async function setPrimarySite(req: FastifyRequest, res: FastifyReply) {
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

export async function postSite(req: FastifyRequest, res: FastifyReply) {
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

export async function putSite(req: FastifyRequest, res: FastifyReply) {
    const { id } = req.params as { id: string }
    const {
        name,
        ip,
        primary,
        operational,
        updatedBy,
        note,
        maintenance
    } = req.body as PutSiteProps ?? {}

    try {
        const result = await runInTransaction(async (client) => {
            if (primary === true) {
                await client.query('UPDATE sites SET "primary" = FALSE WHERE "primary" = TRUE;')
            }

            const updateResult = await client.query(
                `UPDATE sites
                SET name = COALESCE($1, name),
                    ip = COALESCE($2, ip),
                    "primary" = COALESCE($3, "primary"),
                    operational = COALESCE($4, operational),
                    note = COALESCE($5, note),
                    maintenance = COALESCE($6, maintenance),
                    updated_by = $7,
                    updated_at = NOW()
                WHERE id = $8
                RETURNING *;`,
                [name, ip, primary, operational, note ?? null, maintenance, updatedBy, id]
            )

            if (updateResult.rowCount === 0) {
                throw new Error('SITE_NOT_FOUND')
            }

            return updateResult.rows[0]
        })

        return res.send(result)
    } catch (error) {
        if ((error as Error).message === 'SITE_NOT_FOUND') {
            return res.status(404).send({ error: 'Site not found' })
        }

        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function deleteSite(req: FastifyRequest, res: FastifyReply) {
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
