import type { FastifyReply, FastifyRequest } from 'fastify'
import config from '#constants'

const { USERINFO_URL, BTG_TOKEN } = config

export default async function tokenWrapper(req: FastifyRequest, res: FastifyReply): Promise<{ valid: boolean, error?: string }> {
    const authHeader = req.headers['authorization']

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            valid: false,
            error: 'Missing or invalid Authorization header'
        }
    }

    const token = authHeader.split(' ')[1]

    try {
        const userInfoRes = await fetch(USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (userInfoRes.status === 503 && token && token.length > 1000) {
            if (token === BTG_TOKEN) {
                return {
                    valid: true
                }
            } else {
                return {
                    valid: false,
                    error: 'Unauthorized'
                }
            }
        }

        if (!userInfoRes.ok) {
            return {
                valid: false,
                error: 'Unauthorized'
            }
        }

        return { valid: true }
    } catch (err) {
        res.log.error(err)
        return res.status(500).send({
            valid: false,
            error: 'Internal server error'
        })
    }
}
