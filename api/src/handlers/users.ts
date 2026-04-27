import type { FastifyReply, FastifyRequest } from 'fastify'
import run from '#db'
import config from '#constants'
import debug from '#utils/debug.ts'

const { USER_ENDPOINT, AUTHENTIK_TOKEN } = config

type AuthentikUsersResponse = {
    results: Array<object>
}

export async function getUser(req: FastifyRequest, res: FastifyReply) {
    const { email } = req.params as { email: string }
    if (!email) {
        return res.status(400).send({ error: 'Missing ID.' })
    }

    try {
        const response = await fetch(`${USER_ENDPOINT}?email=${email}`, {
            headers: {
                'Authorization': `Bearer ${AUTHENTIK_TOKEN}`,
                'Content-Type': 'application/json'
            }
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }

        const data = await response.json() as AuthentikUsersResponse
        if ('results' in data && data.results.length) {
            return res.send(data.results[0])
        }

        return res.status(400).send({ error: 'User not found' })
    } catch (error) {
        debug({ basic: `Database error in getUser: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}

export async function getUsers(_: FastifyRequest, res: FastifyReply) {
    try {
        const result = await run('SELECT * FROM users ORDER BY name ASC')

        return res.send(result.rows)
    } catch (error) {
        debug({ basic: `Database error in getUsers: ${JSON.stringify(error)}` })
        return res.status(500).send({ error: 'Internal Server Error' })
    }
}
