import type { FastifyReply, FastifyRequest } from 'fastify'
import config from '#constants'

const { USERINFO_URL } = config

type CheckTokenResponse = {
    valid: boolean
    userInfo?: {
        sub: string
        name: string
        email: string
    }
    error?: string
}

export default async function checkToken( req: FastifyRequest, res: FastifyReply ): Promise<CheckTokenResponse> {
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

        if (!userInfoRes.ok) {
            return {
                valid: false,
                error: 'Unauthorized'
            }
        }

        const userInfo = await userInfoRes.json()

        if (!userInfo.groups || !userInfo.groups.includes('TekKom')) {
            return {
                valid: false,
                error: 'Unauthorized'
            }
        }

        return {
            valid: true,
            userInfo: userInfo
        }
    } catch (err) {
        res.log.error(err)
        return res.status(500).send({
            valid: false,
            error: 'Internal server error'
        })
    }
}
